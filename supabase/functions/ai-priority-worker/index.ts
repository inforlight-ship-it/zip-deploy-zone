import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { taskId } = await req.json();

    const { data: task, error: taskError } = await adminClient
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .single();

    if (taskError || !task) throw new Error("Task not found");

    console.log(`Analyzing task with AI: ${task.title}`);

    // Call AI (Simulated for this execution - in real deployment, use fetch to Lovable AI Gateway)
    // Here we calculate a score based on priority and due_date for now, simulating IA insight
    let aiScore = 50; // Base
    if (task.priority === "critica") aiScore += 40;
    if (task.priority === "alta") aiScore += 20;
    
    if (task.due_date) {
      const today = new Date();
      const due = new Date(task.due_date);
      const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 3600 * 24));
      if (diffDays <= 1) aiScore += 30;
      else if (diffDays <= 3) aiScore += 15;
    }

    const aiRecommendation = aiScore > 80 
      ? "Esta tarefa é crítica para a conformidade. Priorize agora para evitar riscos legais."
      : "Tarefa importante, mas pode ser planejada para os próximos dias.";

    await adminClient
      .from("tasks")
      .update({
        ai_priority_score: Math.min(aiScore, 100),
        ai_recommendation: aiRecommendation
      })
      .eq("id", taskId);

    return new Response(JSON.stringify({ success: true, score: aiScore }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error in ai-priority-worker:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
