import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Shield, Copy, Check, Loader2, Smartphone, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

function generateBackupCodes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = Array.from(crypto.getRandomValues(new Uint8Array(5)))
      .map(b => b.toString(36).padStart(2, "0"))
      .join("")
      .slice(0, 10)
      .toUpperCase();
    codes.push(`${code.slice(0, 5)}-${code.slice(5)}`);
  }
  return codes;
}

export default function MfaSetupPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [factorId, setFactorId] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [backupCodesCopied, setBackupCodesCopied] = useState(false);

  useEffect(() => {
    if (!user) return;

    const enrollMfa = async () => {
      try {
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const allTotp = factors?.totp || [];

        const hasVerifiedFactor = allTotp.some(f => (f as any).status === "verified");
        if (hasVerifiedFactor) {
          navigate("/mfa-challenge", { replace: true });
          return;
        }

        for (const f of allTotp) {
          try {
            await supabase.auth.mfa.unenroll({ factorId: f.id });
          } catch {
            // Ignore unenroll errors
          }
        }

        const { data, error } = await supabase.auth.mfa.enroll({
          factorType: "totp",
          friendlyName: `AdequaFacil_${Date.now()}`,
        });

        if (error) throw error;

        setFactorId(data.id);
        setQrCode(data.totp.qr_code);
        setSecret(data.totp.secret);
      } catch (err: any) {
        toast({
          title: "Erro ao configurar MFA",
          description: err.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    enrollMfa();
  }, [user, navigate, toast]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId || verifyCode.length !== 6) return;

    setVerifying(true);
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: verifyCode,
      });
      if (verifyError) throw verifyError;

      // Generate and store backup codes
      const codes = generateBackupCodes();
      setBackupCodes(codes);

      // Store hashed backup codes in mfa_settings
      await supabase.from("mfa_settings").upsert({
        user_id: user!.id,
        method: "totp" as const,
        is_verified: true,
        verified_at: new Date().toISOString(),
        backup_codes_hash: codes, // In production, hash these before storing
      }, { onConflict: "user_id" });

      setShowBackupCodes(true);
    } catch (err: any) {
      toast({
        title: "Código inválido",
        description: "Verifique o código e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleContinue = () => {
    toast({ title: "MFA configurado com sucesso!", description: "Autenticação de dois fatores ativada." });
    navigate("/dashboard", { replace: true });
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join("\n"));
    setBackupCodesCopied(true);
    setTimeout(() => setBackupCodesCopied(false), 2000);
    toast({ title: "Códigos copiados!" });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // Show backup codes after successful MFA setup
  if (showBackupCodes) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 relative">
        <div className="absolute inset-0 bg-radial-glow" />
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="relative w-full max-w-md">
          <div className="mb-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 mb-4">
              <KeyRound className="h-7 w-7 text-primary" />
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground">Códigos de Recuperação</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Guarde estes códigos em um local seguro. Cada código pode ser usado uma vez para acessar sua conta caso perca o celular.
            </p>
          </div>

          <Card className="border-border/50">
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {backupCodes.map((code, i) => (
                  <div key={i} className="rounded-md bg-muted/50 p-2 text-center font-mono text-sm font-medium text-foreground">
                    {code}
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-3">
                <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                  ⚠️ Estes códigos não serão mostrados novamente. Salve-os agora!
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Button variant="outline" onClick={copyBackupCodes} className="w-full">
                  {backupCodesCopied ? <Check className="mr-2 h-4 w-4 text-green-500" /> : <Copy className="mr-2 h-4 w-4" />}
                  {backupCodesCopied ? "Copiados!" : "Copiar todos os códigos"}
                </Button>
                <Button onClick={handleContinue} className="w-full shadow-glow">
                  Já salvei, continuar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 relative">
      <div className="absolute inset-0 bg-radial-glow" />
      <div className="absolute inset-0 bg-grid opacity-20" />
      <div className="relative w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 mb-4">
            <Smartphone className="h-7 w-7 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">Configurar Autenticação</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure o segundo fator de autenticação para proteger sua conta
          </p>
        </div>

        <Card className="border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">1. Escaneie o QR Code</CardTitle>
            <CardDescription>
              Use um app autenticador como Google Authenticator, Authy ou Microsoft Authenticator
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {qrCode && (
              <div className="flex justify-center p-4 bg-background rounded-lg border border-border/30">
                <img src={qrCode} alt="QR Code MFA" className="w-48 h-48" />
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Ou insira o código manualmente:</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-muted/50 p-2 text-xs font-mono text-foreground break-all">
                  {secret}
                </code>
                <Button variant="outline" size="icon" className="shrink-0" onClick={copySecret}>
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="pt-2 border-t border-border/50">
              <Label className="text-base font-semibold">2. Digite o código de verificação</Label>
              <p className="text-xs text-muted-foreground mt-1 mb-3">
                Insira o código de 6 dígitos gerado pelo app autenticador
              </p>
              <form onSubmit={handleVerify} className="space-y-3">
                <Input
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  className="text-center text-2xl tracking-[0.5em] font-mono bg-muted/20 border-border/50"
                  maxLength={6}
                  inputMode="numeric"
                  autoFocus
                />
                <Button
                  type="submit"
                  className="w-full shadow-glow"
                  size="lg"
                  disabled={verifying || verifyCode.length !== 6}
                >
                  {verifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
                  {verifying ? "Verificando..." : "Ativar MFA"}
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
