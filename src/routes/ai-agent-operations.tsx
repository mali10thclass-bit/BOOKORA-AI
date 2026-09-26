import { createFileRoute } from "@tanstack/react-router";
import { Protected } from "@/components/Protected";
import { AIAgentOperations } from "@/pages/AIAgentOperations";

export const Route = createFileRoute("/ai-agent-operations")({
  ssr: false,
  component: () => <Protected><AIAgentOperations /></Protected>,
});
