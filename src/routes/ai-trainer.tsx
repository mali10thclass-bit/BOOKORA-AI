import { createFileRoute } from "@tanstack/react-router";
import { Protected } from "@/components/Protected";
import { AITrainer } from "@/pages/AITrainer";

export const Route = createFileRoute("/ai-trainer")({
  ssr: false,
  component: () => <Protected><AITrainer /></Protected>,
});
