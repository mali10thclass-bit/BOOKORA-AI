import { createFileRoute } from "@tanstack/react-router";
import { Protected } from "@/components/Protected";
import { SmartOperationsPage } from "@/pages/SmartOperationsPage";

export const Route = createFileRoute("/smart-operations")({
  ssr: false,
  component: () => <Protected><SmartOperationsPage /></Protected>,
});
