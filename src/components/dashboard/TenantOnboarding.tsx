import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronRight, Building2, Palette, Users, Rocket, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const steps = [
  { id: "company", title: "Empresa", icon: Building2, description: "Informações básicas da organização" },
  { id: "branding", title: "Branding", icon: Palette, description: "Logo e cores da plataforma" },
  { id: "team", title: "Equipe", icon: Users, description: "Defina os departamentos iniciais" },
  { id: "finish", title: "Pronto!", icon: Rocket, description: "Tudo pronto para começar" },
];

export function TenantOnboarding() {
  const { currentTenant } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    logo: "",
    primaryColor: "#3B82F6",
    departments: "",
  });

  useEffect(() => {
    if (currentTenant) {
      setFormData(prev => ({ ...prev, name: currentTenant.name || "" }));
      // Check if onboarding was already shown (simulated with local storage for now or check branding)
      const setupDone = localStorage.getItem(`onboarding_${currentTenant.id}`);
      if (!setupDone) setShowOnboarding(true);
    }
  }, [currentTenant]);

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      setLoading(true);
      try {
        // Save branding/settings
        if (currentTenant) {
          await supabase.from("tenant_branding").upsert({
            tenant_id: currentTenant.id,
            logo_url: formData.logo,
            primary_color: formData.primaryColor,
          });
          
          localStorage.setItem(`onboarding_${currentTenant.id}`, "true");
          toast.success("Configuração concluída com sucesso!");
          setShowOnboarding(false);
        }
      } catch (error) {
        toast.error("Erro ao salvar configurações.");
      } finally {
        setLoading(false);
      }
    }
  };

  if (!showOnboarding) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-glow">
        <CardHeader>
          <div className="flex justify-between items-center mb-4">
            {steps.map((step, idx) => (
              <div key={step.id} className="flex flex-col items-center gap-2 relative">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                  idx <= currentStep ? "border-primary bg-primary text-primary-foreground" : "border-muted text-muted-foreground"
                }`}>
                  {idx < currentStep ? <Check className="h-5 w-5" /> : <step.icon className="h-5 w-5" />}
                </div>
                <span className={`text-[10px] font-medium hidden sm:block ${idx <= currentStep ? "text-primary" : "text-muted-foreground"}`}>
                  {step.title}
                </span>
                {idx < steps.length - 1 && (
                  <div className={`absolute left-10 top-5 w-10 sm:w-16 h-[2px] -z-10 ${idx < currentStep ? "bg-primary" : "bg-muted"}`} />
                )}
              </div>
            ))}
          </div>
          <CardTitle className="text-2xl">{steps[currentStep].title}</CardTitle>
          <CardDescription>{steps[currentStep].description}</CardDescription>
        </CardHeader>
        <CardContent>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4 py-4"
            >
              {currentStep === 0 && (
                <div className="space-y-2">
                  <Label>Nome da Organização</Label>
                  <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
              )}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>URL da Logo</Label>
                    <div className="flex gap-2">
                      <Input placeholder="https://..." value={formData.logo} onChange={e => setFormData({...formData, logo: e.target.value})} />
                      <Button variant="outline" size="icon"><ImageIcon className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Cor Primária</Label>
                    <div className="flex gap-4 items-center">
                      <Input type="color" className="w-12 h-12 p-1" value={formData.primaryColor} onChange={e => setFormData({...formData, primaryColor: e.target.value})} />
                      <span className="text-sm font-mono">{formData.primaryColor}</span>
                    </div>
                  </div>
                </div>
              )}
              {currentStep === 2 && (
                <div className="space-y-2">
                  <Label>Departamentos (separados por vírgula)</Label>
                  <Textarea placeholder="TI, RH, Jurídico..." value={formData.departments} onChange={e => setFormData({...formData, departments: e.target.value})} />
                </div>
              )}
              {currentStep === 3 && (
                <div className="text-center py-8">
                  <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Rocket className="h-10 w-10 text-primary animate-bounce" />
                  </div>
                  <h3 className="text-xl font-bold">Pronto para decolar!</h3>
                  <p className="text-muted-foreground">Sua plataforma foi configurada com sucesso.</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="flex justify-between mt-8">
            <Button variant="ghost" disabled={currentStep === 0} onClick={() => setCurrentStep(prev => prev - 1)}>
              Voltar
            </Button>
            <Button onClick={handleNext} disabled={loading}>
              {currentStep === steps.length - 1 ? (loading ? "Salvando..." : "Finalizar") : "Continuar"}
              {currentStep < steps.length - 1 && <ChevronRight className="ml-2 h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
