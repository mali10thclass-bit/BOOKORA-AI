import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@/lib/router-compat";
import { useAuth } from "@/context/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { AlertCircle } from "lucide-react";

function FullScreenSpinner() {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600 mx-auto mb-4" />
        <p className="text-sm text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <div className="max-w-md text-center">
        <div className="w-16 h-16 rounded-full bg-error-100 dark:bg-error-900/30 flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={32} className="text-error-600" />
        </div>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
          Something went wrong
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{message}</p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-4">
          Please try refreshing the page or contact support if the problem persists.
        </p>
      </div>
    </div>
  );
}

export function Protected({ children }: { children: ReactNode }) {
  const { loading, user, business, error } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) navigate("/auth", { replace: true });
    else if (!business) navigate("/onboarding", { replace: true });
  }, [loading, user, business, navigate]);

  if (loading) return <FullScreenSpinner />;

  if (error) return <ErrorScreen message={error} />;

  if (!user) return <FullScreenSpinner />;

  if (!business) return <FullScreenSpinner />;

  return <AppLayout>{children}</AppLayout>;
}
