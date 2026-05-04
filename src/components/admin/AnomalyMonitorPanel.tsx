import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle, RefreshCw, Scan } from "lucide-react";
import { toast } from "sonner";

interface AnomalyAlert {
  type: string;
  severity: string;
  description: string;
  details: Record<string, unknown>;
}

const severityColors: Record<string, string> = {
  critico: "bg-destructive text-destructive-foreground",
  alto: "bg-orange-500 text-white",
  medio: "bg-yellow-500 text-black",
  baixo: "bg-blue-500 text-white",
};

const typeLabels: Record<string, string> = {
  credential_stuffing: "Credential Stuffing",
  brute_force: "Força Bruta",
  new_device_logins: "Novo Dispositivo",
  multiple_sessions: "Sessões Múltiplas",
};

export default function AnomalyMonitorPanel() {
  const [alerts, setAlerts] = useState<AnomalyAlert[]>([]);
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState<string | null>(null);

  const runScan = useCallback(async () => {
    setScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke("anomaly-detection", {
        body: { action: "scan" },
      });

      if (error) throw error;

      setAlerts(data.alerts || []);
      setLastScan(data.scanned_at);

      if (data.alerts?.length > 0) {
        toast.warning(`${data.alerts.length} anomalia(s) detectada(s)!`);
      } else {
        toast.success("Nenhuma anomalia detectada.");
      }
    } catch (err) {
      toast.error("Erro ao escanear anomalias");
    } finally {
      setScanning(false);
    }
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="h-5 w-5" />
          Monitoramento de Anomalias
        </CardTitle>
        <Button onClick={runScan} disabled={scanning} size="sm" variant="outline">
          {scanning ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Scan className="h-4 w-4 mr-2" />}
          {scanning ? "Escaneando..." : "Escanear Agora"}
        </Button>
      </CardHeader>
      <CardContent>
        {lastScan && (
          <p className="text-xs text-muted-foreground mb-4">
            Último scan: {new Date(lastScan).toLocaleString("pt-BR")}
          </p>
        )}

        {alerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Nenhuma anomalia detectada</p>
            <p className="text-xs mt-1">Clique em "Escanear Agora" para verificar</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={severityColors[alert.severity] || "bg-muted"}>
                      {alert.severity?.toUpperCase()}
                    </Badge>
                    <span className="text-sm font-medium">
                      {typeLabels[alert.type] || alert.type}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{alert.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
