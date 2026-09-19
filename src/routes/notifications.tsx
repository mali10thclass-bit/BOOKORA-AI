import { createFileRoute } from "@tanstack/react-router";
import { Protected } from "@/components/Protected";
import { NotificationsPage } from "@/pages/NotificationsPage";

export const Route = createFileRoute("/notifications")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Notifications | BOOKORA AI" },
      {
        name: "description",
        content: "Notification templates and a log of every message recorded.",
      },
      { property: "og:title", content: "Notifications | BOOKORA AI" },
      {
        property: "og:description",
        content: "Notification templates and a log of every message recorded.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <Protected>
      <NotificationsPage />
    </Protected>
  ),
});
