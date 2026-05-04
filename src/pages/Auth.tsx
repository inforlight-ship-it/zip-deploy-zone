import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
// Removed lovable import as we are using native supabase for auth now
import { useAuth } from "@/contexts/AuthContext";
import { Shield, Mail, Lock, User, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { isAuthenticated, isLoading, isSuperadmin, currentTenant, availableTenants, profile, isMfaRequired, isMfaVerified } = useAuth();

  // React to auth state — navigate once authenticated
  useEffect(() => {
    if (isLoading || !isAuthenticated) return;

    // MFA check first — if required and not verified, ProtectedRoute will handle redirect
    if (isMfaRequired && !isMfaVerified) {
      navigate("/mfa-challenge", { replace: true });
      return;
    }

    // Check if must change password first
    if (profile?.must_change_password) {
      navigate("/change-password", { replace: true });
      return;
    }

    // Route based on role
    if (isSuperadmin) {
      navigate("/admin/dashboard", { replace: true });
    } else if (availableTenants.length > 1 && !currentTenant) {
      navigate("/select-tenant", { replace: true });
    } else {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, isLoading, isSuperadmin, currentTenant, availableTenants, profile, isMfaRequired, isMfaVerified, navigate]);

  useEffect(() => {
    const errorMsg = searchParams.get("error");
    if (errorMsg) {
      toast({
        title: "Link expirado ou inválido",
        description: decodeURIComponent(errorMsg),
        variant: "destructive",
      });
    }
  }, [searchParams, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Don't navigate here — the useEffect above will handle it once AuthContext updates
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/auth`,
          },
        });
        if (error) throw error;
        setShowVerification(true);
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        }
      });
      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Erro ao entrar com Google",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  if (showVerification) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 pt-16 relative">
        <div className="absolute inset-0 bg-radial-glow" />
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="relative w-full max-w-md text-center">
          <div className="mb-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
              <Mail className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">Verifique seu e-mail</h1>
          <p className="mt-3 text-muted-foreground">
            Enviamos um link de confirmação para <strong className="text-foreground">{email}</strong>.
            Acesse sua caixa de entrada e clique no link para ativar sua conta.
          </p>
          <Card className="mt-6">
            <CardContent className="p-5 text-sm text-muted-foreground space-y-2">
              <p>• Verifique também a pasta de <strong className="text-foreground">spam</strong></p>
              <p>• O link expira em 24 horas</p>
              <p>• Após confirmar, faça login normalmente</p>
            </CardContent>
          </Card>
          <Button
            variant="outline"
            className="mt-6"
            onClick={() => { setShowVerification(false); setIsLogin(true); }}
          >
            Voltar para o login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 pt-16 relative">
      <div className="absolute inset-0 bg-radial-glow" />
      <div className="absolute inset-0 bg-grid opacity-20" />
      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary shadow-glow-sm">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold text-foreground">
              Adequa<span className="text-gradient-emerald">Fácil</span>
            </span>
          </Link>
          <h1 className="font-display text-2xl font-bold text-foreground">
            {isLogin ? "Entrar na plataforma" : "Criar conta"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isLogin ? "Acesse o painel de conformidade LGPD" : "Comece a governança de privacidade"}
          </p>
        </div>

        <Card className="border-border/50">
          <CardContent className="p-6">
            {/* Google Sign-In */}
            <Button
              type="button"
              variant="outline"
              className="w-full mb-4 border-border/50 bg-muted/20 hover:bg-muted/40"
              size="lg"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
            >
              {googleLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              )}
              {isLogin ? "Entrar com Google" : "Criar conta com Google"}
            </Button>

            <div className="relative mb-4">
              <Separator className="bg-border/30" />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
                ou com e-mail
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-foreground">Nome completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Seu nome"
                      className="pl-9 bg-muted/20 border-border/50"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="pl-9 bg-muted/20 border-border/50"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-foreground">Senha</Label>
                  {isLogin && (
                    <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                      Esqueceu a senha?
                    </Link>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-9 bg-muted/20 border-border/50"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full shadow-glow" size="lg" disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {loading ? "Aguarde..." : isLogin ? "Entrar" : "Criar conta"}
                {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm">
              <span className="text-muted-foreground">
                {isLogin ? "Não tem conta? " : "Já tem conta? "}
              </span>
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="font-medium text-primary hover:underline"
              >
                {isLogin ? "Criar conta" : "Entrar"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
