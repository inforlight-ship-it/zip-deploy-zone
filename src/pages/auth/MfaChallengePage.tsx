import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Shield, Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function MfaChallengePage() {
  const { user, logout, verifyMfa, isSuperadmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [factorId, setFactorId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const loadFactor = async () => {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const allTotp = factors?.totp || [];
      // Find any factor (verified or not) — use type cast to avoid TS issues
      const verifiedTotp = allTotp.find(f => (f as any).status === "verified");
      if (!verifiedTotp) {
        // No verified factor — redirect to setup
        navigate("/mfa-setup", { replace: true });
        return;
      }
      setFactorId(verifiedTotp.id);
      setLoading(false);
    };

    loadFactor();
  }, [user, navigate]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId || code.length !== 6) return;

    setVerifying(true);
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      });
      if (verifyError) throw verifyError;

      // Update AuthContext state BEFORE navigating so ProtectedRoute sees isMfaVerified=true
      await verifyMfa(code);
      navigate(isSuperadmin ? "/admin/dashboard" : "/dashboard", { replace: true });
    } catch (err: any) {
      toast({
        title: "Código inválido",
        description: "Verifique o código e tente novamente.",
        variant: "destructive",
      });
      setCode("");
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 relative">
      <div className="absolute inset-0 bg-radial-glow" />
      <div className="absolute inset-0 bg-grid opacity-20" />
      <div className="relative w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 mb-4">
            <Shield className="h-7 w-7 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">Verificação MFA</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Digite o código do seu app autenticador
          </p>
        </div>

        <Card className="border-border/50">
          <CardContent className="p-6">
            <form onSubmit={handleVerify} className="space-y-4">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="text-center text-3xl tracking-[0.5em] font-mono bg-muted/20 border-border/50 h-14"
                maxLength={6}
                inputMode="numeric"
                autoFocus
              />
              <Button
                type="submit"
                className="w-full shadow-glow"
                size="lg"
                disabled={verifying || code.length !== 6}
              >
                {verifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {verifying ? "Verificando..." : "Verificar"}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <button
                onClick={logout}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <LogOut className="h-3 w-3" />
                Sair e usar outra conta
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
