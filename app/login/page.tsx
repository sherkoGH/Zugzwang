"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const configured = isSupabaseConfigured();

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!configured) {
        // Offline-friendly mode: fake auth with localStorage.
        setUser(email, email.split("@")[0]);
        router.push("/profile");
        return;
      }
      const sb = getSupabase();
      if (!sb) {
        setError("Supabase client unavailable.");
        return;
      }
      const fn = mode === "sign-in" ? sb.auth.signInWithPassword.bind(sb.auth) : sb.auth.signUp.bind(sb.auth);
      const { data, error: e } = await fn({ email, password });
      if (e) {
        setError(e.message);
        return;
      }
      if (data.user) {
        setUser(data.user.email ?? email, (data.user.email ?? email).split("@")[0]);
        router.push("/profile");
      } else {
        setError("Check your email for a confirmation link.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tightest">
          {mode === "sign-in" ? "Sign in" : "Create account"}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {configured
            ? "Use your email and password."
            : "Supabase isn't configured — your username will be saved locally."}
        </p>
      </div>

      <div className="space-y-3 rounded-xl border border-earth-line bg-earth-card p-5">
        <Field
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
        />
        <Field
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
        />
        {error && (
          <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={loading || email.length === 0}
          className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-obsidian outline-none duration-150 ease-out hover:bg-accent-bright focus-visible:ring-2 focus-visible:ring-accent-bright disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "..." : mode === "sign-in" ? "Sign in" : "Create account"}
        </button>
        <button
          type="button"
          onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
          className="w-full rounded-md px-4 py-2 text-xs font-semibold text-muted outline-none duration-150 ease-out hover:text-ivory focus-visible:ring-2 focus-visible:ring-accent"
        >
          {mode === "sign-in"
            ? "Don't have an account? Create one"
            : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  autoComplete,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">
        {label}
      </span>
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-earth-line bg-obsidian px-3 py-2 text-sm text-ivory outline-none duration-150 ease-out focus:border-accent focus-visible:ring-2 focus-visible:ring-accent"
      />
    </label>
  );
}
