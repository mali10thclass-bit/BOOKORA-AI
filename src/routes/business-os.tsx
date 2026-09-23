import { createFileRoute } from "@tanstack/react-router";
import { Protected } from "@/components/Protected";
import { AppLayout } from "@/components/AppLayout";
import { BusinessOS } from "@/pages/BusinessOS";

export const Route = createFileRoute("/business-os")({
  component: () => (
    <Protected>
      <AppLayout><BusinessOS /></AppLayout>
    </Protected>
  ),
});
