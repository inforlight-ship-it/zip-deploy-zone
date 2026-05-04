import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Monitor, Smartphone, Globe, XCircle, RefreshCw, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ActiveSessionsPanel() {
  const queryClient = useQueryClient();
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokeAllUser, setRevokeAllUser] = useState<string | null>(null);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["admin-active-sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("active_sessions")
        .select("*")
        .eq("is_revoked", false)
        .order("last_active_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });

  const revokeSession = async (sessionId: string) => {
    try {
      await supabase
        .from("active_sessions")
        .update({ is_revoked: true, revoked_at: new Date().toISOString() })
        .eq("id", sessionId);
      
      toast({ title: "Sessão revogada com sucesso" });
      queryClient.invalidateQueries({ queryKey: ["admin-active-sessions"] });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
    setRevoking(null);
  };

  const revokeAllSessions = async (userId: string) => {
    try {
      await supabase
        .from("active_sessions")
        .update({ is_revoked: true, revoked_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("is_revoked", false);
      
      toast({ title: "Todas as sessões do usuário foram revogadas" });
      queryClient.invalidateQueries({ queryKey: ["admin-active-sessions"] });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
    setRevokeAllUser(null);
  };

  // Group sessions by user
  const sessionsByUser = sessions.reduce<Record<string, typeof sessions>>((acc, session) => {
    if (!acc[session.user_id]) acc[session.user_id] = [];
    acc[session.user_id].push(session);
    return acc;
  }, {});

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Sessões Ativas
              </CardTitle>
              <CardDescription>Monitore e revogue sessões de usuários</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-active-sessions"] })}
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando sessões...</p>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma sessão ativa encontrada.</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(sessionsByUser).map(([userId, userSessions]) => (
                <div key={userId} className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-mono text-muted-foreground">{userId.slice(0, 8)}...</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {userSessions.length} sessão(ões)
                      </Badge>
                      {userSessions.length > 1 && (
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-6 text-[10px]"
                          onClick={() => setRevokeAllUser(userId)}
                        >
                          Revogar todas
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {userSessions.map((session) => (
                    <div key={session.id} className="flex items-center justify-between rounded-md bg-secondary/30 px-3 py-2">
                      <div className="flex items-center gap-2">
                        {session.device_info === "Mobile" ? (
                          <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <Monitor className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                        <div>
                          <p className="text-xs font-medium text-foreground">{session.device_info || "Desconhecido"}</p>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Globe className="h-2.5 w-2.5" />
                            {String(session.ip_address || "—")}
                            {" • "}
                            Ativo {formatDistanceToNow(new Date(session.last_active_at), { locale: ptBR, addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={() => setRevoking(session.id)}
                        title="Revogar sessão"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revoke single session */}
      <AlertDialog open={!!revoking} onOpenChange={(v) => { if (!v) setRevoking(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revogar sessão</AlertDialogTitle>
            <AlertDialogDescription>
              O usuário será desconectado desta sessão imediatamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => revoking && revokeSession(revoking)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Revogar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke all user sessions */}
      <AlertDialog open={!!revokeAllUser} onOpenChange={(v) => { if (!v) setRevokeAllUser(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revogar todas as sessões</AlertDialogTitle>
            <AlertDialogDescription>
              Todas as sessões ativas deste usuário serão encerradas imediatamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => revokeAllUser && revokeAllSessions(revokeAllUser)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Revogar todas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
