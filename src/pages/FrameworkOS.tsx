import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Dashboard from "@/jw/framework/Dashboard";
import Library from "@/jw/framework/Library";
import { Pulse, Prompts } from "@/jw/framework/Assessments";
import Backlog from "@/jw/framework/Backlog";
import Roles from "@/jw/framework/Roles";
import Workflows from "@/jw/framework/Workflows";
import Entities from "@/jw/framework/Entities";

const TABS = [
  ["dashboard", "Dashboard"], ["library", "Manual & SOPs"], ["backlog", "Backlog & Activation"], ["pulse", "P.U.L.S.E."],
  ["prompts", "PROMPTS"], ["roles", "Roles & Agents"], ["workflows", "Workflow Drafts"], ["entities", "Entities"],
];

export default function FrameworkOS() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "dashboard";
  const go = (t: string) => setParams({ tab: t });
  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">JW Brand Framework OS</h1>
        <p className="text-sm text-muted-foreground mt-1">Operating manual, SOPs, framework registry, P.U.L.S.E., PROMPTS, gated task activation and workflow blueprints.</p>
      </div>
      <Tabs value={tab} onValueChange={go}>
        <TabsList className="flex-wrap h-auto">
          {TABS.map(([k, l]) => <TabsTrigger key={k} value={k}>{l}</TabsTrigger>)}
        </TabsList>
        <TabsContent value="dashboard"><Dashboard go={go} /></TabsContent>
        <TabsContent value="library"><Library /></TabsContent>
        <TabsContent value="backlog"><Backlog /></TabsContent>
        <TabsContent value="pulse"><Pulse /></TabsContent>
        <TabsContent value="prompts"><Prompts /></TabsContent>
        <TabsContent value="roles"><Roles /></TabsContent>
        <TabsContent value="workflows"><Workflows /></TabsContent>
        <TabsContent value="entities"><Entities /></TabsContent>
      </Tabs>
    </div>
  );
}
