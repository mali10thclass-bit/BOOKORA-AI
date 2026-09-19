import { createFileRoute } from "@tanstack/react-router";
import { PublicBooking } from "@/pages/PublicBooking";

export const Route = createFileRoute("/book/$slug")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Book an appointment" },
      {
        name: "description",
        content: "Choose a service, a team member and a time that works for you.",
      },
      { property: "og:title", content: "Book an appointment" },
      {
        property: "og:description",
        content: "Choose a service, a team member and a time that works for you.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PublicBooking,
});
