"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RenterLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch("/api/renters/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      // Mark renter as logged in for client-side navigation checks
      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem("clearmove-logged-in", "true");
          sessionStorage.setItem("clearmove-user-type", "renter");
          sessionStorage.setItem(
            "clearmove-user-email",
            email.toLowerCase().trim()
          );
        } catch {
          // Ignore storage errors – cookie-based auth still works
        }
      }

      router.push("/app");
    } catch (err: any) {
      setError(err?.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-soft text-slate-900">
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="relative h-16 w-16">
            <Image
              src="/Trust2-removebg-preview.png"
              alt="TrustRent logo"
              fill
              className="rounded-2xl object-contain"
              priority
            />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              TrustRent
            </h1>
            <p className="mt-1 text-xs font-medium uppercase tracking-[0.15em] text-slate-600">
              Renter login
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Welcome back</h2>
          <p className="mt-1 text-sm text-slate-500">
            Don't have an account yet?{" "}
            <Link
              href="/register"
              className="font-semibold text-emerald-600 hover:text-emerald-700"
            >
              Use your invite link
            </Link>
            .
          </p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
              Email
              <input
                type="email"
                required
                autoComplete="email"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
              Password
              <input
                type="password"
                required
                autoComplete="current-password"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {isLoading ? "Signing in…" : "Sign in"}
            </button>
          </form>
          <div className="mt-4 text-center">
            <Link href="/login" className="text-xs text-slate-500 hover:text-slate-900">
              ← Back to access options
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

