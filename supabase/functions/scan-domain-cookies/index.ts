import { getCorsHeaders, getClientIp, isRateLimited, rateLimitResponse } from "../_shared/security.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const ip = getClientIp(req);
  if (isRateLimited(ip, 5, 120_000)) {
    return rateLimitResponse(corsHeaders);
  }

  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "URL é obrigatória" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: "Firecrawl não configurado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: "AI Gateway não configurado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log("Scanning domain:", formattedUrl);

    const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ["html", "links"],
        onlyMainContent: false,
      }),
    });

    const scrapeData = await scrapeResponse.json();

    if (!scrapeResponse.ok) {
      console.error("Firecrawl error:", scrapeData);
      return new Response(
        JSON.stringify({ success: false, error: scrapeData.error || "Erro ao escanear o site" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const html = scrapeData.data?.html || scrapeData.html || "";
    const links = scrapeData.data?.links || scrapeData.links || [];
    const metadata = scrapeData.data?.metadata || scrapeData.metadata || {};

    const scriptRegex = /<script[^>]*src=["']([^"']+)["'][^>]*>/gi;
    const scripts: string[] = [];
    let match;
    while ((match = scriptRegex.exec(html)) !== null) {
      scripts.push(match[1]);
    }

    const metaRegex = /<meta[^>]*(?:name|property)=["']([^"']+)["'][^>]*content=["']([^"']+)["'][^>]*>/gi;
    const metas: { name: string; content: string }[] = [];
    while ((match = metaRegex.exec(html)) !== null) {
      metas.push({ name: match[1], content: match[2] });
    }

    console.log(`Found ${scripts.length} scripts, ${links.length} links, ${metas.length} meta tags`);

    const analysisPrompt = `Analyze this website's HTML to identify cookies and tracking technologies being used.

Website: ${formattedUrl}
Title: ${metadata.title || "Unknown"}

External Scripts found:
${scripts.slice(0, 30).map((s: string, i: number) => `${i + 1}. ${s}`).join("\n") || "None found"}

Meta tags:
${metas.slice(0, 20).map((m: { name: string; content: string }) => `- ${m.name}: ${m.content}`).join("\n") || "None found"}

External links:
${links.slice(0, 20).join("\n") || "None found"}

HTML snippet (first 3000 chars):
${html.slice(0, 3000)}

Based on this analysis, identify ALL cookies and tracking technologies this website likely uses. For each cookie found, provide:
- name: the cookie name (e.g., _ga, _fbp, etc.)
- provider: the service that sets this cookie (e.g., Google Analytics, Facebook, etc.)
- category: one of "essencial", "desempenho", "funcionalidade", "marketing"
- description: brief description in Portuguese of what the cookie does
- duration: estimated duration (e.g., "2 anos", "Sessão", "1 ano")
- is_required: whether this cookie is essential for the site to function

Also provide a recommended banner configuration with:
- banner_title: suggested title in Portuguese
- banner_description: suggested description in Portuguese mentioning the specific tracking found

Return your analysis using the provided tool.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You are a LGPD/GDPR cookie compliance expert. Analyze websites to identify cookies and tracking technologies. Always respond in Brazilian Portuguese. Be thorough and identify all possible cookies based on the scripts and technologies detected.",
          },
          { role: "user", content: analysisPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_scan_results",
              description: "Report the cookie scan results",
              parameters: {
                type: "object",
                properties: {
                  cookies: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        provider: { type: "string" },
                        category: { type: "string", enum: ["essencial", "desempenho", "funcionalidade", "marketing"] },
                        description: { type: "string" },
                        duration: { type: "string" },
                        is_required: { type: "boolean" },
                      },
                      required: ["name", "provider", "category", "description", "duration", "is_required"],
                      additionalProperties: false,
                    },
                  },
                  banner_title: { type: "string" },
                  banner_description: { type: "string" },
                  summary: { type: "string" },
                },
                required: ["cookies", "banner_title", "banner_description", "summary"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_scan_results" } },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);

      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: "Limite de requisições excedido, tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: "Créditos insuficientes. Adicione créditos ao workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: false, error: "Erro na análise de IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error("No tool call in AI response:", JSON.stringify(aiData));
      return new Response(
        JSON.stringify({ success: false, error: "Falha na análise dos cookies" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const scanResults = JSON.parse(toolCall.function.arguments);
    console.log(`AI identified ${scanResults.cookies?.length || 0} cookies`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          url: formattedUrl,
          title: metadata.title || formattedUrl,
          scripts_found: scripts.length,
          ...scanResults,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Scan error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido ao escanear",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
