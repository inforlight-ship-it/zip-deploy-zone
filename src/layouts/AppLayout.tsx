import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CommandMenu } from "@/components/CommandMenu";

export default function AppLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border/30 bg-background/60 backdrop-blur-xl px-4 shrink-0 gap-4">
            <div className="flex items-center gap-4 flex-1">
              <SidebarTrigger />
              <CommandMenu />
            </div>
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto bg-radial-glow">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
