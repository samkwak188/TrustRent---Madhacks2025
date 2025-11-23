"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AccessPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsValidating(true);

    const cleanToken = token.trim();
    if (cleanToken.length !== 6) {
      setError("Token must be exactly 6 digits");
      setIsValidating(false);
      return;
    }

    try {
      const res = await fetch("/api/validate-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: cleanToken }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Invalid token");
      }

      // Token is valid - redirect to registration with token embedded
      router.push(`/register?token=${cleanToken}`);
    } catch (err: any) {
      setError(err.message || "Unable to validate token");
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold text-slate-900">Welcome to TrustRent</h1>
          <p className="mt-2 text-sm text-slate-600">
            Enter the 6-digit access token from your email to get started.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700">
                Access Token
              </label>
              <input
                type="text"
                required
                maxLength={6}
                pattern="[0-9]{6}"
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))}
                className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-center text-2xl font-bold tracking-[0.5em] outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                placeholder="000000"
                autoFocus
              />
              <p className="mt-2 text-xs text-slate-500">
                Check your email for the 6-digit token sent by your property manager.
              </p>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isValidating || token.length !== 6}
              className="w-full rounded-full bg-emerald-600 px-6 py-3 text-base font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isValidating ? "Validating..." : "Continue"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-slate-500">
              Already have an account?{" "}
              <Link href="/renter/login" className="font-medium text-emerald-600 hover:text-emerald-700">
                Sign in
              </Link>
            </p>
          </div>

          <div className="mt-8 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold text-slate-700">Don't have a token?</p>
            <p className="mt-1 text-xs text-slate-600">
              Contact your property manager to request access. They will send you a unique 6-digit token to your email.
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link href="/login" className="text-sm text-slate-500 hover:text-slate-900">
            ← Back to access options
          </Link>
        </div>
      </main>
    </div>
  );
}


