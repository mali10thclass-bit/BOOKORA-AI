import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { ThemeProvider } from "@/context/ThemeContext";
import { I18nProvider } from "@/context/I18nContext";
import { AuthProvider } from "@/context/AuthContext";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function isMissingEnvError(error: Error): boolean {
  return /Missing Supabase environment variable/i.test(error.message);
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  if (isMissingEnvError(error)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-lg text-center">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Supabase is not configured
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
          <div className="mt-6 rounded-lg border border-input bg-background p-4 text-left text-sm text-muted-foreground">
            <p className="font-medium text-foreground">To fix this:</p>
            <ol className="mt-2 list-decimal list-inside space-y-1">
              <li>
                Create a <code className="rounded bg-black/10 dark:bg-white/10 px-1">.env</code>{" "}
                file from{" "}
                <code className="rounded bg-black/10 dark:bg-white/10 px-1">.env.example</code>
              </li>
              <li>
                Set{" "}
                <code className="rounded bg-black/10 dark:bg-white/10 px-1">VITE_SUPABASE_URL</code>{" "}
                and{" "}
                <code className="rounded bg-black/10 dark:bg-white/10 px-1">
                  VITE_SUPABASE_PUBLISHABLE_KEY
                </code>{" "}
                from your Supabase project settings
              </li>
              <li>Restart the dev server and refresh this page</li>
            </ol>
          </div>
          <div className="mt-6">
            <button
              onClick={() => {
                router.invalidate();
                reset();
              }}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "BOOKORA AI — Appointment booking for growing businesses" },
      {
        name: "description",
        content:
          "Run bookings, staff, services, customers and payments from one dashboard, with a public booking page for your customers.",
      },
      { property: "og:title", content: "BOOKORA AI — Appointment booking software" },
      {
        property: "og:description",
        content:
          "Run bookings, staff, services, customers and payments from one dashboard, with a public booking page for your customers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "theme-color", content: "#4F46E5" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "BOOKORA" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "icon", href: "/pwa-192.png", type: "image/png", sizes: "192x192" },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

/**
 * Missing Supabase configuration is a deployment problem, not a runtime
 * page error: show a dedicated setup screen on first paint instead of
 * letting every page fail with a generic error.
 *
 * The check mirrors the client's own variable resolution
 * (VITE_* for the browser build, plain names for the server), so it is
 * consistent between SSR and the client.
 */
function SupabaseConfigGate({ children }: { children: ReactNode }) {
  const missing = (() => {
    const m: string[] = [];
    const env = import.meta.env;
    if (!env.VITE_SUPABASE_URL && !process.env.SUPABASE_URL) m.push("VITE_SUPABASE_URL");
    if (!env.VITE_SUPABASE_PUBLISHABLE_KEY && !process.env.SUPABASE_PUBLISHABLE_KEY)
      m.push("VITE_SUPABASE_PUBLISHABLE_KEY");
    return m;
  })();

  if (missing.length > 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-lg text-center">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Supabase is not configured
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Missing environment variable(s): {missing.join(", ")}
          </p>
          <div className="mt-6 rounded-lg border border-input bg-background p-4 text-left text-sm text-muted-foreground">
            <p className="font-medium text-foreground">To fix this:</p>
            <ol className="mt-2 list-decimal list-inside space-y-1">
              <li>
                Create a <code className="rounded bg-black/10 dark:bg-white/10 px-1">.env</code>{" "}
                file from{" "}
                <code className="rounded bg-black/10 dark:bg-white/10 px-1">.env.example</code>
              </li>
              <li>
                Set{" "}
                <code className="rounded bg-black/10 dark:bg-white/10 px-1">VITE_SUPABASE_URL</code>{" "}
                and{" "}
                <code className="rounded bg-black/10 dark:bg-white/10 px-1">
                  VITE_SUPABASE_PUBLISHABLE_KEY
                </code>{" "}
                from your Supabase project settings
              </li>
              <li>Restart the dev server and refresh this page</li>
            </ol>
          </div>
          <div className="mt-6">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Reload
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <SupabaseConfigGate>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <I18nProvider>
            <AuthProvider>
              {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
              <Outlet />
            </AuthProvider>
          </I18nProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SupabaseConfigGate>
  );
}
