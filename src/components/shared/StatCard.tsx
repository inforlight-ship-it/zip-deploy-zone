import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
  className?: string;
}

const StatCard = ({ label, value, description, icon: Icon, trend, className }: StatCardProps) => {
  return (
    <div className={cn("rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-5 shadow-card transition-all hover:shadow-elevated", className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="mt-1.5 text-2xl font-semibold text-foreground">{value}</p>
          {description && (
            <p className="mt-0.5 text-xs text-muted-foreground/60">{description}</p>
          )}
          {trend && (
            <p className={cn(
              "mt-1 text-xs font-medium",
              trend.positive ? "text-primary" : "text-destructive"
            )}>
              {trend.positive ? "↑" : "↓"} {trend.value}
            </p>
          )}
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/20 border border-border/30">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
};

export default StatCard;
