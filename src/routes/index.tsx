import { createFileRoute } from "@tanstack/react-router";
import { Protected } from "@/components/Protected";
import { Dashboard } from "@/pages/Dashboard";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Dashboard | BOOKORA AI" },
      { name: "description", content: "Today's appointments, revenue and activity for your booking business." },
      { property: "og:title", content: "Dashboard | BOOKORA AI" },
      { property: "og:description", content: "Today's appointments, revenue and activity for your booking business." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <Protected>
      <Dashboard />
    </Protected>
  ),
});
