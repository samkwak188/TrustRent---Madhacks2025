"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

type RegistrationForm = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") ?? "";

  const [form, setForm] = useState<RegistrationForm>({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [invitationDetails, setInvitationDetails] = useState<{
    renterName: string;
    renterEmail: string;
    apartmentName: string;
    unitNumber: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate token and fetch invitation details
  useEffect(() => {
    if (!token || token.length !== 6) {
      setError("Invalid token. Please use the access page to enter your 6-digit token.");
      setIsLoading(false);
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/validate-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || "Invalid token");
        }

        setInvitationDetails({
          renterName: data.renterName,
          renterEmail: data.renterEmail,
          apartmentName: data.apartmentName,
          unitNumber: data.unitNumber,
        });
        setForm((prev) => ({
          ...prev,
          fullName: data.renterName,
          email: data.renterEmail || prev.email,
        }));
      } catch (err: any) {
        setError(err.message || "Token validation failed");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    // Client-side email check against the invited email
    if (
      invitationDetails &&
      form.email.trim().toLowerCase() !==
        invitationDetails.renterEmail.toLowerCase()
    ) {
      setError(
        "Please use the same email address that received your TrustRent invite."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/renters/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          fullName: form.fullName.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
        }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Registration failed");
      }

      // Account created and session started - mark renter as logged in for client-side checks
      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem("clearmove-logged-in", "true");
          sessionStorage.setItem("clearmove-user-type", "renter");
          sessionStorage.setItem(
            "clearmove-user-email",
            form.email.trim().toLowerCase()
          );
        } catch {
          // Ignore storage errors – cookie-based auth still works
        }
      }

      // Redirect to main app
      router.push("/app");
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-600">Validating your token...</p>
      </div>
    );
  }

  if (error && !invitationDetails) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md rounded-2xl border border-red-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-semibold text-red-700">Invalid Token</h1>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
          <Link
            href="/access"
            className="mt-4 inline-block rounded-full bg-emerald-600 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Enter token again
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Create Your Account</h1>
          
          {invitationDetails && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs font-semibold text-emerald-900">Token verified for:</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{invitationDetails.renterName}</p>
              <p className="text-xs text-slate-600">
                {invitationDetails.apartmentName} – Unit {invitationDetails.unitNumber}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Invite email: <span className="font-semibold">{invitationDetails.renterEmail}</span>
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
              Full name
              <input
                type="text"
                required
                value={form.fullName}
                onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                placeholder="John Doe"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
              Email
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                placeholder="john@example.com"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
              Create password
              <input
                type="password"
                required
                minLength={6}
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                placeholder="••••••••"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
              Confirm password
              <input
                type="password"
                required
                minLength={6}
                value={form.confirmPassword}
                onChange={(e) => setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                placeholder="••••••••"
              />
            </label>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-full bg-emerald-600 px-6 py-3 text-base font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Creating account..." : "Create account & continue"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/renter/login" className="text-sm text-slate-500 hover:text-slate-900">
              Already have an account? Sign in
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <p className="text-sm text-slate-600">Loading registration...</p>
        </div>
      }
    >
      <RegisterPageContent />
    </Suspense>
  );
}
