import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Shield, CheckCircle2, AlertTriangle, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@supabase/supabase-js";

// Create a separate anon client to ensure no auth session interferes
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const ASSESSMENT_TEMPLATE = [
  { category: "Governança", question: "Possui Política de Privacidade publicada e atualizada?" },
  { category: "Governança", question: "Possui DPO/Encarregado de dados designado?" },
  { category: "Governança", question: "Realiza treinamentos de privacidade com colaboradores?" },
  { category: "Governança", question: "Possui programa de conformidade LGPD implementado?" },
  { category: "Segurança", question: "Utiliza criptografia para dados em repouso e em trânsito?" },
  { category: "Segurança", question: "Possui controles de acesso baseados em função (RBAC)?" },
  { category: "Segurança", question: "Realiza testes de segurança (pentest) periodicamente?" },
  { category: "Segurança", question: "Possui plano de resposta a incidentes documentado?" },
  { category: "Segurança", question: "Mantém logs de auditoria de acessos a dados pessoais?" },
  { category: "Contratual", question: "Possui DPA (Data Processing Agreement) vigente?" },
  { category: "Contratual", question: "Cláusulas de confidencialidade e proteção de dados no contrato?" },
  { category: "Contratual", question: "Permite auditoria pelo controlador nos termos do contrato?" },
  { category: "Contratual", question: "Possui SLA definido para notificação de incidentes?" },
  { category: "Dados", question: "Trata apenas os dados estritamente necessários (minimização)?" },
  { category: "Dados", question: "Possui política de retenção e descarte de dados?" },
  { category: "Dados", question: "Realiza transferência internacional de dados?" },
  { category: "Dados", question: "Possui mecanismos para atender direitos de titulares?" },
  { category: "Subcontratados", question: "Possui controle sobre sub-operadores/subcontratados?" },
  { category: "Subcontratados", question: "Sub-operadores possuem nível de proteção equivalente?" },
];

const categories = [...new Set(ASSESSMENT_TEMPLATE.map(t => t.category))];

interface TokenData {
  id: string;
  supplier_id: string;
  supplier_name: string;
  expires_at: string;
  completed_at: string | null;
}

