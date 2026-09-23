import { createFileRoute } from "@tanstack/react-router";
import { Protected } from "@/components/Protected";
import { DeveloperPage } from "@/pages/DeveloperPage";

export const Route = createFileRoute("/developer")({
  ssr: false,
  component: () => <Protected><DeveloperPage /></Protected>,
});
