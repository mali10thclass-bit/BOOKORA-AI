import { createFileRoute } from "@tanstack/react-router";
import { Protected } from "@/components/Protected";
import { Analytics } from "@/pages/Analytics";

export const Route = createFileRoute("/analytics")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Analytics | BOOKORA AI" },
      {
        name: "description",
        content: "Booking trends, revenue and completion rates for your business.",
      },
      { property: "og:title", content: "Analytics | BOOKORA AI" },
      {
        property: "og:description",
        content: "Booking trends, revenue and completion rates for your business.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <Protected>
      <Analytics />
    </Protected>
  ),
});
