import { useState, useEffect } from "react";
import {
  FileText, Download, Eye, Clock, CheckCircle2, AlertCircle,
  Building2, Shield, Users, Database, ClipboardList, Map,
  Sparkles, ChevronRight, Loader2, X, RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

// ─── Types ───
interface ProcessingActivity {
  id: string; name: string; department: string; purpose: string; legal_basis: string;
  data_subjects: string; data_types: string[]; sensitive_data: boolean;
  sensitive_data_types: string[] | null; controller: string; operator: string | null;
  risk_level: string; status: string; retention_period: string | null;
  disposal_method: string | null; storage_location: string | null;
  international_transfer: boolean; transfer_country: string | null;
  transfer_safeguard: string | null; security_measures: string[] | null;
  shared_with: string | null; data_source: string | null; created_at: string;
}

interface Incident {
  id: string; title: string; description: string; category: string;
  severity: string; status: string; detected_at: string; contained_at: string | null;
  resolved_at: string | null; affected_count: number | null;
  affected_data_types: string[] | null; root_cause: string | null;
  corrective_actions: string | null; preventive_actions: string | null;
  reported_to_anpd: boolean | null; anpd_report_date: string | null;
  reported_to_subjects: boolean | null; dpo_notes: string | null;
}

interface Supplier {
  id: string; name: string; category: string; cnpj: string | null;
  risk_level: string; status: string; has_dpa: boolean | null;
  overall_score: number | null; data_shared: string | null;
  services_description: string | null;
}

interface DiagnosticRow {
  id: string; scores: Record<string, number>; overall_score: number; created_at: string;
}

interface AuditRow {
  id: string; name: string; status: string; overall_score: number;
  compliant_controls: number; total_controls: number; created_at: string;
}

interface ConsentSummary { total: number; accepted: number; rejected: number; revoked: number; }

interface ReportType {
  key: string; title: string; subtitle: string; icon: typeof FileText;
  article: string; desc: string; accent: string;
}

const REPORT_TYPES: ReportType[] = [
  {
    key: "ropa", title: "ROPA", subtitle: "Registro de Operações de Tratamento",
    icon: Database, article: "Art. 37 LGPD",
    desc: "Registro obrigatório de todas as atividades de tratamento de dados pessoais.",
    accent: "bg-primary/10 text-primary",
  },
  {
    key: "ripd", title: "RIPD / DPIA", subtitle: "Relatório de Impacto à Proteção de Dados",
    icon: Shield, article: "Art. 38 LGPD",
    desc: "Avaliação de impacto para tratamentos que possam gerar riscos às liberdades civis.",
    accent: "bg-amber-warning/10 text-amber-warning",
  },
  {
    key: "incidentes", title: "Comunicação de Incidentes", subtitle: "Relatório de Incidentes de Segurança",
    icon: AlertCircle, article: "Art. 48 LGPD",
    desc: "Comunicação obrigatória à ANPD sobre incidentes de segurança com dados pessoais.",
    accent: "bg-destructive/10 text-destructive",
  },
  {
    key: "inventario", title: "Inventário de Dados", subtitle: "Mapa de Dados Pessoais",
    icon: Map, article: "Art. 37 / Res. CD/ANPD nº 2",
    desc: "Inventário completo dos dados pessoais tratados pela organização.",
    accent: "bg-sky/10 text-sky",
  },
  {
    key: "conformidade", title: "Relatório de Conformidade", subtitle: "Status Geral de Adequação LGPD",
    icon: ClipboardList, article: "Art. 6° / Art. 50 LGPD",
    desc: "Visão consolidada do nível de conformidade, incluindo diagnóstico, auditorias e fornecedores.",
    accent: "bg-primary/10 text-primary",
  },
  {
    key: "fornecedores", title: "Relatório de Operadores", subtitle: "Due Diligence de Terceiros",
    icon: Building2, article: "Art. 39 LGPD",
    desc: "Avaliação dos operadores/fornecedores que tratam dados pessoais em nome do controlador.",
    accent: "bg-amber-warning/10 text-amber-warning",
  },
];

const legalBasisLabels: Record<string, string> = {
  consentimento: "Consentimento (Art. 7°, I)",
  obrigacao_legal: "Obrigação Legal (Art. 7°, II)",
  execucao_contrato: "Execução de Contrato (Art. 7°, V)",
  exercicio_regular_direitos: "Exercício Regular de Direitos (Art. 7°, VI)",
  protecao_vida: "Proteção da Vida (Art. 7°, VII)",
  tutela_saude: "Tutela da Saúde (Art. 7°, VIII)",
  interesse_legitimo: "Interesse Legítimo (Art. 7°, IX)",
  protecao_credito: "Proteção do Crédito (Art. 7°, X)",
  estudo_pesquisa: "Estudo e Pesquisa (Art. 7°, IV)",
  execucao_politicas_publicas: "Execução de Políticas Públicas (Art. 7°, III)",
};

const riskLabels: Record<string, string> = { baixo: "Baixo", medio: "Médio", alto: "Alto", critico: "Crítico" };
const severityLabels: Record<string, string> = { baixa: "Baixa", media: "Média", alta: "Alta", critica: "Crítica" };

const formatDate = (d: string) => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
const formatDateTime = (d: string) => new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
const now = () => new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

// ─── Report Generators ───
function generateROPA(activities: ProcessingActivity[]): string {
  const rows = activities.map((a, i) => `
    <tr style="${i % 2 === 0 ? '' : 'background:#f9fafb;'}">
      <td style="padding:8px;border:1px solid #e5e7eb;font-weight:600;">${a.name}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;">${a.department}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;">${a.purpose}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;">${legalBasisLabels[a.legal_basis] || a.legal_basis}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;">${a.data_subjects}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;">${a.data_types?.join(", ") || "—"}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;">${a.sensitive_data ? "Sim" : "Não"}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;">${a.controller}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;">${a.operator || "—"}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;">${a.retention_period || "—"}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;">${a.shared_with || "—"}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;">${a.international_transfer ? `Sim (${a.transfer_country || "—"})` : "Não"}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;">${a.security_measures?.join(", ") || "—"}</td>
    </tr>`).join("");

  const byBasis: Record<string, number> = {};
  const byRisk: Record<string, number> = {};
  activities.forEach((a) => {
    byBasis[a.legal_basis] = (byBasis[a.legal_basis] || 0) + 1;
    byRisk[a.risk_level] = (byRisk[a.risk_level] || 0) + 1;
  });

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>ROPA - Registro de Operações de Tratamento</title>
<style>body{font-family:'Segoe UI',sans-serif;margin:40px;color:#1a1a2e;}
.header{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #0d9488;padding-bottom:16px;margin-bottom:24px;}
.header h1{font-size:22px;color:#0d9488;margin:0;} .header .meta{text-align:right;font-size:12px;color:#6b7280;}
.section{margin-bottom:24px;} .section h2{font-size:16px;color:#1a1a2e;border-bottom:2px solid #e5e7eb;padding-bottom:6px;margin-bottom:12px;}
table{width:100%;border-collapse:collapse;font-size:11px;} th{background:#0d9488;color:white;padding:8px;text-align:left;border:1px solid #0d9488;}
.kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px;}
.kpi{background:#f0fdfa;border:1px solid #ccfbf1;border-radius:8px;padding:12px;text-align:center;}
.kpi .val{font-size:24px;font-weight:700;color:#0d9488;} .kpi .lbl{font-size:11px;color:#6b7280;margin-top:4px;}
.stat-row{display:flex;gap:24px;margin-bottom:16px;} .stat-item{flex:1;background:#f9fafb;border-radius:8px;padding:12px;}
.stat-item h4{margin:0 0 8px;font-size:13px;} .stat-item ul{margin:0;padding-left:16px;font-size:12px;color:#374151;}
.footer{margin-top:32px;padding-top:16px;border-top:2px solid #e5e7eb;font-size:11px;color:#6b7280;text-align:center;}
@media print{body{margin:20px;} .no-print{display:none;}}</style></head><body>
<div class="header"><div><h1>📋 ROPA — Registro de Operações de Tratamento</h1><p style="margin:4px 0 0;font-size:13px;color:#6b7280;">Conforme Art. 37 da LGPD (Lei nº 13.709/2018)</p></div>
<div class="meta"><p><strong>Data de geração:</strong> ${now()}</p><p><strong>Controlador:</strong> [Nome da Empresa]</p><p><strong>DPO:</strong> [Nome do DPO]</p></div></div>

<div class="kpi-grid">
<div class="kpi"><div class="val">${activities.length}</div><div class="lbl">Atividades Mapeadas</div></div>
<div class="kpi"><div class="val">${activities.filter(a => a.sensitive_data).length}</div><div class="lbl">Com Dados Sensíveis</div></div>
<div class="kpi"><div class="val">${activities.filter(a => a.international_transfer).length}</div><div class="lbl">Transferência Internacional</div></div>
<div class="kpi"><div class="val">${activities.filter(a => a.risk_level === "alto" || a.risk_level === "critico").length}</div><div class="lbl">Risco Alto/Crítico</div></div>
</div>

<div class="stat-row">
<div class="stat-item"><h4>Distribuição por Base Legal</h4><ul>${Object.entries(byBasis).map(([k, v]) => `<li>${legalBasisLabels[k] || k}: <strong>${v}</strong></li>`).join("")}</ul></div>
<div class="stat-item"><h4>Distribuição por Nível de Risco</h4><ul>${Object.entries(byRisk).map(([k, v]) => `<li>${riskLabels[k] || k}: <strong>${v}</strong></li>`).join("")}</ul></div>
</div>

<div class="section"><h2>Registro Detalhado das Atividades de Tratamento</h2>
<table><thead><tr><th>Atividade</th><th>Departamento</th><th>Finalidade</th><th>Base Legal</th><th>Titulares</th><th>Tipos de Dados</th><th>Sensíveis</th><th>Controlador</th><th>Operador</th><th>Retenção</th><th>Compartilhamento</th><th>Transf. Internacional</th><th>Medidas de Segurança</th></tr></thead>
<tbody>${rows}</tbody></table></div>

<div class="footer"><p>Documento gerado automaticamente pela plataforma AdequaFácil — ${now()}</p>
<p>Este relatório deve ser mantido atualizado conforme Art. 37 da LGPD e disponibilizado à ANPD quando solicitado.</p></div>
</body></html>`;
}

function generateRIPD(activities: ProcessingActivity[], diag: DiagnosticRow | null): string {
  const highRisk = activities.filter(a => a.risk_level === "alto" || a.risk_level === "critico");
  const sensitive = activities.filter(a => a.sensitive_data);

  const riskRows = highRisk.map((a, i) => `
    <tr style="${i % 2 === 0 ? '' : 'background:#f9fafb;'}">
      <td style="padding:8px;border:1px solid #e5e7eb;font-weight:600;">${a.name}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;">${a.department}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;">${a.purpose}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;">${riskLabels[a.risk_level]}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;">${a.data_types?.join(", ") || "—"}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;">${a.sensitive_data ? a.sensitive_data_types?.join(", ") || "Sim" : "Não"}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;">${a.security_measures?.join(", ") || "—"}</td>
    </tr>`).join("");

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>RIPD - Relatório de Impacto</title>
<style>body{font-family:'Segoe UI',sans-serif;margin:40px;color:#1a1a2e;}
.header{border-bottom:3px solid #d97706;padding-bottom:16px;margin-bottom:24px;}
.header h1{font-size:22px;color:#d97706;margin:0;}
.section{margin-bottom:24px;} .section h2{font-size:16px;color:#1a1a2e;border-bottom:2px solid #e5e7eb;padding-bottom:6px;margin-bottom:12px;}
table{width:100%;border-collapse:collapse;font-size:11px;} th{background:#d97706;color:white;padding:8px;text-align:left;border:1px solid #d97706;}
.kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px;}
.kpi{background:#fffbeb;border:1px solid #fef3c7;border-radius:8px;padding:12px;text-align:center;}
.kpi .val{font-size:24px;font-weight:700;color:#d97706;} .kpi .lbl{font-size:11px;color:#6b7280;margin-top:4px;}
.alert{background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px;margin-bottom:16px;font-size:12px;color:#991b1b;}
.info{background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:12px;margin-bottom:16px;font-size:12px;color:#075985;}
.footer{margin-top:32px;padding-top:16px;border-top:2px solid #e5e7eb;font-size:11px;color:#6b7280;text-align:center;}
@media print{body{margin:20px;}}</style></head><body>
<div class="header"><h1>🛡️ RIPD — Relatório de Impacto à Proteção de Dados Pessoais</h1>
<p style="margin:4px 0 0;font-size:13px;color:#6b7280;">Conforme Art. 38 da LGPD (Lei nº 13.709/2018)</p>
<p style="font-size:12px;color:#6b7280;margin-top:4px;"><strong>Data:</strong> ${now()} | <strong>Controlador:</strong> [Nome da Empresa] | <strong>DPO:</strong> [Nome do DPO]</p></div>

<div class="kpi-grid">
<div class="kpi"><div class="val">${activities.length}</div><div class="lbl">Total de Tratamentos</div></div>
<div class="kpi"><div class="val">${highRisk.length}</div><div class="lbl">Alto Risco / Crítico</div></div>
<div class="kpi"><div class="val">${sensitive.length}</div><div class="lbl">Com Dados Sensíveis</div></div>
<div class="kpi"><div class="val">${diag ? diag.overall_score + "%" : "—"}</div><div class="lbl">Score de Maturidade</div></div>
</div>

${highRisk.length > 0 ? `<div class="alert"><strong>⚠️ Atenção:</strong> ${highRisk.length} atividade(s) de tratamento classificada(s) como alto risco ou crítico exigem avaliação detalhada.</div>` : `<div class="info"><strong>✅ Info:</strong> Nenhuma atividade de tratamento classificada como alto risco ou crítico.</div>`}

<div class="section"><h2>1. Escopo da Avaliação de Impacto</h2>
<p style="font-size:13px;">Este RIPD avalia ${activities.length} atividades de tratamento de dados pessoais mapeadas na plataforma, com foco nas ${highRisk.length} atividades de alto risco e ${sensitive.length} que envolvem dados sensíveis (Art. 11 da LGPD).</p></div>

${highRisk.length > 0 ? `<div class="section"><h2>2. Tratamentos de Alto Risco</h2>
<table><thead><tr><th>Atividade</th><th>Departamento</th><th>Finalidade</th><th>Risco</th><th>Dados</th><th>Sensíveis</th><th>Medidas de Segurança</th></tr></thead>
<tbody>${riskRows}</tbody></table></div>` : ""}

<div class="section"><h2>3. Análise de Necessidade e Proporcionalidade</h2>
<p style="font-size:13px;">A análise de necessidade e proporcionalidade deve ser realizada individualmente para cada atividade de tratamento listada, considerando:</p>
<ul style="font-size:12px;"><li>A adequação da base legal selecionada</li><li>A minimização dos dados coletados</li><li>A definição de prazos de retenção compatíveis</li><li>A implementação de medidas de segurança proporcionais ao risco</li></ul></div>

<div class="section"><h2>4. Parecer e Recomendações</h2>
<p style="font-size:13px;">[O DPO deve inserir parecer final sobre os riscos identificados e recomendações de mitigação]</p></div>

<div class="footer"><p>Documento gerado automaticamente pela plataforma AdequaFácil — ${now()}</p>
<p>Este relatório deve ser elaborado quando solicitado pela ANPD ou quando o tratamento puder gerar riscos às liberdades civis e aos direitos fundamentais dos titulares.</p></div>
</body></html>`;
}

function generateIncidentReport(incidents: Incident[]): string {
  const reported = incidents.filter(i => i.reported_to_anpd);
  const critical = incidents.filter(i => i.severity === "alta" || i.severity === "critica");

  const rows = incidents.map((inc, i) => `
    <tr style="${i % 2 === 0 ? '' : 'background:#f9fafb;'}">
      <td style="padding:8px;border:1px solid #e5e7eb;font-weight:600;">${inc.title}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;">${severityLabels[inc.severity]}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;">${inc.category}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;">${formatDateTime(inc.detected_at)}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;">${inc.affected_count || "—"}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;">${inc.affected_data_types?.join(", ") || "—"}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;">${inc.root_cause || "Em investigação"}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;">${inc.corrective_actions || "—"}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;">${inc.reported_to_anpd ? "✅ Sim" : "❌ Não"}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;">${inc.status}</td>
    </tr>`).join("");

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Relatório de Incidentes - ANPD</title>
<style>body{font-family:'Segoe UI',sans-serif;margin:40px;color:#1a1a2e;}
.header{border-bottom:3px solid #dc2626;padding-bottom:16px;margin-bottom:24px;}
.header h1{font-size:22px;color:#dc2626;margin:0;}
.section{margin-bottom:24px;} .section h2{font-size:16px;color:#1a1a2e;border-bottom:2px solid #e5e7eb;padding-bottom:6px;margin-bottom:12px;}
table{width:100%;border-collapse:collapse;font-size:11px;} th{background:#dc2626;color:white;padding:8px;text-align:left;border:1px solid #dc2626;}
.kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px;}
.kpi{background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px;text-align:center;}
.kpi .val{font-size:24px;font-weight:700;color:#dc2626;} .kpi .lbl{font-size:11px;color:#6b7280;margin-top:4px;}
.footer{margin-top:32px;padding-top:16px;border-top:2px solid #e5e7eb;font-size:11px;color:#6b7280;text-align:center;}
@media print{body{margin:20px;}}</style></head><body>
<div class="header"><h1>🚨 Relatório de Incidentes de Segurança</h1>
<p style="margin:4px 0 0;font-size:13px;color:#6b7280;">Conforme Art. 48 da LGPD — Comunicação à ANPD</p>
<p style="font-size:12px;color:#6b7280;margin-top:4px;"><strong>Data:</strong> ${now()} | <strong>Controlador:</strong> [Nome da Empresa]</p></div>

<div class="kpi-grid">
<div class="kpi"><div class="val">${incidents.length}</div><div class="lbl">Total de Incidentes</div></div>
<div class="kpi"><div class="val">${critical.length}</div><div class="lbl">Severidade Alta/Crítica</div></div>
<div class="kpi"><div class="val">${reported.length}</div><div class="lbl">Comunicados à ANPD</div></div>
<div class="kpi"><div class="val">${incidents.filter(i => i.status === "encerrado").length}</div><div class="lbl">Encerrados</div></div>
</div>

<div class="section"><h2>Registro de Incidentes</h2>
${incidents.length > 0 ? `<table><thead><tr><th>Incidente</th><th>Severidade</th><th>Categoria</th><th>Detectado em</th><th>Titulares Afetados</th><th>Dados Afetados</th><th>Causa Raiz</th><th>Ações Corretivas</th><th>ANPD</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>` : `<p style="text-align:center;color:#6b7280;padding:24px;">Nenhum incidente registrado.</p>`}
</div>

<div class="footer"><p>Documento gerado automaticamente pela plataforma AdequaFácil — ${now()}</p></div>
</body></html>`;
}

function generateInventory(activities: ProcessingActivity[]): string {
  const allDataTypes = new Set<string>();
  const departments = new Set<string>();
  activities.forEach(a => { a.data_types?.forEach(t => allDataTypes.add(t)); departments.add(a.department); });

  const deptRows = Array.from(departments).map(dept => {
    const deptActivities = activities.filter(a => a.department === dept);
    const types = new Set<string>();
    deptActivities.forEach(a => a.data_types?.forEach(t => types.add(t)));
    return `<tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:600;">${dept}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;">${deptActivities.length}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;">${Array.from(types).join(", ")}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;">${deptActivities.some(a => a.sensitive_data) ? "Sim" : "Não"}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;">${deptActivities.filter(a => a.risk_level === "alto" || a.risk_level === "critico").length}</td></tr>`;
  }).join("");

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Inventário de Dados Pessoais</title>
<style>body{font-family:'Segoe UI',sans-serif;margin:40px;color:#1a1a2e;}
.header{border-bottom:3px solid #0284c7;padding-bottom:16px;margin-bottom:24px;}
.header h1{font-size:22px;color:#0284c7;margin:0;}
.section{margin-bottom:24px;} .section h2{font-size:16px;border-bottom:2px solid #e5e7eb;padding-bottom:6px;margin-bottom:12px;}
table{width:100%;border-collapse:collapse;font-size:12px;} th{background:#0284c7;color:white;padding:8px;text-align:left;}
.kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px;}
.kpi{background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:12px;text-align:center;}
.kpi .val{font-size:24px;font-weight:700;color:#0284c7;} .kpi .lbl{font-size:11px;color:#6b7280;margin-top:4px;}
.footer{margin-top:32px;padding-top:16px;border-top:2px solid #e5e7eb;font-size:11px;color:#6b7280;text-align:center;}
@media print{body{margin:20px;}}</style></head><body>
<div class="header"><h1>🗂️ Inventário de Dados Pessoais</h1>
<p style="margin:4px 0 0;font-size:13px;color:#6b7280;">Conforme Art. 37 e Resolução CD/ANPD nº 2</p>
<p style="font-size:12px;color:#6b7280;margin-top:4px;"><strong>Data:</strong> ${now()}</p></div>

<div class="kpi-grid">
<div class="kpi"><div class="val">${allDataTypes.size}</div><div class="lbl">Tipos de Dados</div></div>
<div class="kpi"><div class="val">${departments.size}</div><div class="lbl">Departamentos</div></div>
<div class="kpi"><div class="val">${activities.filter(a => a.sensitive_data).length}</div><div class="lbl">Tratam Sensíveis</div></div>
<div class="kpi"><div class="val">${activities.filter(a => a.international_transfer).length}</div><div class="lbl">Transf. Internacional</div></div>
</div>

<div class="section"><h2>Visão por Departamento</h2>
<table><thead><tr><th>Departamento</th><th>Atividades</th><th>Tipos de Dados</th><th>Sensíveis</th><th>Alto Risco</th></tr></thead><tbody>${deptRows}</tbody></table></div>

<div class="section"><h2>Tipos de Dados Pessoais Identificados</h2>
<p style="font-size:12px;">${Array.from(allDataTypes).join(" • ") || "Nenhum dado mapeado."}</p></div>

<div class="footer"><p>Documento gerado automaticamente pela plataforma AdequaFácil — ${now()}</p></div>
</body></html>`;
}

function generateCompliance(activities: ProcessingActivity[], diag: DiagnosticRow | null, audits: AuditRow[], incidents: Incident[], suppliers: Supplier[]): string {
  const scores = diag?.scores as Record<string, number> | undefined;
  const scoreRows = scores ? Object.entries(scores).map(([k, v]) => `<tr><td style="padding:8px;border:1px solid #e5e7eb;">${k}</td><td style="padding:8px;border:1px solid #e5e7eb;font-weight:600;color:${v >= 70 ? '#0d9488' : v >= 40 ? '#d97706' : '#dc2626'}">${v}%</td></tr>`).join("") : "";

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Relatório de Conformidade LGPD</title>
<style>body{font-family:'Segoe UI',sans-serif;margin:40px;color:#1a1a2e;}
.header{border-bottom:3px solid #0d9488;padding-bottom:16px;margin-bottom:24px;}
.header h1{font-size:22px;color:#0d9488;margin:0;}
.section{margin-bottom:24px;} .section h2{font-size:16px;border-bottom:2px solid #e5e7eb;padding-bottom:6px;margin-bottom:12px;}
table{width:100%;border-collapse:collapse;font-size:12px;} th{background:#0d9488;color:white;padding:8px;text-align:left;}
.kpi-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:24px;}
.kpi{background:#f0fdfa;border:1px solid #ccfbf1;border-radius:8px;padding:12px;text-align:center;}
.kpi .val{font-size:24px;font-weight:700;color:#0d9488;} .kpi .lbl{font-size:11px;color:#6b7280;margin-top:4px;}
.footer{margin-top:32px;padding-top:16px;border-top:2px solid #e5e7eb;font-size:11px;color:#6b7280;text-align:center;}
@media print{body{margin:20px;}}</style></head><body>
<div class="header"><h1>📊 Relatório de Conformidade LGPD</h1>
<p style="margin:4px 0 0;font-size:13px;color:#6b7280;">Visão Consolidada — Conforme Art. 6° e Art. 50 da LGPD</p>
<p style="font-size:12px;color:#6b7280;margin-top:4px;"><strong>Data:</strong> ${now()}</p></div>

<div class="kpi-grid">
<div class="kpi"><div class="val">${diag ? diag.overall_score + "%" : "—"}</div><div class="lbl">Score Maturidade</div></div>
<div class="kpi"><div class="val">${activities.length}</div><div class="lbl">Atividades Mapeadas</div></div>
<div class="kpi"><div class="val">${audits.length}</div><div class="lbl">Auditorias</div></div>
<div class="kpi"><div class="val">${incidents.length}</div><div class="lbl">Incidentes</div></div>
<div class="kpi"><div class="val">${suppliers.length}</div><div class="lbl">Fornecedores</div></div>
</div>

${scores ? `<div class="section"><h2>Maturidade por Domínio</h2><table><thead><tr><th>Domínio</th><th>Score</th></tr></thead><tbody>${scoreRows}</tbody></table></div>` : ""}

<div class="section"><h2>Auditorias de Segurança</h2>
${audits.length > 0 ? `<table><thead><tr><th>Auditoria</th><th>Status</th><th>Score</th><th>Controles</th><th>Data</th></tr></thead><tbody>${audits.map(a => `<tr><td style="padding:8px;border:1px solid #e5e7eb;">${a.name}</td><td style="padding:8px;border:1px solid #e5e7eb;">${a.status}</td><td style="padding:8px;border:1px solid #e5e7eb;">${a.overall_score}%</td><td style="padding:8px;border:1px solid #e5e7eb;">${a.compliant_controls}/${a.total_controls}</td><td style="padding:8px;border:1px solid #e5e7eb;">${formatDate(a.created_at)}</td></tr>`).join("")}</tbody></table>` : `<p style="color:#6b7280;">Nenhuma auditoria realizada.</p>`}
</div>

<div class="section"><h2>Fornecedores / Operadores</h2>
${suppliers.length > 0 ? `<table><thead><tr><th>Fornecedor</th><th>Categoria</th><th>Risco</th><th>Score LGPD</th><th>DPA</th><th>Status</th></tr></thead><tbody>${suppliers.map(s => `<tr><td style="padding:8px;border:1px solid #e5e7eb;">${s.name}</td><td style="padding:8px;border:1px solid #e5e7eb;">${s.category}</td><td style="padding:8px;border:1px solid #e5e7eb;">${riskLabels[s.risk_level]}</td><td style="padding:8px;border:1px solid #e5e7eb;">${s.overall_score || 0}%</td><td style="padding:8px;border:1px solid #e5e7eb;">${s.has_dpa ? "✅" : "❌"}</td><td style="padding:8px;border:1px solid #e5e7eb;">${s.status}</td></tr>`).join("")}</tbody></table>` : `<p style="color:#6b7280;">Nenhum fornecedor cadastrado.</p>`}
</div>

<div class="footer"><p>Documento gerado automaticamente pela plataforma AdequaFácil — ${now()}</p></div>
</body></html>`;
}

function generateSupplierReport(suppliers: Supplier[]): string {
  const rows = suppliers.map((s, i) => `
    <tr style="${i % 2 === 0 ? '' : 'background:#f9fafb;'}">
      <td style="padding:8px;border:1px solid #e5e7eb;font-weight:600;">${s.name}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;">${s.cnpj || "—"}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;">${s.category}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;">${s.services_description || "—"}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;">${s.data_shared || "—"}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;">${riskLabels[s.risk_level]}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;">${s.overall_score || 0}%</td>
      <td style="padding:8px;border:1px solid #e5e7eb;">${s.has_dpa ? "✅ Sim" : "❌ Não"}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;">${s.status}</td>
    </tr>`).join("");

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Relatório de Operadores</title>
<style>body{font-family:'Segoe UI',sans-serif;margin:40px;color:#1a1a2e;}
.header{border-bottom:3px solid #d97706;padding-bottom:16px;margin-bottom:24px;}
.header h1{font-size:22px;color:#d97706;margin:0;}
.section{margin-bottom:24px;} .section h2{font-size:16px;border-bottom:2px solid #e5e7eb;padding-bottom:6px;margin-bottom:12px;}
table{width:100%;border-collapse:collapse;font-size:11px;} th{background:#d97706;color:white;padding:8px;text-align:left;}
.kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px;}
.kpi{background:#fffbeb;border:1px solid #fef3c7;border-radius:8px;padding:12px;text-align:center;}
.kpi .val{font-size:24px;font-weight:700;color:#d97706;} .kpi .lbl{font-size:11px;color:#6b7280;margin-top:4px;}
.footer{margin-top:32px;padding-top:16px;border-top:2px solid #e5e7eb;font-size:11px;color:#6b7280;text-align:center;}
@media print{body{margin:20px;}}</style></head><body>
<div class="header"><h1>🏢 Relatório de Operadores / Fornecedores</h1>
<p style="margin:4px 0 0;font-size:13px;color:#6b7280;">Conforme Art. 39 da LGPD — Due Diligence de Terceiros</p>
<p style="font-size:12px;color:#6b7280;margin-top:4px;"><strong>Data:</strong> ${now()}</p></div>

<div class="kpi-grid">
<div class="kpi"><div class="val">${suppliers.length}</div><div class="lbl">Total de Fornecedores</div></div>
<div class="kpi"><div class="val">${suppliers.filter(s => s.has_dpa).length}</div><div class="lbl">Com DPA</div></div>
<div class="kpi"><div class="val">${suppliers.filter(s => s.risk_level === "alto" || s.risk_level === "critico").length}</div><div class="lbl">Risco Alto/Crítico</div></div>
<div class="kpi"><div class="val">${suppliers.filter(s => s.status === "aprovado").length}</div><div class="lbl">Aprovados</div></div>
</div>

<div class="section"><h2>Detalhamento dos Operadores</h2>
<table><thead><tr><th>Fornecedor</th><th>CNPJ</th><th>Categoria</th><th>Serviços</th><th>Dados Compartilhados</th><th>Risco</th><th>Score</th><th>DPA</th><th>Status</th></tr></thead>
<tbody>${rows}</tbody></table></div>

${suppliers.filter(s => !s.has_dpa).length > 0 ? `<div class="section"><h2>⚠️ Fornecedores sem DPA</h2><ul style="font-size:12px;">${suppliers.filter(s => !s.has_dpa).map(s => `<li><strong>${s.name}</strong> — Risco: ${riskLabels[s.risk_level]}</li>`).join("")}</ul></div>` : ""}

<div class="footer"><p>Documento gerado automaticamente pela plataforma AdequaFácil — ${now()}</p></div>
</body></html>`;
}

// ─── Main Component ───
export default function RelatoriosANPD() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");

  const [activities, setActivities] = useState<ProcessingActivity[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [latestDiag, setLatestDiag] = useState<DiagnosticRow | null>(null);
  const [audits, setAudits] = useState<AuditRow[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const [actRes, incRes, supRes, diagRes, audRes] = await Promise.all([
        supabase.from("processing_activities").select("*").order("created_at", { ascending: false }),
        supabase.from("incidents").select("*").order("detected_at", { ascending: false }),
        supabase.from("suppliers").select("*").order("created_at", { ascending: false }),
        supabase.from("diagnostics").select("id, scores, overall_score, created_at").order("created_at", { ascending: false }).limit(1).single(),
        supabase.from("security_audits").select("id, name, status, overall_score, compliant_controls, total_controls, created_at").order("created_at", { ascending: false }),
      ]);
      if (actRes.data) setActivities(actRes.data as any);
      if (incRes.data) setIncidents(incRes.data as any);
      if (supRes.data) setSuppliers(supRes.data as any);
      if (diagRes.data) setLatestDiag(diagRes.data as any);
      if (audRes.data) setAudits(audRes.data as any);
      setLoading(false);
    };
    fetch();
  }, [user]);

  const generate = (key: string) => {
    setGenerating(key);
    setTimeout(() => {
      let html = "";
      let title = "";
      switch (key) {
        case "ropa":
          html = generateROPA(activities);
          title = "ROPA — Registro de Operações de Tratamento";
          break;
        case "ripd":
          html = generateRIPD(activities, latestDiag);
          title = "RIPD — Relatório de Impacto";
          break;
        case "incidentes":
          html = generateIncidentReport(incidents);
          title = "Comunicação de Incidentes";
          break;
        case "inventario":
          html = generateInventory(activities);
          title = "Inventário de Dados Pessoais";
          break;
        case "conformidade":
          html = generateCompliance(activities, latestDiag, audits, incidents, suppliers);
          title = "Relatório de Conformidade LGPD";
          break;
        case "fornecedores":
          html = generateSupplierReport(suppliers);
          title = "Relatório de Operadores";
          break;
      }
      setPreviewHtml(html);
      setPreviewTitle(title);
      setGenerating(null);
      toast({ title: `${title} gerado com sucesso` });
    }, 600);
  };

  const downloadReport = () => {
    if (!previewHtml) return;
    const blob = new Blob([previewHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${previewTitle.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printReport = () => {
    if (!previewHtml) return;
    const w = window.open("", "_blank");
    if (w) { w.document.write(previewHtml); w.document.close(); w.print(); }
  };

  const dataStatus = [
    { label: "Atividades de Tratamento", count: activities.length, icon: Database, ready: activities.length > 0 },
    { label: "Incidentes", count: incidents.length, icon: AlertCircle, ready: true },
    { label: "Fornecedores", count: suppliers.length, icon: Building2, ready: true },
    { label: "Diagnóstico de Maturidade", count: latestDiag ? 1 : 0, icon: ClipboardList, ready: !!latestDiag },
    { label: "Auditorias", count: audits.length, icon: Shield, ready: true },
  ];

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (previewHtml) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold">{previewTitle}</h1>
            <p className="text-xs text-muted-foreground">Gerado em {now()}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={printReport}><Download className="h-4 w-4 mr-2" /> Imprimir / PDF</Button>
            <Button variant="outline" size="sm" onClick={downloadReport}><Download className="h-4 w-4 mr-2" /> Baixar HTML</Button>
            <Button variant="ghost" size="sm" onClick={() => { setPreviewHtml(null); setPreviewTitle(""); }}><X className="h-4 w-4 mr-2" /> Fechar</Button>
          </div>
        </div>
        <Card className="shadow-card overflow-hidden">
          <CardContent className="p-0">
            <iframe srcDoc={previewHtml} className="w-full border-0" style={{ minHeight: "80vh" }} title={previewTitle} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold sm:text-2xl">
            Relatórios <span className="text-gradient-emerald">ANPD</span>
          </h1>
          <p className="text-xs text-muted-foreground">Gere relatórios exigidos pela ANPD com base nos dados da plataforma</p>
        </div>
      </motion.div>

      {/* Data status */}
      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Dados Disponíveis para Geração
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-5">
            {dataStatus.map((d) => (
              <div key={d.label} className={`flex items-center gap-2 rounded-lg border p-3 ${d.ready ? "border-primary/20 bg-primary/5" : "border-border"}`}>
                <d.icon className={`h-4 w-4 ${d.ready ? "text-primary" : "text-muted-foreground"}`} />
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{d.label}</p>
                  <p className={`text-sm font-bold ${d.ready ? "text-primary" : "text-muted-foreground"}`}>{d.count} {d.count === 1 ? "registro" : "registros"}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Report cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORT_TYPES.map((rt, i) => {
          const Icon = rt.icon;
          const isGenerating = generating === rt.key;
          let dataCount = 0;
          let hasData = true;
          switch (rt.key) {
            case "ropa": case "inventario": dataCount = activities.length; hasData = activities.length > 0; break;
            case "ripd": dataCount = activities.length; hasData = activities.length > 0; break;
            case "incidentes": dataCount = incidents.length; break;
            case "conformidade": dataCount = activities.length + audits.length + suppliers.length; break;
            case "fornecedores": dataCount = suppliers.length; break;
          }

          return (
            <motion.div key={rt.key} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <Card className="shadow-card hover:shadow-elevated transition-all h-full flex flex-col">
                <CardContent className="p-5 flex-1 flex flex-col">
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${rt.accent}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-display text-sm font-bold">{rt.title}</p>
                      <p className="text-[11px] text-muted-foreground">{rt.subtitle}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3 flex-1">{rt.desc}</p>
                  <Badge variant="outline" className="mb-3 w-fit text-[10px]">{rt.article}</Badge>
                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-border">
                    <span className="text-[11px] text-muted-foreground">
                      {hasData ? `${dataCount} registro(s) disponível(is)` : "Sem dados cadastrados"}
                    </span>
                    <Button
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => generate(rt.key)}
                      disabled={isGenerating}
                    >
                      {isGenerating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                      {isGenerating ? "Gerando..." : "Gerar"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Info */}
      <Card className="shadow-card bg-muted/30">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold">Sobre os Relatórios ANPD</p>
            <p className="text-xs text-muted-foreground mt-1">
              Os relatórios são gerados automaticamente com base nos dados cadastrados na plataforma. Recomenda-se revisar cada documento antes de enviá-lo à ANPD, 
              preenchendo campos como nome da empresa, CNPJ e dados do DPO. Os relatórios podem ser baixados em HTML ou impressos diretamente como PDF.
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="outline" className="text-[10px]">Art. 37 — ROPA obrigatório</Badge>
              <Badge variant="outline" className="text-[10px]">Art. 38 — RIPD quando solicitado pela ANPD</Badge>
              <Badge variant="outline" className="text-[10px]">Art. 48 — Comunicação de incidentes em prazo razoável</Badge>
              <Badge variant="outline" className="text-[10px]">Res. CD/ANPD nº 2 — Agentes de pequeno porte</Badge>
              <Badge variant="outline" className="text-[10px]">Res. CD/ANPD nº 15 — Comunicação de incidentes</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
