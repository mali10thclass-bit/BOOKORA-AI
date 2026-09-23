import { createFileRoute } from "@tanstack/react-router";
import { Protected } from "@/components/Protected";
import { Waitlist } from "@/pages/Waitlist";

export const Route = createFileRoute("/waitlist")({
  ssr: false,
  component: () => <Protected><Waitlist /></Protected>,
});
