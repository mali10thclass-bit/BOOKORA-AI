import { createFileRoute } from "@tanstack/react-router";
import { Protected } from "@/components/Protected";
import { FormsPage } from "@/pages/FormsPage";
export const Route = createFileRoute("/forms")({ ssr: false, component: () => <Protected><FormsPage /></Protected> });
