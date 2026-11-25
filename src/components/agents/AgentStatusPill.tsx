import { Badge } from "@/components/ui/badge";
import { AGENT_STATUS_LABELS, type AgentJobStatus } from "@/lib/agents/registry";

const VARIANT: Record<AgentJobStatus, "outline" | "warning" | "teal" | "destructive" | "secondary"> = {
  idle: "outline", queued: "secondary", running: "teal", waiting_connection: "warning", completed: "teal", failed: "destructive",
};
export function AgentStatusPill({ status }: { status: AgentJobStatus }) {
  return <Badge variant={VARIANT[status]}>{status === "running" && <span className="mr-1 inline-block size-2 animate-pulse rounded-full bg-current" aria-hidden />}{AGENT_STATUS_LABELS[status]}</Badge>;
}
