"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-soft text-slate-900 page-fade-in">
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center px-4 py-16">
        <div className="w-full">
          {/* Logo and Header */}
          <div className="mb-8 flex flex-col items-center gap-4">
            <div className="relative h-28 w-28 md:h-32 md:w-32">
              <Image
                src="/Trust2-removebg-preview.png"
                alt="TrustRent logo"
                fill
                className="rounded-2xl object-contain"
                priority
              />
            </div>
            <div className="text-center">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
                TrustRent Access
              </h1>
              <p className="mt-1 text-sm text-slate-600 md:text-base">
                We use invitation-only access to keep renter evidence secure.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-sky-50 p-6 shadow-sm md:p-8">
              <h2 className="text-xl font-semibold text-slate-900">
                For property managers
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                TrustRent now onboards buildings via a verified company profile.
                Upload every apartment community, list the units you manage, and
                we&apos;ll email renters a unique code so only invited tenants
                can submit evidence.
              </p>
              <div className="mt-4 space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">
                  How it works:
                </p>
                <ol className="list-decimal space-y-2 pl-5">
                  <li>Create your company profile and enter each building/unit.</li>
                  <li>Attach renter names + emails so we can generate secure codes.</li>
                  <li>Renters receive secure access tokens and gain access to the app.</li>
                  <li>Admins monitor every renter’s PDF from the dashboard.</li>
                </ol>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/admin/signup"
                  className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Create admin account
                </Link>
                <Link
                  href="/admin/login"
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Admin login
                </Link>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-emerald-50 p-6 shadow-sm md:p-8">
              <h2 className="text-xl font-semibold text-slate-900">
                For renters with an invite
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Your property manager will email you a unique 6-digit access token.
                Enter it to create your account and access the inspection checklist.
              </p>
              <div className="mt-4 space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">
                  How it works:
                </p>
                <ol className="list-decimal space-y-2 pl-5">
                  <li>Check your email for a 6-digit token (e.g., "123456")</li>
                  <li>Click "Enter access token" below</li>
                  <li>Create your account with name, email, and password</li>
                  <li>Access your inspection checklist immediately</li>
                </ol>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/access"
                  className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Enter access token
                </Link>
                <Link
                  href="/renter/login"
                  className="inline-flex items-center justify-center rounded-full border border-emerald-600 bg-white px-5 py-2 text-sm font-semibold text-emerald-600 hover:bg-emerald-50"
                >
                  Renter login
                </Link>
              </div>
            </section>

            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
              <p className="font-semibold">Need help?</p>
              <p className="mt-1">
                If you were expecting an invitation but never received one,
                please contact your property manager. To request a new company
                profile, email support@trustrent.app with your legal business name.
              </p>
            </section>
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

