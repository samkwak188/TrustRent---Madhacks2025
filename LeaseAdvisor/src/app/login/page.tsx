"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";

type UserType = "renter" | "admin";

export default function LoginPage() {
  const [userType, setUserType] = useState<UserType>("renter");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Simple validation
    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password");
      setIsLoading(false);
      return;
    }

    // Simulate login (in real app, this would call an API)
    // For demo purposes, we'll just redirect based on user type
    setTimeout(() => {
      setIsLoading(false);
      
      // Store user type in sessionStorage for the protected pages to check
      if (typeof window !== "undefined") {
        sessionStorage.setItem("clearmove-user-type", userType);
        sessionStorage.setItem("clearmove-user-email", email);
        const timestamp = Date.now().toString();
        sessionStorage.setItem("clearmove-logged-in", timestamp);
      }

      // Redirect based on user type
      if (userType === "renter") {
        // Set navigation flag for renter page
        sessionStorage.setItem("clearmove-navigated-from-landing", Date.now().toString());
        router.push("/app");
      } else {
        // Admin goes to admin page
        router.push("/admin");
      }
    }, 500); // Simulate API call delay
  };

  return (
    <div className="min-h-screen bg-gradient-soft text-slate-900 page-fade-in">
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-8">
        <div className="w-full">
          {/* Logo and Header */}
          <div className="mb-8 flex flex-col items-center gap-4">
            <div className="relative h-16 w-16 md:h-20 md:w-20">
              <Image
                src="/clearmove-logo.jpeg"
                alt="ClearMove logo"
                fill
                className="rounded-2xl object-contain"
                priority
              />
            </div>
            <div className="text-center">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
                ClearMove
              </h1>
              <p className="mt-1 text-xs font-medium uppercase tracking-[0.15em] text-slate-600 md:text-sm">
                Sign in to continue
              </p>
            </div>
          </div>

          {/* Login Form */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            {/* User Type Selection */}
            <div className="mb-6">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                I am a:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setUserType("renter")}
                  className={`rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all ${
                    userType === "renter"
                      ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                      />
                    </svg>
                    <span>Renter</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setUserType("admin")}
                  className={`rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all ${
                    userType === "admin"
                      ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                    <span>Admin</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-xs font-semibold text-slate-700"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  required
                  disabled={isLoading}
                />
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-xs font-semibold text-slate-700"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  required
                  disabled={isLoading}
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="h-4 w-4 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        fill="currentColor"
                      />
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  "Sign in"
                )}
              </button>
            </form>

            {/* Demo Note */}
            <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
              <p className="font-semibold">Demo Mode</p>
              <p className="mt-0.5">
                This is a demo. Enter any email and password to continue. The
                system will route you based on your selected role.
              </p>
            </div>
          </div>

          {/* Back to Landing */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              ← Back to home
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

