"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type RenterInput = {
  id: string;
  fullName: string;
  email: string;
  accessToken?: string; // Loaded from DB after save
};

type UnitInput = {
  id: string;
  unitNumber: string;
  renters: RenterInput[];
};

type ApartmentInput = {
  id: string;
  name: string;
  postalCode: string;
  units: UnitInput[];
};

type CompanyFormState = {
  companyName: string;
  contactEmail: string;
  apartments: ApartmentInput[];
};

const createId = () => crypto.randomUUID();

const createEmptyRenter = (): RenterInput => ({
  id: createId(),
  fullName: "",
  email: "",
});

const createEmptyUnit = (): UnitInput => ({
  id: createId(),
  unitNumber: "",
  renters: [createEmptyRenter()],
});

const createEmptyApartment = (): ApartmentInput => ({
  id: createId(),
  name: "",
  postalCode: "",
  units: [createEmptyUnit()],
});

type AdminInfo = {
  email: string;
};

export default function CompanyRegistrationPage() {
  const router = useRouter();
  const [form, setForm] = useState<CompanyFormState>({
    companyName: "",
    contactEmail: "",
    apartments: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [adminInfo, setAdminInfo] = useState<AdminInfo | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/admin/me");
        if (!res.ok) {
          throw new Error("not authorized");
        }
        const data = await res.json();
        if (active) {
          setAdminInfo(data.admin);
        }
      } catch {
        if (active) {
          setAdminInfo(null);
        }
      } finally {
        if (active) setAuthChecked(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Load existing portfolio when authenticated
  useEffect(() => {
    if (!authChecked || !adminInfo) return;
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/portfolio/load");
        if (!res.ok) return;
        const data = await res.json();
        if (active && data.apartments && data.apartments.length > 0) {
          setForm({
            companyName: data.companyName || "",
            contactEmail: data.contactEmail || "",
            apartments: data.apartments.map((apt: any) => ({
              id: apt.id,
              name: apt.name,
              postalCode: apt.postalCode,
              units: apt.units.map((unit: any) => ({
                id: unit.id,
                unitNumber: unit.unitNumber,
                renters: unit.renters.map((renter: any) => ({
                  id: renter.id,
                  fullName: renter.fullName,
                  email: renter.email,
                  accessToken: renter.accessToken,
                })),
              })),
            })),
          });
        }
      } catch (err) {
        console.error("Failed to load portfolio", err);
      }
    })();
    return () => {
      active = false;
    };
  }, [authChecked, adminInfo]);

  // If not authenticated as admin, send user back to main access page
  useEffect(() => {
    if (!authChecked) return;
    if (!adminInfo) {
      router.replace("/login");
    }
  }, [authChecked, adminInfo, router]);

  function copyToClipboard(value: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(value);
      return;
    }
    if (typeof window !== "undefined") {
      window.prompt("Copy this link", value);
    }
  }

  function updateApartment(
    apartmentId: string,
    updates: Partial<Omit<ApartmentInput, "id" | "units">>
  ) {
    setForm((prev) => ({
      ...prev,
      apartments: prev.apartments.map((apt) =>
        apt.id === apartmentId ? { ...apt, ...updates } : apt
      ),
    }));
  }

  function updateUnit(
    apartmentId: string,
    unitId: string,
    updates: Partial<Omit<UnitInput, "id" | "renters">>
  ) {
    setForm((prev) => ({
      ...prev,
      apartments: prev.apartments.map((apt) => {
        if (apt.id !== apartmentId) return apt;
        return {
          ...apt,
          units: apt.units.map((unit) =>
            unit.id === unitId ? { ...unit, ...updates } : unit
          ),
        };
      }),
    }));
  }

  function updateRenter(
    apartmentId: string,
    unitId: string,
    renterId: string,
    updates: Partial<Omit<RenterInput, "id">>
  ) {
    setForm((prev) => ({
      ...prev,
      apartments: prev.apartments.map((apt) => {
        if (apt.id !== apartmentId) return apt;
        return {
          ...apt,
          units: apt.units.map((unit) => {
            if (unit.id !== unitId) return unit;
            return {
              ...unit,
              renters: unit.renters.map((renter) =>
                renter.id === renterId ? { ...renter, ...updates } : renter
              ),
            };
          }),
        };
      }),
    }));
  }

  function addApartment() {
    setForm((prev) => ({
      ...prev,
      apartments: [...prev.apartments, createEmptyApartment()],
    }));
  }

  function removeApartment(apartmentId: string) {
    setForm((prev) => ({
      ...prev,
      apartments: prev.apartments.filter((apt) => apt.id !== apartmentId),
    }));
  }

  function addUnit(apartmentId: string) {
    setForm((prev) => ({
      ...prev,
      apartments: prev.apartments.map((apt) =>
        apt.id === apartmentId
          ? { ...apt, units: [...apt.units, createEmptyUnit()] }
          : apt
      ),
    }));
  }

  function removeUnit(apartmentId: string, unitId: string) {
    setForm((prev) => ({
      ...prev,
      apartments: prev.apartments.map((apt) => {
        if (apt.id !== apartmentId) return apt;
        if (apt.units.length <= 1) return apt;
        return {
          ...apt,
          units: apt.units.filter((unit) => unit.id !== unitId),
        };
      }),
    }));
  }

  function addRenter(apartmentId: string, unitId: string) {
    setForm((prev) => ({
      ...prev,
      apartments: prev.apartments.map((apt) => {
        if (apt.id !== apartmentId) return apt;
        return {
          ...apt,
          units: apt.units.map((unit) =>
            unit.id === unitId
              ? { ...unit, renters: [...unit.renters, createEmptyRenter()] }
              : unit
          ),
        };
      }),
    }));
  }

  function removeRenter(apartmentId: string, unitId: string, renterId: string) {
    setForm((prev) => ({
      ...prev,
      apartments: prev.apartments.map((apt) => {
        if (apt.id !== apartmentId) return apt;
        return {
          ...apt,
          units: apt.units.map((unit) => {
            if (unit.id !== unitId) return unit;
            if (unit.renters.length <= 1) return unit;
            return {
              ...unit,
              renters: unit.renters.filter((renter) => renter.id !== renterId),
            };
          }),
        };
      }),
    }));
  }

  function buildSavePayload(current: CompanyFormState) {
    return {
      companyName: current.companyName.trim(),
      contactEmail: current.contactEmail.trim() || undefined,
      apartments: current.apartments.map((apt) => ({
        id: apt.id,
        name: apt.name.trim(),
        postalCode: apt.postalCode.trim(),
        units: apt.units.map((unit) => ({
          id: unit.id,
          unitNumber: unit.unitNumber.trim(),
          renters: unit.renters.map((renter) => ({
            id: renter.id,
            fullName: renter.fullName.trim(),
            email: renter.email.trim(),
          })),
        })),
      })),
    };
  }

  async function handleSaveChanges(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const payload = buildSavePayload(form);
      const response = await fetch("/api/portfolio/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Save failed");
      }

      setSuccessMessage("Portfolio saved successfully. Use the 'Send invites' buttons to email renters.");
    } catch (error) {
      setServerError(
        error instanceof Error
          ? error.message
          : "Something went wrong while saving. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function savePortfolioSilently(): Promise<boolean> {
    try {
      const payload = buildSavePayload(form);
      const response = await fetch("/api/portfolio/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        console.error("Silent save before sending invites failed", data);
        return false;
      }
      return true;
    } catch (error) {
      console.error("Silent save before sending invites failed", error);
      return false;
    }
  }

  async function handleSendInvites(unitId: string, unitLabel: string) {
    try {
      // Ensure the latest changes (including this unit) are saved
      const saved = await savePortfolioSilently();
      if (!saved) {
        alert(
          `❌ Failed to send invites for ${unitLabel}: please fix any errors and click "Save changes" first.`
        );
        return;
      }

      const response = await fetch("/api/portfolio/send-invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unitId }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to send invites");
      }
      alert(
        `✅ Sent ${data.sent} invitation${data.sent !== 1 ? "s" : ""} for ${unitLabel}${
          data.failed > 0 ? `. ${data.failed} failed.` : ""
        }`
      );
    } catch (error) {
      alert(
        `❌ Failed to send invites for ${unitLabel}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-8 md:gap-8 md:px-8">
        {!authChecked || !adminInfo ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
            Redirecting to admin access…
          </div>
        ) : (
          <>
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
                    <p className="text-sm font-medium text-slate-600">
                      {form.companyName || "Buildings & renters"}
                    </p>
                    <p className="text-xs text-slate-500">{adminInfo.email}</p>
                  </div>
                </div>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await fetch("/api/admin/logout", { method: "POST" });
                    router.replace("/login");
                  }}
                >
                  <button
                    type="submit"
                    className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Sign out
                  </button>
                </form>
              </div>

              {/* Dashboard / Buildings slider */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-1 rounded-full bg-slate-100 p-1 text-xs font-semibold text-slate-600">
                  <button
                    type="button"
                    onClick={() => router.push("/admin")}
                    className="flex-1 rounded-full px-3 py-1.5 text-center hover:bg-white/70 hover:text-slate-900"
                  >
                    Dashboard
                  </button>
                  <button
                    type="button"
                    className="flex-1 rounded-full bg-white px-3 py-1.5 text-center text-slate-900 shadow-sm"
                  >
                    Buildings & renters
                  </button>
                </div>
              </div>
            </header>

        <header className="mt-4 flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Rental company onboarding
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Register your portfolio and pre-authorize renters
          </h1>
          <p className="text-sm text-slate-600 md:text-base">
            Add every apartment community, list the units you manage, and link
            each unit to the renters you expect. We&apos;ll create secure invite
            links and one-time codes so tenants can verify themselves before
            accessing the evidence vault.
          </p>
        </header>

        <form
          onSubmit={handleSaveChanges}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-700 md:text-sm">
              Company name
              <input
                type="text"
                required
                value={form.companyName}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    companyName: event.target.value,
                  }))
                }
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-200"
                placeholder="Highland Property Group"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-700 md:text-sm">
              Contact email (optional)
              <input
                type="email"
                value={form.contactEmail}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    contactEmail: event.target.value,
                  }))
                }
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-200"
                placeholder="ops@highland.example"
              />
            </label>
          </div>

          <div className="mt-8 space-y-6">
            {form.apartments.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
                <p className="text-base font-semibold text-slate-800">
                  Start by adding your first apartment community
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Once you add a building, we'll open up the units and renter fields automatically.
                </p>
                <button
                  type="button"
                  onClick={addApartment}
                  className="mt-4 rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  + Add apartment community
                </button>
              </div>
            ) : (
              form.apartments.map((apartment, apartmentIndex) => (
                <div
                  key={apartment.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      required
                      value={apartment.name}
                      onChange={(event) =>
                        updateApartment(apartment.id, {
                          name: event.target.value,
                        })
                      }
                      className="w-full rounded-lg border-2 border-slate-300 bg-white px-4 py-2 text-xl font-bold text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                      placeholder={`Apartment ${apartmentIndex + 1}`}
                    />
                    <p className="mt-2 text-xs text-slate-500">
                      Add building details and the units you manage.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeApartment(apartment.id)}
                    className="text-xs text-slate-400 hover:text-red-500"
                  >
                    Remove building
                  </button>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
                    Postal / ZIP code
                    <input
                      type="text"
                      required
                      value={apartment.postalCode}
                      onChange={(event) =>
                        updateApartment(apartment.id, {
                          postalCode: event.target.value,
                        })
                      }
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-200"
                      placeholder="10001"
                    />
                  </label>
                  <div className="hidden md:block" />
                </div>

                <div className="mt-4 space-y-4 rounded-lg border border-emerald-700 bg-emerald-50 p-3">
                  {apartment.units.map((unit, unitIndex) => (
                    <div
                      key={unit.id}
                      className="rounded-lg border-2 border-emerald-700 bg-white p-3"
                    >
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-slate-800">
                          Unit {unitIndex + 1} {unit.unitNumber && `(${unit.unitNumber})`}
                        </span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              handleSendInvites(
                                unit.id,
                                `${apartment.name} Unit ${unit.unitNumber}`
                              )
                            }
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                            disabled={unit.renters.length === 0 || !unit.unitNumber.trim()}
                          >
                            Send invites
                          </button>
                          <button
                            type="button"
                            onClick={() => removeUnit(apartment.id, unit.id)}
                            className="text-xs text-slate-400 hover:text-red-500"
                            disabled={apartment.units.length <= 1}
                          >
                            Remove unit
                          </button>
                        </div>
                      </div>
                      <label className="mb-3 flex flex-col gap-1 text-xs font-medium text-slate-700">
                        Unit / suite number
                        <input
                          type="text"
                          required
                          value={unit.unitNumber}
                          onChange={(event) =>
                            updateUnit(apartment.id, unit.id, {
                              unitNumber: event.target.value,
                            })
                          }
                          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-200"
                          placeholder="12B"
                        />
                      </label>

                      <div className="space-y-3">
                        {unit.renters.map((renter, renterIndex) => (
                          <div
                            key={renter.id}
                            className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                          >
                            <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-600">
                              <span>Renter {renterIndex + 1}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  removeRenter(apartment.id, unit.id, renter.id)
                                }
                                className="text-[11px] text-slate-400 hover:text-red-500"
                                disabled={unit.renters.length <= 1}
                              >
                                Remove
                              </button>
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                              <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
                                Renter full name
                                <input
                                  type="text"
                                  required
                                  value={renter.fullName}
                                  onChange={(event) =>
                                    updateRenter(apartment.id, unit.id, renter.id, {
                                      fullName: event.target.value,
                                    })
                                  }
                                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-200"
                                  placeholder="Jane Doe"
                                />
                              </label>
                              <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
                                Renter email
                                <input
                                  type="email"
                                  required
                                  value={renter.email}
                                  onChange={(event) =>
                                    updateRenter(apartment.id, unit.id, renter.id, {
                                      email: event.target.value,
                                    })
                                  }
                                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-200"
                                  placeholder="jane@example.com"
                                />
                              </label>
                            </div>
                            {renter.accessToken && (
                              <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                                <p className="text-xs text-slate-600">
                                  Access Token:{" "}
                                  <span className="font-mono text-sm font-bold text-emerald-700">
                                    {renter.accessToken}
                                  </span>
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => addRenter(apartment.id, unit.id)}
                          className="w-full rounded-lg border border-dashed border-slate-300 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
                        >
                          + Add another renter for this unit
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addUnit(apartment.id)}
                    className="w-full rounded-lg border border-slate-300 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                  >
                    + Add another unit in this building
                  </button>
                </div>
              </div>
            ))
            )}
          </div>

          {form.apartments.length > 0 && (
            <div className="mt-4">
              <button
                type="button"
                onClick={addApartment}
                className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                + Add another apartment community
              </button>
            </div>
          )}

          {serverError && (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {serverError}
            </p>
          )}

          {successMessage && (
            <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              {successMessage}
            </p>
          )}

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting || form.apartments.length === 0}
              className="rounded-full bg-slate-900 px-6 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {form.apartments.length === 0
                ? "Add at least one apartment"
                : isSubmitting
                ? "Saving…"
                : "Save changes"}
            </button>
          </div>
        </form>

          </>
        )}
      </main>
    </div>
  );
}

