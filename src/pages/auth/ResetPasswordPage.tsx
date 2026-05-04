import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import PasswordStrengthMeter, { getPasswordStrength } from "@/components/auth/PasswordStrengthMeter";
import { motion } from "framer-motion";

const ResetPasswordPage = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery") || hash.includes("type=invite") || hash.includes("access_token")) {
      setIsRecovery(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    const strength = getPasswordStrength(password);
    if (!strength.isStrong) {
      setError("A senha não atende aos requisitos mínimos.");
      return;
    }

    setIsLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setSuccess(true);
      setTimeout(() => navigate("/auth"), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isRecovery && !window.location.hash.includes("access_token") && !window.location.hash.includes("type=invite")) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="text-center">
          <p className="text-muted-foreground">Link inválido ou expirado.</p>
          <Button variant="link" onClick={() => navigate("/auth")} className="mt-4">Voltar ao login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        {success ? (
          <div className="text-center">
            <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Senha redefinida!</h2>
            <p className="text-sm text-muted-foreground">Redirecionando para o login...</p>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-semibold mb-6">Redefinir Senha</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" /> {error}
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Nova Senha</Label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} className="h-10" />
                <PasswordStrengthMeter password={password} />
              </div>
              <div className="space-y-1.5">
                <Label>Confirmar</Label>
                <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="h-10" />
              </div>
              <Button type="submit" disabled={isLoading} className="w-full h-10">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Redefinir Senha"}
              </Button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default ResetPasswordPage;
