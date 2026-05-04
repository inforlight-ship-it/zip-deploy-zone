import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe, ShieldCheck, CreditCard, Mail } from "lucide-react";
import PlatformSettingsTab from "@/components/admin/settings/PlatformSettingsTab";
import SecuritySettingsTab from "@/components/admin/settings/SecuritySettingsTab";
import PlansSettingsTab from "@/components/admin/settings/PlansSettingsTab";
import EmailSettingsTab from "@/components/admin/settings/EmailSettingsTab";

const AdminSettingsPage = () => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6">
    <div className="mb-6">
      <h1 className="text-xl font-semibold text-foreground">Configurações</h1>
      <p className="text-sm text-muted-foreground mt-0.5">Configurações globais da plataforma</p>
    </div>
    <Tabs defaultValue="platform" className="space-y-4">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="platform" className="flex items-center gap-1.5 text-xs"><Globe className="h-3.5 w-3.5" /> Plataforma</TabsTrigger>
        <TabsTrigger value="security" className="flex items-center gap-1.5 text-xs"><ShieldCheck className="h-3.5 w-3.5" /> Segurança</TabsTrigger>
        <TabsTrigger value="plans" className="flex items-center gap-1.5 text-xs"><CreditCard className="h-3.5 w-3.5" /> Planos</TabsTrigger>
        <TabsTrigger value="email" className="flex items-center gap-1.5 text-xs"><Mail className="h-3.5 w-3.5" /> E-mail</TabsTrigger>
      </TabsList>
      <TabsContent value="platform"><PlatformSettingsTab /></TabsContent>
      <TabsContent value="security"><SecuritySettingsTab /></TabsContent>
      <TabsContent value="plans"><PlansSettingsTab /></TabsContent>
      <TabsContent value="email"><EmailSettingsTab /></TabsContent>
    </Tabs>
  </motion.div>
);

export default AdminSettingsPage;
