import { createFileRoute } from "@tanstack/react-router";
import { Protected } from "@/components/Protected";
import { AutomationsPage } from "@/pages/AutomationsPage";

export const Route = createFileRoute("/automations")({
  ssr: false,
  component: () => <Protected><AutomationsPage /></Protected>,
});
