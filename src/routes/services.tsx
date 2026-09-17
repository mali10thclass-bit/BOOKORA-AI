import { createFileRoute } from "@tanstack/react-router";
import { Protected } from "@/components/Protected";
import { ServicesPage } from "@/pages/ServicesPage";

export const Route = createFileRoute("/services")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Services | BOOKORA AI" },
      {
        name: "description",
        content: "Define bookable services with duration, price and category.",
      },
      { property: "og:title", content: "Services | BOOKORA AI" },
      {
        property: "og:description",
        content: "Define bookable services with duration, price and category.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <Protected>
      <ServicesPage />
    </Protected>
  ),
});
