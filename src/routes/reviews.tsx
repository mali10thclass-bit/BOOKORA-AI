import { createFileRoute } from "@tanstack/react-router";
import { Protected } from "@/components/Protected";
import { ReviewsPage } from "@/pages/ReviewsPage";

export const Route = createFileRoute("/reviews")({
  ssr: false,
  component: () => <Protected><ReviewsPage /></Protected>,
});
