import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Bell, Search, User } from "lucide-react";
import { Outlet } from "react-router-dom";

export function AppLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Bar */}
          <header className="h-12 flex items-center justify-between border-b border-border px-4 bg-background/80 backdrop-blur-md sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary/50 text-muted-foreground text-sm">
                <Search className="w-3.5 h-3.5" />
                <span className="text-xs">Search commands...</span>
                <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-border text-muted-foreground ml-4">⌘K</kbd>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="relative p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
                <Bell className="w-4 h-4" />
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary" />
              </button>
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                <User className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
