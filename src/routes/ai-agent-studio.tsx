import { createFileRoute } from "@tanstack/react-router";
import { Protected } from "@/components/Protected";
import { AIAgentStudio } from "@/pages/AIAgentStudio";

export const Route = createFileRoute("/ai-agent-studio")({
  ssr: false,
  component: () => <Protected><AIAgentStudio /></Protected>,
});
