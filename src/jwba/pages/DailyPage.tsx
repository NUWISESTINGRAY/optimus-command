import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getOrCreateDailyPage } from "../lib/api";
import { PageView } from "../PageView";

export default function DailyPage() {
  const { date } = useParams();
  const { user } = useAuth();
  const [pageId, setPageId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !date) return;
    getOrCreateDailyPage(date, user.id).then((p) => setPageId(p.id));
  }, [user, date]);

  if (!pageId) return <div className="p-8 text-muted-foreground text-sm">Loading…</div>;
  return <PageView pageId={pageId} />;
}