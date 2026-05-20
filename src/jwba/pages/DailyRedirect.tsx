import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

export default function DailyRedirect() {
  const nav = useNavigate();
  useEffect(() => {
    nav(`/workspace/daily/${format(new Date(), "yyyy-MM-dd")}`, { replace: true });
  }, [nav]);
  return null;
}