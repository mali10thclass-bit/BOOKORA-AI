import { useState } from "react";
import { useNavigate } from "@/lib/router-compat";
import { useAuth } from "@/context/AuthContext";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export function AuthPage() {
  const { signIn, signUp, requestPasswordReset, updatePassword, recoveryMode } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const switchMode = (nextMode: "signin" | "signup" | "reset") => {
    setMode(nextMode);
    setError(null);
    setNotice(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);

    if (recoveryMode) {
      if (password.length < 6) {
        setError("Password must be at least 6 characters");
        setLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        setLoading(false);
        return;
      }
      const result = await updatePassword(password);
      if (result.error) setError(result.error);
      else {
        setNotice("Password updated successfully. You can now sign in with your new password.");
        setPassword("");
        setConfirmPassword("");
        setMode("signin");
      }
      setLoading(false);
      return;
    }

    if (mode === "reset") {
      if (!email.trim()) {
        setError("Please enter your email address");
        setLoading(false);
        return;
      }
      const result = await requestPasswordReset(email);
      if (result.error) setError(result.error);
      else setNotice("Password reset email sent. Check your inbox and follow the secure reset link.");
      setLoading(false);
      return;
    }

    if (mode === "signin") {
      const result = await signIn(email, password);
      if (result.error) {
        setError(result.error);
      } else {
        navigate("/", { replace: true });
      }
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    if (fullName.trim().length < 2) {
      setError("Please enter your full name");
      setLoading(false);
      return;
    }

    const result = await signUp(email, password, fullName);
    if (result.error) {
      setError(result.error);
    } else if (result.requiresEmailConfirmation) {
      setNotice(
        "Account created. Please confirm your email, then sign in to continue to your dashboard.",
      );
    } else {
      navigate("/onboarding", { replace: true });
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden bg-gray-950 p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary-600/30 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-accent-600/20 blur-3xl" />

          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-600 shadow-lg shadow-primary-900/40">
                <Calendar size={23} />
              </div>
              <div>
                <p className="text-xl font-bold tracking-tight">BOOKORA AI</p>
                <p className="text-xs text-gray-400">Business command center</p>
              </div>
            </div>
          </div>

          <div className="relative max-w-xl py-10">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-300">
              <Sparkles size={14} className="text-primary-300" />
              Booking operations, analytics and growth in one place
            </div>
            <h1 className="text-4xl font-bold leading-tight xl:text-5xl">
              Run your business with a clearer view of every appointment.
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-6 text-gray-400">
              Manage bookings, customers, services, staff, payments and business insights from one focused workspace.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                ["Live overview", "Today's schedule and KPIs"],
                ["Operations", "Bookings, staff and customers"],
                ["Growth", "Analytics and AI assistance"],
              ].map(([title, description]) => (
                <div key={title} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-gray-400">{description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative flex items-center gap-2 text-xs text-gray-500">
            <ShieldCheck size={15} />
            Secure authentication with Supabase
          </div>
        </section>

        <section className="flex items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-md">
            <div className="mb-7 flex items-center justify-center gap-2 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-white">
                <Calendar size={21} />
              </div>
              <span className="text-2xl font-bold tracking-tight">BOOKORA AI</span>
            </div>

            <div className="mb-6">
              {!recoveryMode && (
              <div className="mb-5 flex rounded-xl bg-gray-100 p-1 dark:bg-gray-900">
                {[
                  ["signin", "Sign in"],
                  ["signup", "Create account"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => switchMode(value as "signin" | "signup")}
                    className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition ${mode === value ? "bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-white" : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-200"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              )}

              <h2 className="text-2xl font-bold tracking-tight">
                {recoveryMode ? "Set a new password" : mode === "signin" ? "Welcome back" : mode === "reset" ? "Reset your password" : "Start your workspace"}
              </h2>
              <p className="mt-1.5 text-sm text-gray-500">
                {recoveryMode
                  ? "Choose a new password for your BOOKORA account."
                  : mode === "signin"
                    ? "Sign in to open your BOOKORA dashboard."
                    : mode === "reset"
                      ? "Enter your account email and we will send you a secure reset link."
                      : "Create your account and set up your business in a few steps."}
              </p>
            </div>

            <div className="card p-6 shadow-sm sm:p-7">
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "signup" && (
                  <div>
                    <label className="label">Full Name</label>
                    <input
                      type="text"
                      className="input"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      autoComplete="name"
                      placeholder="Muhammed Ali"
                    />
                  </div>
                )}

                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    className="input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                  />
                </div>

                {mode !== "reset" && (
                <div>
                  <label className="label">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="input pr-11"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      autoComplete={mode === "signin" ? "current-password" : "new-password"}
                      placeholder="At least 6 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>
                )}

                {(recoveryMode || mode === "reset") && mode !== "reset" && (
                  <div>
                    <label className="label">Confirm New Password</label>
                    <input type="password" className="input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required autoComplete="new-password" placeholder="Repeat your new password" />
                  </div>
                )}

                {error && (
                  <div
                    role="alert"
                    className="rounded-xl border border-error-200 bg-error-50 px-3 py-2.5 text-sm text-error-700 dark:border-error-800 dark:bg-error-900/20 dark:text-error-300"
                  >
                    {error}
                  </div>
                )}

                {notice && (
                  <div
                    role="status"
                    className="flex gap-2 rounded-xl border border-accent-200 bg-accent-50 px-3 py-2.5 text-sm text-accent-700 dark:border-accent-800 dark:bg-accent-900/20 dark:text-accent-300"
                  >
                    <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
                    <span>{notice}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full justify-center py-2.5"
                >
                  {loading ? <Loader2 size={17} className="animate-spin" /> : <ArrowRight size={17} />}
                  {loading
                    ? recoveryMode ? "Updating password..." : mode === "reset" ? "Sending reset link..." : mode === "signin" ? "Signing in..." : "Creating account..."
                    : recoveryMode ? "Update Password" : mode === "reset" ? "Send Reset Link" : mode === "signin" ? "Open Dashboard" : "Create Account"}
                </button>
              </form>

              {!recoveryMode && mode === "signin" && (
                <div className="mt-4 text-center">
                  <button type="button" onClick={() => switchMode("reset")} className="text-sm font-medium text-primary-600 hover:underline">Forgot password?</button>
                </div>
              )}

              <div className="mt-6 text-center text-sm text-gray-500">
                {mode === "reset" ? "Remembered your password? " : mode === "signin" ? "New to BOOKORA? " : "Already have an account? "}
                <button
                  type="button"
                  onClick={() => switchMode(mode === "signin" ? "signup" : "signin")}
                  className="font-medium text-primary-600 hover:underline"
                >
                  {mode === "reset" ? "Sign in" : mode === "signin" ? "Create an account" : "Sign in"}
                </button>
              </div>
            </div>

            <p className="mt-5 text-center text-xs text-gray-400">
              Your account and business data stay protected by Supabase authentication and database policies.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
