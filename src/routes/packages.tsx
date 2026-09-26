import { createFileRoute } from "@tanstack/react-router";
import { Protected } from "@/components/Protected";
import { PackagesPage } from "@/pages/PackagesPage";
export const Route = createFileRoute("/packages")({ ssr: false, component: () => <Protected><PackagesPage /></Protected> });
