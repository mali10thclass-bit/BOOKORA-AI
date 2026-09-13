import { createFileRoute } from "@tanstack/react-router";
import { Protected } from "@/components/Protected";
import { CalendarPage } from "@/pages/CalendarPage";

export const Route = createFileRoute("/calendar")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Calendar | BOOKORA AI" },
      { name: "description", content: "Day, week and month views of every appointment on your schedule." },
      { property: "og:title", content: "Calendar | BOOKORA AI" },
      { property: "og:description", content: "Day, week and month views of every appointment on your schedule." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <Protected>
      <CalendarPage />
    </Protected>
  ),
});
