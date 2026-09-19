import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/pages/AuthPage";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in | BOOKORA AI" },
      {
        name: "description",
        content: "Sign in or create your BOOKORA AI account to manage appointments.",
      },
      { property: "og:title", content: "Sign in | BOOKORA AI" },
      {
        property: "og:description",
        content: "Sign in or create your BOOKORA AI account to manage appointments.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});
