import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import PasswordStrengthMeter, { getPasswordStrength } from "@/components/auth/PasswordStrengthMeter";
import { motion } from "framer-motion";

const ChangePasswordPage = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { profile, user } = useAuth();

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
      // Check password history
      const { data: historyCheck } = await supabase.functions.invoke("check-password-history", {
        body: { action: "check", password },
      });

      if (historyCheck?.reused) {
        setError(`Esta senha já foi utilizada anteriormente. Escolha uma nova.`);
        setIsLoading(false);
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      // Record in history
      await supabase.functions.invoke("check-password-history", {
        body: { action: "record", password },
      });

      // Clear must_change_password
      if (user) {
        await supabase
          .from("profiles")
          .update({ must_change_password: false })
          .eq("user_id", user.id);
      }

      navigate("/select-tenant");
    } catch (err: any) {
      setError(err.message || "Erro ao alterar senha.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <h2 className="text-xl font-semibold text-foreground mb-2">Alterar Senha</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Sua senha precisa ser alterada antes de continuar.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Nova Senha</Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <PasswordStrengthMeter password={password} />
          </div>

          <div className="space-y-1.5">
            <Label>Confirmar Senha</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-10"
            />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full h-10">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Alterar Senha"}
          </Button>
        </form>
      </motion.div>
    </div>
  );
};

export default ChangePasswordPage;
