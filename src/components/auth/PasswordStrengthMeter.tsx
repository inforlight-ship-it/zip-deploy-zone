import { useMemo } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordStrengthMeterProps {
  password: string;
}

const rules = [
  { label: "Mínimo 8 caracteres", test: (p: string) => p.length >= 8 },
  { label: "Letra maiúscula", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Letra minúscula", test: (p: string) => /[a-z]/.test(p) },
  { label: "Número", test: (p: string) => /[0-9]/.test(p) },
  { label: "Caractere especial", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export const getPasswordStrength = (password: string) => {
  const passed = rules.filter(r => r.test(password)).length;
  return { passed, total: rules.length, isStrong: passed >= 4 };
};

const PasswordStrengthMeter = ({ password }: PasswordStrengthMeterProps) => {
  const results = useMemo(() => rules.map(r => ({ ...r, passed: r.test(password) })), [password]);
  const passed = results.filter(r => r.passed).length;

  const strengthColor = passed <= 1 ? "bg-destructive" : passed <= 2 ? "bg-orange-500" : passed <= 3 ? "bg-yellow-500" : "bg-green-500";
  const strengthLabel = passed <= 1 ? "Fraca" : passed <= 2 ? "Regular" : passed <= 3 ? "Boa" : passed >= 4 ? "Forte" : "";

  if (!password) return null;

  return (
    <div className="space-y-2 mt-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-300", strengthColor)}
            style={{ width: `${(passed / rules.length) * 100}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground font-medium">{strengthLabel}</span>
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-0.5">
        {results.map((r, i) => (
          <li key={i} className="flex items-center gap-1.5 text-xs">
            {r.passed ? (
              <Check className="h-3 w-3 text-green-500 shrink-0" />
            ) : (
              <X className="h-3 w-3 text-muted-foreground/50 shrink-0" />
            )}
            <span className={cn(r.passed ? "text-foreground" : "text-muted-foreground")}>{r.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PasswordStrengthMeter;
