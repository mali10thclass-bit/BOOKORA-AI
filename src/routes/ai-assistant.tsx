import { createFileRoute } from "@tanstack/react-router";
import { Protected } from "@/components/Protected";
import { AIAssistant } from "@/pages/AIAssistant";

export const Route = createFileRoute("/ai-assistant")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Assistant | BOOKORA AI" },
      { name: "description", content: "Ask questions about your own booking and revenue data." },
      { property: "og:title", content: "Assistant | BOOKORA AI" },
      {
        property: "og:description",
        content: "Ask questions about your own booking and revenue data.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <Protected>
      <AIAssistant />
    </Protected>
  ),
});
