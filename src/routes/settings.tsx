import { createFileRoute } from "@tanstack/react-router";
import { Protected } from "@/components/Protected";
import { SettingsPage } from "@/pages/SettingsPage";

export const Route = createFileRoute("/settings")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Settings | BOOKORA AI" },
      { name: "description", content: "Business profile, branding, timezone, language and theme." },
      { property: "og:title", content: "Settings | BOOKORA AI" },
      { property: "og:description", content: "Business profile, branding, timezone, language and theme." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <Protected>
      <SettingsPage />
    </Protected>
  ),
});
