import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, ShieldCheck } from "lucide-react";
import ActiveSessionsPanel from "@/components/admin/ActiveSessionsPanel";

interface SecuritySettings { min_password_length: number; require_uppercase: boolean; require_numbers: boolean; require_special_chars: boolean; max_login_attempts: number; lockout_duration_minutes: number; session_timeout_minutes: number; enforce_mfa_global: boolean; password_expiry_days: number; password_history_count: number; audit_retention_days: number; login_retention_days: number; session_retention_days: number; }

export default function SecuritySettingsTab() {
  const [settings, setSettings] = useState<SecuritySettings>({ min_password_length: 8, require_uppercase: true, require_numbers: true, require_special_chars: true, max_login_attempts: 5, lockout_duration_minutes: 15, session_timeout_minutes: 60, enforce_mfa_global: true, password_expiry_days: 90, password_history_count: 5, audit_retention_days: 90, login_retention_days: 30, session_retention_days: 30 });
  const [purging, setPurging] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    const { data, error } = await supabase.from("platform_settings").select("settings").eq("category", "security").single();
    if (data && !error) {
      const s = data.settings as Record<string, unknown>;
      setSettings({ min_password_length: (s.min_password_length as number) || 8, require_uppercase: s.require_uppercase !== false, require_numbers: s.require_numbers !== false, require_special_chars: s.require_special_chars !== false, max_login_attempts: (s.max_login_attempts as number) || 5, lockout_duration_minutes: (s.lockout_duration_minutes as number) || 15, session_timeout_minutes: (s.session_timeout_minutes as number) || 60, enforce_mfa_global: s.enforce_mfa_global !== false, password_expiry_days: (s.password_expiry_days as number) || 90, password_history_count: (s.password_history_count as number) || 5, audit_retention_days: (s.audit_retention_days as number) || 90, login_retention_days: (s.login_retention_days as number) || 30, session_retention_days: (s.session_retention_days as number) || 30 });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("platform_settings").update({ settings: settings as unknown as import("@/integrations/supabase/types").Json }).eq("category", "security");
    if (error) toast.error("Erro ao salvar"); else toast.success("Políticas de segurança salvas");
    setSaving(false);
  };

  if (loading) return <div className="text-sm text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Política de Senhas</CardTitle><CardDescription>Regras de complexidade para senhas</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="space-y-2"><Label>Comprimento Mínimo</Label><Input type="number" min={6} max={32} value={settings.min_password_length} onChange={(e) => setSettings({ ...settings, min_password_length: parseInt(e.target.value) || 8 })} /></div></div>
          <div className="space-y-3">
            <div className="flex items-center justify-between"><Label>Exigir letra maiúscula</Label><Switch checked={settings.require_uppercase} onCheckedChange={(v) => setSettings({ ...settings, require_uppercase: v })} /></div>
            <div className="flex items-center justify-between"><Label>Exigir números</Label><Switch checked={settings.require_numbers} onCheckedChange={(v) => setSettings({ ...settings, require_numbers: v })} /></div>
            <div className="flex items-center justify-between"><Label>Exigir caracteres especiais</Label><Switch checked={settings.require_special_chars} onCheckedChange={(v) => setSettings({ ...settings, require_special_chars: v })} /></div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Sessão & Tentativas de Login</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Tentativas máx.</Label><Input type="number" min={3} max={20} value={settings.max_login_attempts} onChange={(e) => setSettings({ ...settings, max_login_attempts: parseInt(e.target.value) || 5 })} /></div>
            <div className="space-y-2"><Label>Bloqueio (min)</Label><Input type="number" min={1} max={1440} value={settings.lockout_duration_minutes} onChange={(e) => setSettings({ ...settings, lockout_duration_minutes: parseInt(e.target.value) || 15 })} /></div>
            <div className="space-y-2"><Label>Timeout sessão (min)</Label><Input type="number" min={5} max={1440} value={settings.session_timeout_minutes} onChange={(e) => setSettings({ ...settings, session_timeout_minutes: parseInt(e.target.value) || 60 })} /></div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Expiração & Histórico de Senhas</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Expiração (dias)</Label><Input type="number" min={0} max={365} value={settings.password_expiry_days} onChange={(e) => setSettings({ ...settings, password_expiry_days: parseInt(e.target.value) || 0 })} /><p className="text-xs text-muted-foreground">0 = sem expiração</p></div>
            <div className="space-y-2"><Label>Histórico de senhas</Label><Input type="number" min={1} max={24} value={settings.password_history_count} onChange={(e) => setSettings({ ...settings, password_history_count: parseInt(e.target.value) || 5 })} /></div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">MFA</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium text-foreground">Exigir MFA para todos</p><p className="text-xs text-muted-foreground mt-0.5">Todos serão obrigados a configurar MFA</p></div>
            <Switch checked={settings.enforce_mfa_global} onCheckedChange={(v) => setSettings({ ...settings, enforce_mfa_global: v })} />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Retenção de Dados</CardTitle><CardDescription>Purgar automaticamente registros antigos para compliance</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Logs de auditoria (dias)</Label><Input type="number" min={7} max={365} value={settings.audit_retention_days} onChange={(e) => setSettings({ ...settings, audit_retention_days: parseInt(e.target.value) || 90 })} /></div>
            <div className="space-y-2"><Label>Tentativas de login (dias)</Label><Input type="number" min={7} max={365} value={settings.login_retention_days} onChange={(e) => setSettings({ ...settings, login_retention_days: parseInt(e.target.value) || 30 })} /></div>
            <div className="space-y-2"><Label>Sessões revogadas (dias)</Label><Input type="number" min={7} max={365} value={settings.session_retention_days} onChange={(e) => setSettings({ ...settings, session_retention_days: parseInt(e.target.value) || 30 })} /></div>
          </div>
          <Button variant="outline" size="sm" disabled={purging} onClick={async () => {
            setPurging(true);
            const { data, error } = await supabase.functions.invoke("data-retention-purge");
            if (error) toast.error("Erro ao purgar dados");
            else {
              const p = data?.purged;
              toast.success(`Purga concluída: ${p?.audit_logs || 0} logs, ${p?.login_attempts || 0} tentativas, ${p?.revoked_sessions || 0} sessões removidos`);
            }
            setPurging(false);
          }}>{purging ? "Purgando..." : "Executar Purga Agora"}</Button>
        </CardContent>
      </Card>
      <div className="flex justify-end"><Button onClick={handleSave} disabled={saving} size="sm"><Save className="h-4 w-4 mr-1" />{saving ? "Salvando..." : "Salvar Políticas"}</Button></div>
      <ActiveSessionsPanel />
    </div>
  );
}
