import { createFileRoute } from "@tanstack/react-router";
import { Protected } from "@/components/Protected";
import { ResourcesPage } from "@/pages/ResourcesPage";

export const Route = createFileRoute("/resources")({
  ssr: false,
  component: () => <Protected><ResourcesPage /></Protected>,
});
