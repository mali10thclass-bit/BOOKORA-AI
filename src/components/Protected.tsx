import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@/lib/router-compat";
import { useAuth } from "@/context/AuthContext";
import { AppLayout } from "@/components/AppLayout";

function FullScreenSpinner() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600" />
    </div>
  );
}

export function Protected({ children }: { children: ReactNode }) {
  const { loading, user, business } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) navigate("/auth", { replace: true });
    else if (!business) navigate("/onboarding", { replace: true });
  }, [loading, user, business, navigate]);

  if (loading || !user || !business) return <FullScreenSpinner />;

  return <AppLayout>{children}</AppLayout>;
}
