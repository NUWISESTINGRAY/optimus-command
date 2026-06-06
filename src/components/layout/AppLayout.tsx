import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Bell, Search, User, CheckCheck } from "lucide-react";
import { Outlet, useNavigate } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";

type Notification = {
  id: string;
  title: string;
  body: string | null;
  message: string | null;
  type: string | null;
  status: string | null;
  read: boolean | null;
  link: string | null;
  created_at: string;
};

export function AppLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("id,title,body,message,type,status,read,link,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setItems((data as Notification[]) ?? []);
  };

  useEffect(() => {
    load();
    if (!user) return;
    const ch = supabase
      .channel(`notif-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const unread = items.filter((n) => !n.read && n.status !== "read").length;

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ read: true, status: "read" }).eq("user_id", user.id).eq("read", false);
    load();
  };

  const openItem = async (n: Notification) => {
    if (!n.read) {
      await supabase.from("notifications").update({ read: true, status: "read" }).eq("id", n.id);
    }
    setOpen(false);
    if (n.link) navigate(n.link);
    load();
  };

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
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <button
                    className="relative p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                    aria-label="Notifications"
                  >
                    <Bell className="w-4 h-4" />
                    {unread > 0 && (
                      <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold flex items-center justify-center">
                        {unread > 9 ? "9+" : unread}
                      </span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-96 p-0">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-border">
                    <div className="font-medium text-sm">Notifications</div>
                    {unread > 0 && (
                      <button
                        onClick={markAllRead}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                      >
                        <CheckCheck className="w-3 h-3" /> Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-96 overflow-auto">
                    {items.length === 0 ? (
                      <div className="p-6 text-center text-sm text-muted-foreground">No notifications yet</div>
                    ) : (
                      items.map((n) => {
                        const isUnread = !n.read && n.status !== "read";
                        return (
                          <button
                            key={n.id}
                            onClick={() => openItem(n)}
                            className={`w-full text-left px-4 py-3 border-b border-border/50 hover:bg-secondary/40 transition-colors flex gap-3 ${isUnread ? "bg-secondary/20" : ""}`}
                          >
                            <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${
                              n.type === "error" ? "bg-destructive" :
                              n.type === "warning" ? "bg-yellow-500" :
                              n.type === "success" ? "bg-green-500" : "bg-primary"
                            } ${isUnread ? "" : "opacity-30"}`} />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{n.title}</div>
                              {(n.body || n.message) && (
                                <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.body || n.message}</div>
                              )}
                              <div className="text-[10px] text-muted-foreground mt-1">
                                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </PopoverContent>
              </Popover>
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
