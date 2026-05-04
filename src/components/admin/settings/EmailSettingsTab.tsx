import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Mail } from "lucide-react";

interface EmailSettings { sender_name: string; sender_email: string; notify_new_user: boolean; notify_password_reset: boolean; notify_login_alert: boolean; }

export default function EmailSettingsTab() {
  const [settings, setSettings] = useState<EmailSettings>({ sender_name: "", sender_email: "", notify_new_user: true, notify_password_reset: true, notify_login_alert: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    const { data, error } = await supabase.from("platform_settings").select("settings").eq("category", "email").single();
    if (data && !error) {
      const s = data.settings as Record<string, unknown>;
      setSettings({ sender_name: (s.sender_name as string) || "", sender_email: (s.sender_email as string) || "", notify_new_user: s.notify_new_user !== false, notify_password_reset: s.notify_password_reset !== false, notify_login_alert: s.notify_login_alert === true });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("platform_settings").update({ settings: settings as unknown as import("@/integrations/supabase/types").Json }).eq("category", "email");
    if (error) toast.error("Erro ao salvar"); else toast.success("Configurações de e-mail salvas");
    setSaving(false);
  };

  if (loading) return <div className="text-sm text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> Remetente Padrão</CardTitle><CardDescription>Configurações do remetente para e-mails do sistema</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Nome do Remetente</Label><Input value={settings.sender_name} onChange={(e) => setSettings({ ...settings, sender_name: e.target.value })} placeholder="Admin Platform" /></div>
            <div className="space-y-2"><Label>E-mail do Remetente</Label><Input type="email" value={settings.sender_email} onChange={(e) => setSettings({ ...settings, sender_email: e.target.value })} placeholder="noreply@seudominio.com" /></div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Notificações por E-mail</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between"><div><p className="text-sm font-medium text-foreground">Novo usuário criado</p><p className="text-xs text-muted-foreground">Enviar e-mail de boas-vindas</p></div><Switch checked={settings.notify_new_user} onCheckedChange={(v) => setSettings({ ...settings, notify_new_user: v })} /></div>
          <div className="flex items-center justify-between"><div><p className="text-sm font-medium text-foreground">Reset de senha</p><p className="text-xs text-muted-foreground">Notificar quando senha for redefinida</p></div><Switch checked={settings.notify_password_reset} onCheckedChange={(v) => setSettings({ ...settings, notify_password_reset: v })} /></div>
          <div className="flex items-center justify-between"><div><p className="text-sm font-medium text-foreground">Alerta de login</p><p className="text-xs text-muted-foreground">Alerta ao detectar login de novo dispositivo</p></div><Switch checked={settings.notify_login_alert} onCheckedChange={(v) => setSettings({ ...settings, notify_login_alert: v })} /></div>
        </CardContent>
      </Card>
      <div className="flex justify-end"><Button onClick={handleSave} disabled={saving} size="sm"><Save className="h-4 w-4 mr-1" />{saving ? "Salvando..." : "Salvar Configurações"}</Button></div>
    </div>
  );
}
