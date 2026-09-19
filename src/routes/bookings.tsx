import { createFileRoute } from "@tanstack/react-router";
import { Protected } from "@/components/Protected";
import { Bookings } from "@/pages/Bookings";

export const Route = createFileRoute("/bookings")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Bookings | BOOKORA AI" },
      {
        name: "description",
        content: "Create, confirm, reschedule and cancel customer appointments.",
      },
      { property: "og:title", content: "Bookings | BOOKORA AI" },
      {
        property: "og:description",
        content: "Create, confirm, reschedule and cancel customer appointments.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <Protected>
      <Bookings />
    </Protected>
  ),
});
