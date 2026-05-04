import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Globe, Languages } from "lucide-react";

interface PlatformSettings { platform_name: string; default_language: string; default_timezone: string; }

const TIMEZONES = ["America/Sao_Paulo", "America/New_York", "America/Chicago", "Europe/London", "Europe/Berlin", "Asia/Tokyo"];
const LANGUAGES = [{ value: "pt-BR", label: "Português (Brasil)" }, { value: "en-US", label: "English (US)" }, { value: "es-ES", label: "Español" }];

export default function PlatformSettingsTab() {
  const [settings, setSettings] = useState<PlatformSettings>({ platform_name: "", default_language: "pt-BR", default_timezone: "America/Sao_Paulo" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    const { data, error } = await supabase.from("platform_settings").select("settings").eq("category", "platform").single();
    if (data && !error) {
      const s = data.settings as Record<string, unknown>;
      setSettings({ platform_name: (s.platform_name as string) || "", default_language: (s.default_language as string) || "pt-BR", default_timezone: (s.default_timezone as string) || "America/Sao_Paulo" });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("platform_settings").update({ settings: settings as unknown as import("@/integrations/supabase/types").Json }).eq("category", "platform");
    if (error) toast.error("Erro ao salvar configurações"); else toast.success("Configurações da plataforma salvas");
    setSaving(false);
  };

  if (loading) return <div className="text-sm text-muted-foreground">Carregando...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><Globe className="h-4 w-4 text-primary" /> Configurações da Plataforma</CardTitle>
        <CardDescription>Nome, idioma e fuso horário padrão do sistema</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2"><Label htmlFor="platform_name">Nome da Plataforma</Label><Input id="platform_name" value={settings.platform_name} onChange={(e) => setSettings({ ...settings, platform_name: e.target.value })} placeholder="Minha Plataforma" /></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2"><Label className="flex items-center gap-1.5"><Languages className="h-3.5 w-3.5" /> Idioma Padrão</Label><Select value={settings.default_language} onValueChange={(v) => setSettings({ ...settings, default_language: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{LANGUAGES.map((l) => (<SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>))}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Fuso Horário Padrão</Label><Select value={settings.default_timezone} onValueChange={(v) => setSettings({ ...settings, default_timezone: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TIMEZONES.map((tz) => (<SelectItem key={tz} value={tz}>{tz}</SelectItem>))}</SelectContent></Select></div>
        </div>
        <div className="flex justify-end pt-2"><Button onClick={handleSave} disabled={saving} size="sm"><Save className="h-4 w-4 mr-1" />{saving ? "Salvando..." : "Salvar"}</Button></div>
      </CardContent>
    </Card>
  );
}
