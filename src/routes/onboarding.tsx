import { createFileRoute } from "@tanstack/react-router";
import { OnboardingWizard } from "@/pages/OnboardingWizard";

export const Route = createFileRoute("/onboarding")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Set up your business | BOOKORA AI" },
      { name: "description", content: "Add your business details, services and staff to start taking bookings." },
      { property: "og:title", content: "Set up your business | BOOKORA AI" },
      { property: "og:description", content: "Add your business details, services and staff to start taking bookings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OnboardingWizard,
});
