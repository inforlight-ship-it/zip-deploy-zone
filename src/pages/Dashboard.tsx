import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardKPIs from "@/components/dashboard/DashboardKPIs";
import ComplianceRoadmap from "@/components/dashboard/ComplianceRoadmap";
import MaturityChart from "@/components/dashboard/MaturityChart";
import RecentDSRs from "@/components/dashboard/RecentDSRs";
import QuickActions from "@/components/dashboard/QuickActions";
import { TenantOnboarding } from "@/components/dashboard/TenantOnboarding";

interface DiagnosticRow {
  id: string;
  scores: Record<string, number>;
  overall_score: number;
  created_at: string;
}

interface DSRRow {
  id: string;
  protocol: string;
  name: string;
  right_type: string;
  status: string;
  created_at: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [latestDiag, setLatestDiag] = useState<DiagnosticRow | null>(null);
  const [diagCount, setDiagCount] = useState(0);
  const [dsrs, setDsrs] = useState<DSRRow[]>([]);
  const [roadmapStatus, setRoadmapStatus] = useState({
    hasDiagnostic: false,
    hasMapping: false,
    hasDocuments: false,
    hasConsent: false,
    hasAudit: false,
    hasIncidentPlan: false,
    hasSuppliers: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const [diagRes, countRes, dsrRes, mappingRes, docsRes, consentRes, auditRes, incidentRes, supplierRes] =
        await Promise.all([
          supabase.from("diagnostics").select("id, scores, overall_score, created_at").order("created_at", { ascending: false }).limit(1).single(),
          supabase.from("diagnostics").select("id", { count: "exact", head: true }),
          supabase.from("data_subject_requests").select("id, protocol, name, right_type, status, created_at").order("created_at", { ascending: false }).limit(10),
          supabase.from("processing_activities").select("id", { count: "exact", head: true }),
          supabase.from("documents").select("id", { count: "exact", head: true }),
          supabase.from("cookie_policies").select("id", { count: "exact", head: true }),
          supabase.from("security_audits").select("id", { count: "exact", head: true }),
          supabase.from("incidents").select("id", { count: "exact", head: true }),
          supabase.from("suppliers").select("id", { count: "exact", head: true }),
        ]);

      if (diagRes.data) setLatestDiag(diagRes.data as DiagnosticRow);
      setDiagCount(countRes.count ?? 0);
      if (dsrRes.data) setDsrs(dsrRes.data as DSRRow[]);

      setRoadmapStatus({
        hasDiagnostic: (countRes.count ?? 0) > 0,
        hasMapping: (mappingRes.count ?? 0) > 0,
        hasDocuments: (docsRes.count ?? 0) > 0,
        hasConsent: (consentRes.count ?? 0) > 0,
        hasAudit: (auditRes.count ?? 0) > 0,
        hasIncidentPlan: (incidentRes.count ?? 0) > 0,
        hasSuppliers: (supplierRes.count ?? 0) > 0,
      });

      setLoading(false);
    };

    fetchData();
  }, [user]);

  const pendingDsrs = dsrs.filter((d) => d.status === "pendente" || d.status === "em_andamento").length;
  const scores = latestDiag?.scores as Record<string, number> | undefined;

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <TenantOnboarding />
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold sm:text-2xl text-foreground">
            Painel de <span className="text-gradient-emerald">Adequação</span>
          </h1>
          <p className="text-xs text-muted-foreground">Visão consolidada da conformidade LGPD</p>
        </div>
      </motion.div>

      {/* KPIs */}
      <DashboardKPIs
        diagScore={latestDiag?.overall_score ?? null}
        diagCount={diagCount}
        dsrTotal={dsrs.length}
        dsrPending={pendingDsrs}
        lastDiagDate={latestDiag ? new Date(latestDiag.created_at).toLocaleDateString("pt-BR") : null}
      />

      {/* Main grid */}
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <ComplianceRoadmap status={roadmapStatus} />
        </div>
        <div className="lg:col-span-2 space-y-6">
          <MaturityChart scores={scores ?? null} overallScore={latestDiag?.overall_score ?? null} />
          <RecentDSRs dsrs={dsrs} />
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="mb-3 font-display text-sm font-semibold text-muted-foreground uppercase tracking-wider">Acesso Rápido</h2>
        <QuickActions />
      </div>
    </div>
  );
}
