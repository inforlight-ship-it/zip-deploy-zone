import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <button onClick={() => navigate("/auth")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>

        {sent ? (
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">E-mail enviado!</h2>
            <p className="text-sm text-muted-foreground">
              Verifique sua caixa de entrada para o link de redefinição.
            </p>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-semibold mb-2">Esqueceu a senha?</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Informe seu e-mail para receber o link de redefinição.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="h-10" required />
              </div>
              <Button type="submit" disabled={isLoading} className="w-full h-10">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar link"}
              </Button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default ForgotPasswordPage;