export default function AvaliacaoExterna() {
  const { token } = useParams<{ token: string }>();
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [supplierName, setSupplierName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [answers, setAnswers] = useState<Record<number, { score: number; answer: string }>>(
    () => Object.fromEntries(ASSESSMENT_TEMPLATE.map((_, i) => [i, { score: 0, answer: "" }]))
  );

  useEffect(() => {
    async function loadToken() {
      if (!token) {
        setError("Token inválido");
        setLoading(false);
        return;
      }

      try {
        // Sign out any existing session to ensure we use anon role
        await anonClient.auth.signOut();

        const { data: tokenRow, error: tokenErr } = await anonClient
          .rpc("get_supplier_assessment_token", { _token: token })
          .maybeSingle();

        if (tokenErr) {
          console.error("Token query error:", tokenErr);
          setError("Erro ao carregar avaliação. Tente novamente.");
          setLoading(false);
          return;
        }

        if (!tokenRow) {
          setError("Link de avaliação inválido ou expirado.");
          setLoading(false);
          return;
        }

        const tokenTyped = tokenRow as unknown as TokenData;
        setTokenData(tokenTyped);
        setSupplierName(tokenTyped.supplier_name || "Fornecedor");

        // Try to get supplier name from suppliers table
        const { data: sup } = await anonClient
          .from("suppliers")
          .select("name, category")
          .eq("id", tokenTyped.supplier_id)
          .single();

        if (sup) setSupplierName(sup.name);
      } catch (err) {
        console.error("Error loading token:", err);
        setError("Erro ao carregar avaliação.");
      } finally {
        setLoading(false);
      }
    }

    loadToken();
  }, [token]);

  const totalScore = useMemo(() => {
    return Object.values(answers).reduce((sum, a) => sum + a.score, 0);
  }, [answers]);

  const maxScore = ASSESSMENT_TEMPLATE.length * 3;
  const pct = Math.round((totalScore / Math.max(maxScore, 1)) * 100);

  const updateScore = (idx: number, score: number) => {
    setAnswers(prev => ({ ...prev, [idx]: { ...prev[idx], score } }));
  };

  const updateAnswer = (idx: number, answer: string) => {
    setAnswers(prev => ({ ...prev, [idx]: { ...prev[idx], answer } }));
  };

  const handleSubmit = async () => {
    if (!tokenData) return;
    setSubmitting(true);

    try {
      // Delete any existing assessments for this supplier
      await anonClient.from("supplier_assessments").delete().eq("supplier_id", tokenData.supplier_id);

      // Insert new assessments - use token id as placeholder user_id
      const rows = ASSESSMENT_TEMPLATE.map((t, i) => ({
        supplier_id: tokenData.supplier_id,
        user_id: tokenData.id,
        question: t.question,
        category: t.category,
        score: answers[i].score,
        answer: answers[i].answer || null,
      }));

      const { error: insertErr } = await anonClient.from("supplier_assessments").insert(rows);
      if (insertErr) {
        console.error("Insert error:", insertErr);
        throw insertErr;
      }

      // Calculate risk and status
      const risk = pct >= 80 ? "baixo" : pct >= 60 ? "medio" : pct >= 40 ? "alto" : "critico";
      const status = pct >= 60 ? "aprovado" : "reprovado";

      const { error: updateErr } = await anonClient.from("suppliers").update({
        overall_score: pct,
        risk_level: risk as any,
        status: status as any,
        last_assessment_at: new Date().toISOString(),
      }).eq("id", tokenData.supplier_id);

      if (updateErr) console.error("Supplier update error:", updateErr);

      // Mark token as completed
      const { error: tokenUpdateErr } = await anonClient
        .from("supplier_assessment_tokens")
        .update({ completed_at: new Date().toISOString() })
        .eq("id", tokenData.id);

      if (tokenUpdateErr) console.error("Token update error:", tokenUpdateErr);

      setSubmitted(true);
    } catch (err: any) {
      console.error("Error submitting assessment:", err);
      alert("Erro ao enviar avaliação. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full shadow-lg">
          <CardContent className="py-16 text-center space-y-4">
            <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
            <h2 className="text-lg font-semibold">{error}</h2>
            <p className="text-sm text-muted-foreground">
              Entre em contato com a empresa que enviou este link para solicitar um novo.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full shadow-lg">
          <CardContent className="py-16 text-center space-y-4">
            <CheckCircle2 className="mx-auto h-16 w-16 text-primary" />
            <h2 className="text-xl font-bold">Avaliação Enviada!</h2>
            <p className="text-sm text-muted-foreground">
              Sua avaliação de conformidade LGPD foi enviada com sucesso.
              O resultado será analisado pela empresa solicitante.
            </p>
            <div className="pt-4">
              <Badge className={pct >= 80 ? "bg-primary/15 text-primary" : pct >= 60 ? "bg-amber-500/15 text-amber-600" : "bg-destructive/15 text-destructive"}>
                Score: {pct}%
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Avaliação de Conformidade LGPD</h1>
              <p className="text-sm text-muted-foreground">
                {supplierName} — Questionário de Due Diligence
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> Respostas protegidas e confidenciais</span>
            <span>{ASSESSMENT_TEMPLATE.length} perguntas</span>
            <span>Expira em {new Date(tokenData!.expires_at).toLocaleDateString("pt-BR")}</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4 py-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progresso da avaliação</span>
            <span className="font-semibold">{pct}% — Score parcial</span>
          </div>
          <Progress value={pct} className="mt-2 h-2" />
        </div>
      </div>

      {/* Questions */}
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        {categories.map(cat => (
          <Card key={cat} className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" /> {cat}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {ASSESSMENT_TEMPLATE.map((t, idx) => {
                if (t.category !== cat) return null;
                const a = answers[idx];
                return (
                  <div key={idx} className={`rounded-lg border p-4 transition-colors ${a.score >= 2 ? "border-primary/20 bg-primary/5" : a.score === 1 ? "border-amber-500/20 bg-amber-500/5" : "border-border"}`}>
                    <p className="text-sm font-medium mb-3">{t.question}</p>
                    <div className="flex items-center gap-2 mb-3">
                      {[0, 1, 2, 3].map(s => (
                        <Button key={s} size="sm" variant={a.score === s ? "default" : "outline"}
                          className="h-8 w-8 p-0 text-xs"
                          onClick={() => updateScore(idx, s)}>
                          {s}
                        </Button>
                      ))}
                      <span className="text-xs text-muted-foreground ml-2">
                        {a.score === 0 ? "Não atende" : a.score === 1 ? "Parcial" : a.score === 2 ? "Atende" : "Excelente"}
                      </span>
                    </div>
                    <Input
                      placeholder="Observações ou evidências..."
                      value={a.answer}
                      onChange={e => updateAnswer(idx, e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}

        {/* Submit */}
        <Card className="shadow-sm border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-semibold">Score Final: {pct}%</p>
                <p className="text-xs text-muted-foreground">{totalScore} de {maxScore} pontos</p>
              </div>
              <Badge className={pct >= 80 ? "bg-primary/15 text-primary" : pct >= 60 ? "bg-amber-500/15 text-amber-600" : pct >= 40 ? "bg-orange-500/15 text-orange-600" : "bg-destructive/15 text-destructive"}>
                {pct >= 80 ? "Baixo Risco" : pct >= 60 ? "Médio Risco" : pct >= 40 ? "Alto Risco" : "Risco Crítico"}
              </Badge>
            </div>
            <Button onClick={handleSubmit} className="w-full" size="lg" disabled={submitting}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {submitting ? "Enviando..." : "Enviar Avaliação"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
