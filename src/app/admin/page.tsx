"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type PendingInvitation = {
  invitationId: string;
  renterName: string;
  renterEmail: string;
  unitNumber: string;
  accessToken: string; // Simple 6-digit token
  status: string;
  createdAt: number;
};

type ActiveRenter = {
  renterId: string;
  fullName: string;
  email: string;
  phone: string | null;
  unitNumber: string;
  moveInDate: string | null;
  moveOutDate: string | null;
  submission: {
    submissionId: string;
    fileName: string;
    submittedAt: number;
    pdfSize: number | null;
    downloadPath: string;
  } | null;
};

type ApartmentDashboard = {
  apartmentId: string;
  apartmentName: string;
  postalCode: string;
  pendingInvitations: PendingInvitation[];
  pastInvitations: PendingInvitation[];
  activeRenters: ActiveRenter[];
};

type DashboardData = {
  companyName: string | null;
  apartments: ApartmentDashboard[];
};

function formatDateTimeLabel(value?: string | number | null): string {
  if (!value && value !== 0) return "—";
  const date =
    typeof value === "number" ? new Date(value) : new Date(value ?? "");
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFileSize(bytes?: number | null): string {
  if (!bytes || Number.isNaN(bytes)) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData>({ companyName: null, apartments: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [authChecked, setAuthChecked] = useState(false);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [collapsedPastInvites, setCollapsedPastInvites] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/admin/me");
        if (!res.ok) {
          throw new Error("unauthorized");
        }
        const result = await res.json();
        if (active) {
          setAdminEmail(result.admin.email);
          setAuthChecked(true);
        }
      } catch {
        router.replace("/admin/login");
      }
    })();
    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    if (!authChecked) return;
    let aborted = false;
    async function fetchDashboard() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/renters");
        const payload = await res.json();
        if (!res.ok) {
          throw new Error(payload.error || "Failed to load dashboard data.");
        }
        if (!aborted) {
          setData({
            companyName: payload.companyName ?? null,
            apartments: Array.isArray(payload.apartments) ? payload.apartments : [],
          });
        }
      } catch (err: any) {
        if (!aborted) {
          setError(
            err?.message ||
              "Unable to load dashboard right now. Please try again."
          );
        }
      } finally {
        if (!aborted) {
          setIsLoading(false);
        }
      }
    }
    fetchDashboard();
    return () => {
      aborted = true;
    };
  }, [refreshKey, authChecked]);

  const stats = useMemo(() => {
    let pendingCount = 0;
    let activeCount = 0;
    let submissionCount = 0;
    data.apartments.forEach((apt) => {
      pendingCount += apt.pendingInvitations.filter(
        (inv) => inv.status === "pending"
      ).length;
      activeCount += apt.activeRenters.length;
      submissionCount += apt.activeRenters.filter((r) => r.submission).length;
    });
    return { pendingCount, activeCount, submissionCount };
  }, [data]);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <main className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-4">
          <p className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
            Checking admin session…
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-8 md:px-8">
        <header className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative h-14 w-14 md:h-16 md:w-16">
                <Image
                  src="/Trust2-removebg-preview.png"
                  alt="TrustRent logo"
                  fill
                  className="rounded-xl object-contain"
                  priority
                />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                  TrustRent Admin
                </h1>
                {data.companyName && (
                  <p className="text-sm font-medium text-slate-600">
                    {data.companyName}
                  </p>
                )}
                <p className="text-xs text-slate-500">{adminEmail}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setRefreshKey((k) => k + 1)}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Refresh
              </button>
              <button
                type="button"
                onClick={async () => {
                  await fetch("/api/admin/logout", { method: "POST" });
                  router.replace("/admin/login");
                }}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
              >
                Sign out
              </button>
            </div>
          </div>

          {/* Dashboard / Buildings slider */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-1 rounded-full bg-slate-100 p-1 text-xs font-semibold text-slate-600">
              <button
                type="button"
                className="flex-1 rounded-full bg-white px-3 py-1.5 text-center text-slate-900 shadow-sm"
              >
                Dashboard
              </button>
              <button
                type="button"
                onClick={() => router.push("/company/register")}
                className="flex-1 rounded-full px-3 py-1.5 text-center hover:bg-white/70 hover:text-slate-900"
              >
                Buildings & renters
              </button>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Pending invites
            </p>
            <p className="mt-2 text-3xl font-bold text-amber-600">
              {stats.pendingCount}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Awaiting renter acceptance
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Active renters
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {stats.activeCount}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Registered & ready
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              PDFs received
            </p>
            <p className="mt-2 text-3xl font-bold text-emerald-600">
              {stats.submissionCount}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Inspection reports submitted
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-slate-500">Loading dashboard…</p>
          </div>
        ) : data.apartments.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <h2 className="text-xl font-semibold text-slate-900">
              No properties registered yet
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Add your first apartment community and invite renters to get started.
            </p>
            <Link
              href="/company/register"
              className="mt-4 rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Register your portfolio
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {data.apartments.map((apartment) => {
              const isPastCollapsed =
                collapsedPastInvites[apartment.apartmentId] ?? false;
              const totalInApartment =
                apartment.pendingInvitations.length +
                apartment.activeRenters.length;

              return (
                <div
                  key={apartment.apartmentId}
                  className="rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-bold text-slate-900">
                          {apartment.apartmentName}
                        </h3>
                        <p className="text-xs text-slate-500">
                          {apartment.postalCode} · {totalInApartment} renter
                          {totalInApartment !== 1 ? "s" : ""} (
                          {apartment.pendingInvitations.length} pending,{" "}
                          {apartment.activeRenters.length} active)
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    {apartment.pendingInvitations.length > 0 && (
                      <div className="mb-6">
                        <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-amber-700">
                          Pending invitations ({apartment.pendingInvitations.length})
                        </h4>
                        <div className="space-y-3">
                          {apartment.pendingInvitations.map((inv) => (
                            <div
                              key={inv.invitationId}
                              className="rounded-lg border border-amber-200 bg-amber-50 p-4"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="flex-1">
                                  <p className="text-sm font-semibold text-slate-900">
                                    {inv.renterName}
                                  </p>
                                  <p className="text-xs text-slate-600">
                                    {inv.renterEmail} · Unit {inv.unitNumber}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    Sent {formatDateTimeLabel(inv.createdAt)}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="rounded-lg bg-white px-4 py-2 font-mono text-xl font-bold tracking-widest text-amber-700">
                                    {inv.accessToken}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const confirmed = window.confirm(
                                        `Withdraw invite for ${inv.renterEmail}? They will no longer be able to use this token.`
                                      );
                                      if (!confirmed) return;
                                      try {
                                        const res = await fetch(
                                          "/api/portfolio/withdraw-invite",
                                          {
                                            method: "POST",
                                            headers: {
                                              "Content-Type": "application/json",
                                            },
                                            body: JSON.stringify({
                                              invitationId: inv.invitationId,
                                            }),
                                          }
                                        );
                                        const data = await res.json();
                                        if (!res.ok) {
                                          throw new Error(
                                            data.error ||
                                              "Failed to withdraw invitation"
                                          );
                                        }
                                        setRefreshKey((k) => k + 1);
                                      } catch (err) {
                                        console.error(err);
                                        window.alert(
                                          err instanceof Error
                                            ? err.message
                                            : "Failed to withdraw invitation."
                                        );
                                      }
                                    }}
                                    className="rounded-full border border-amber-300 px-3 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                                  >
                                    Withdraw
                                  </button>
                                </div>
                              </div>
                              <div className="mt-3 rounded-lg border border-amber-200 bg-white p-3 text-xs">
                                <p className="text-slate-600">
                                  <strong>Renter instructions:</strong> Go to{" "}
                                  <span className="font-mono text-emerald-600">
                                    clearmove.app/access
                                  </span>{" "}
                                  and enter token{" "}
                                  <span className="font-mono font-bold">
                                    {inv.accessToken}
                                  </span>
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {apartment.pastInvitations.length > 0 && (
                      <div className="mb-6">
                        <div className="mb-2 flex items-center justify-between">
                          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Past invitations ({apartment.pastInvitations.length})
                          </h4>
                          <button
                            type="button"
                            onClick={() =>
                              setCollapsedPastInvites((prev) => ({
                                ...prev,
                                [apartment.apartmentId]: !isPastCollapsed,
                              }))
                            }
                            className="text-[11px] font-medium text-slate-500 hover:text-slate-800"
                          >
                            {isPastCollapsed ? "Show" : "Hide"}
                          </button>
                        </div>
                        {!isPastCollapsed && (
                          <div className="space-y-2">
                            {apartment.pastInvitations.map((inv) => (
                              <div
                                key={inv.invitationId}
                                className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                              >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div className="flex-1">
                                    <p className="text-sm font-semibold text-slate-900">
                                      {inv.renterName}
                                    </p>
                                    <p className="text-xs text-slate-600">
                                      {inv.renterEmail} · Unit {inv.unitNumber}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500">
                                      Token used {formatDateTimeLabel(inv.createdAt)}
                                    </p>
                                  </div>
                                  <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700">
                                    {inv.status || "used"}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {apartment.activeRenters.length > 0 && (
                      <div className="rounded-xl border-2 border-emerald-700 bg-emerald-50 p-4">
                        <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-emerald-800">
                          Active renters ({apartment.activeRenters.length})
                        </h4>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-slate-200 text-sm">
                            <thead className="bg-white">
                              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                                <th className="px-4 py-3 font-semibold">
                                  Renter
                                </th>
                                <th className="px-4 py-3 font-semibold">Unit</th>
                                <th className="px-4 py-3 font-semibold">
                                  Move-in
                                </th>
                                <th className="px-4 py-3 font-semibold">
                                  Latest PDF
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                              {apartment.activeRenters.map((renter) => (
                                <tr
                                  key={renter.renterId}
                                  className="hover:bg-slate-50"
                                >
                                  <td className="px-4 py-3">
                                    <p className="font-semibold text-slate-900">
                                      {renter.fullName}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                      {renter.email}
                                    </p>
                                    {renter.phone && (
                                      <p className="text-xs text-slate-400">
                                        {renter.phone}
                                      </p>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 font-semibold text-slate-700">
                                    {renter.unitNumber}
                                  </td>
                                  <td className="px-4 py-3 text-xs text-slate-600">
                                    {renter.moveInDate
                                      ? formatDateTimeLabel(renter.moveInDate)
                                      : "—"}
                                  </td>
                                  <td className="px-4 py-3">
                                    {renter.submission ? (
                                      <div className="flex flex-col gap-1">
                                        <div>
                                          <p className="text-xs font-semibold text-emerald-700">
                                            Submitted{" "}
                                            {formatDateTimeLabel(
                                              renter.submission.submittedAt
                                            )}
                                          </p>
                                          <p className="text-xs text-slate-500">
                                            {renter.submission.fileName} ·{" "}
                                            {formatFileSize(
                                              renter.submission.pdfSize
                                            )}
                                          </p>
                                        </div>
                                        <div className="mt-1 flex flex-wrap gap-2">
                                          <a
                                            href={renter.submission.downloadPath}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                                          >
                                            View PDF
                                          </a>
                                          <a
                                            href={renter.submission.downloadPath}
                                            download={renter.submission.fileName}
                                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                          >
                                            Download PDF
                                          </a>
                                        </div>
                                      </div>
                                    ) : (
                                      <span className="inline-block rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-600">
                                        No PDF submitted yet
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {apartment.pendingInvitations.length === 0 &&
                      apartment.activeRenters.length === 0 &&
                      apartment.pastInvitations.length === 0 && (
                        <p className="py-6 text-center text-sm text-slate-500">
                          No renters or invitations for this building yet.
                        </p>
                      )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
