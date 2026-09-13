import { createFileRoute } from "@tanstack/react-router";
import { Protected } from "@/components/Protected";
import { StaffPage } from "@/pages/StaffPage";

export const Route = createFileRoute("/staff")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Staff | BOOKORA AI" },
      { name: "description", content: "Manage team members, roles and weekly working hours." },
      { property: "og:title", content: "Staff | BOOKORA AI" },
      { property: "og:description", content: "Manage team members, roles and weekly working hours." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <Protected>
      <StaffPage />
    </Protected>
  ),
});
