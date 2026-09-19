import { createFileRoute } from "@tanstack/react-router";
import { Protected } from "@/components/Protected";
import { Customers } from "@/pages/Customers";

export const Route = createFileRoute("/customers")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Customers | BOOKORA AI" },
      {
        name: "description",
        content: "Customer records, visit history, notes and tags in one place.",
      },
      { property: "og:title", content: "Customers | BOOKORA AI" },
      {
        property: "og:description",
        content: "Customer records, visit history, notes and tags in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <Protected>
      <Customers />
    </Protected>
  ),
});
