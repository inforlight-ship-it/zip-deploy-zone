import { Link } from "react-router-dom";
import { BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from "recharts";

interface Props {
  scores: Record<string, number> | null;
  overallScore: number | null;
}

export default function MaturityChart({ scores, overallScore }: Props) {
  const radarData = scores
    ? Object.entries(scores).map(([name, value]) => ({ name: name.length > 15 ? name.slice(0, 15) + "…" : name, value, fullMark: 100 }))
    : [];

  const getScoreColor = (s: number) => s >= 70 ? "text-primary" : s >= 40 ? "text-amber-warning" : "text-destructive";
  const getScoreLabel = (s: number) => s >= 70 ? "Avançado" : s >= 40 ? "Intermediário" : s >= 20 ? "Inicial" : "Crítico";

  return (
    <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm shadow-card">
      <div className="flex items-center justify-between p-6 pb-2">
        <h3 className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
          <BarChart3 className="h-4 w-4 text-primary" /> Maturidade LGPD
        </h3>
        {!scores && (
          <Button size="sm" variant="outline" className="border-border/50" asChild>
            <Link to="/diagnostico">Fazer diagnóstico</Link>
          </Button>
        )}
      </div>
      <div className="p-6 pt-2">
        {scores ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/30 border border-border/30 font-display text-xl font-bold ${getScoreColor(overallScore!)}`}>
                {overallScore}%
              </div>
              <div>
                <p className={`text-sm font-semibold ${getScoreColor(overallScore!)}`}>{getScoreLabel(overallScore!)}</p>
                <p className="text-xs text-muted-foreground">Score geral de conformidade</p>
              </div>
            </div>

            {radarData.length > 2 && (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="72%">
                    <PolarGrid stroke="hsl(222 20% 16%)" />
                    <PolarAngleAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(215 15% 50%)" }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar dataKey="value" stroke="hsl(162 63% 40%)" fill="hsl(162 63% 40%)" fillOpacity={0.15} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="space-y-2">
              {Object.entries(scores).map(([domain, score]) => (
                <div key={domain}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground/80 truncate">{domain}</span>
                    <span className={`font-semibold ${getScoreColor(score)}`}>{score}%</span>
                  </div>
                  <Progress value={score} className="h-1.5" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/20 border border-border/30 mb-3">
              <BarChart3 className="h-7 w-7 text-muted-foreground/30" />
            </div>
            <p className="text-sm text-muted-foreground">Nenhum diagnóstico realizado</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Inicie sua trilha de adequação fazendo o primeiro diagnóstico</p>
          </div>
        )}
      </div>
    </div>
  );
}
