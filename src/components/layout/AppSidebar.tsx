import {
  LayoutDashboard,
  MessageSquare,
  CheckSquare,
  Workflow,
  Brain,
  Mail,
  FileText,
  ShieldCheck,
  Activity,
  Settings,
  Zap,
  GitBranch,
  Users,
  Brain as BrainIcon,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Command Center", url: "/", icon: LayoutDashboard },
  { title: "Optimus Chat", url: "/chat", icon: MessageSquare },
  { title: "Mission Queue", url: "/tasks", icon: CheckSquare },
  { title: "ATLAS Engine", url: "/workflows", icon: Workflow },
  { title: "Automations", url: "/automations", icon: GitBranch },
  { title: "JWBA Workspace", url: "/workspace", icon: BrainIcon },
  { title: "Knowledge Vault", url: "/memory", icon: Brain },
  { title: "Framework OS", url: "/frameworks", icon: FileText },
  { title: "Communications", url: "/email", icon: Mail },
  { title: "Documents", url: "/documents", icon: FileText },
  { title: "Approval Gate", url: "/approvals", icon: ShieldCheck },
  { title: "Execution Log", url: "/logs", icon: Activity },
  { title: "Persona Admin", url: "/agents-admin", icon: Users },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  return (
    <Sidebar collapsible="icon" className="border-r border-border bg-sidebar">
      <SidebarContent>
        {/* System Identity */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            {!collapsed && (
              <div>
                <h1 className="text-sm font-display font-bold text-foreground tracking-wider">
                  OPTIMUS
                </h1>
                <p className="text-[10px] text-muted-foreground tracking-widest uppercase">
                  Executive AI OS
                </p>
              </div>
            )}
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.url === "/"}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-200 ${
                          isActive
                            ? "bg-primary/10 text-primary border border-primary/20"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                        }`}
                        activeClassName=""
                      >
                        <item.icon className="w-4 h-4 flex-shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* System Status */}
        {!collapsed && (
          <div className="mt-auto p-4 border-t border-border">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="status-dot-active" />
              <span>System Online</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1.5">
              <div className="status-dot bg-primary animate-pulse-glow" />
              <span>AI Core Active</span>
            </div>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
