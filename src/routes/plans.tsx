import { createFileRoute } from "@tanstack/react-router";
import { Protected } from "@/components/Protected";
import { PlansPage } from "@/pages/PlansPage";

export const Route = createFileRoute("/plans")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Plans | BOOKORA AI" },
      { name: "description", content: "Compare Free, Pro and Ultimate plans and their limits." },
      { property: "og:title", content: "Plans | BOOKORA AI" },
      { property: "og:description", content: "Compare Free, Pro and Ultimate plans and their limits." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <Protected>
      <PlansPage />
    </Protected>
  ),
});
