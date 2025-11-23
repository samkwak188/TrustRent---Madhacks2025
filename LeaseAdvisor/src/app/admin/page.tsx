"use client";

import Image from "next/image";
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";

type PDFReport = {
  id: string;
  fileName: string;
  uploadedAt: string; // ISO timestamp
  dataUrl: string; // PDF as data URL or blob URL
  size?: number; // file size in bytes
};

type Renter = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  moveInDate?: string;
  moveOutDate?: string;
  pdfReport?: PDFReport; // uploaded PDF report
};

type Suite = {
  id: string;
  roomNumber: string; // e.g., "101", "2A"
  renters: Renter[];
};

type Floor = {
  id: string;
  floorNumber: string; // e.g., "1", "2", "Ground"
  suites: Suite[];
};

type Building = {
  id: string;
  name: string; // e.g., "The James"
  floors: Floor[];
};

// Mock data structure for demonstration
const mockData: Building[] = [
  {
    id: "b1",
    name: "The James",
    floors: [
      {
        id: "f1",
        floorNumber: "1",
        suites: [
          {
            id: "s1",
            roomNumber: "101",
            renters: [
              {
                id: "r1",
                name: "John Smith",
                email: "john.smith@example.com",
                phone: "555-0100",
                moveInDate: "2024-01-15",
                moveOutDate: undefined,
                pdfReport: {
                  id: "pdf1",
                  fileName: "inspection-report-101-john-smith.pdf",
                  uploadedAt: "2024-01-20T10:30:00Z",
                  dataUrl: "", // Would be actual PDF data in real app
                  size: 245678,
                },
              },
              {
                id: "r2",
                name: "Jane Doe",
                email: "jane.doe@example.com",
                phone: "555-0101",
                moveInDate: "2024-01-15",
                moveOutDate: undefined,
                pdfReport: {
                  id: "pdf2",
                  fileName: "inspection-report-101-jane-doe.pdf",
                  uploadedAt: "2024-01-20T11:15:00Z",
                  dataUrl: "",
                  size: 198432,
                },
              },
            ],
          },
          {
            id: "s2",
            roomNumber: "102",
            renters: [
              {
                id: "r3",
                name: "Bob Johnson",
                email: "bob.johnson@example.com",
                phone: "555-0102",
                moveInDate: "2024-02-01",
                moveOutDate: undefined,
                pdfReport: {
                  id: "pdf3",
                  fileName: "inspection-report-102-bob-johnson.pdf",
                  uploadedAt: "2024-02-05T14:20:00Z",
                  dataUrl: "",
                  size: 312456,
                },
              },
            ],
          },
        ],
      },
      {
        id: "f2",
        floorNumber: "2",
        suites: [
          {
            id: "s3",
            roomNumber: "201",
            renters: [
              {
                id: "r4",
                name: "Alice Williams",
                email: "alice.williams@example.com",
                phone: "555-0103",
                moveInDate: "2024-03-01",
                moveOutDate: undefined,
                pdfReport: undefined,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "b2",
    name: "The Madison",
    floors: [
      {
        id: "f1",
        floorNumber: "1",
        suites: [
          {
            id: "s1",
            roomNumber: "101",
            renters: [
              {
                id: "r1",
                name: "Michael Brown",
                email: "michael.brown@example.com",
                phone: "555-0200",
                moveInDate: "2024-01-10",
                moveOutDate: undefined,
                pdfReport: {
                  id: "pdf4",
                  fileName: "inspection-report-madison-101.pdf",
                  uploadedAt: "2024-01-18T09:45:00Z",
                  dataUrl: "",
                  size: 287654,
                },
              },
            ],
          },
          {
            id: "s2",
            roomNumber: "102",
            renters: [
              {
                id: "r2",
                name: "Sarah Davis",
                email: "sarah.davis@example.com",
                phone: "555-0201",
                moveInDate: "2024-01-20",
                moveOutDate: undefined,
                pdfReport: {
                  id: "pdf5",
                  fileName: "inspection-report-madison-102.pdf",
                  uploadedAt: "2024-01-25T16:30:00Z",
                  dataUrl: "",
                  size: 223891,
                },
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "b3",
    name: "The Parkview",
    floors: [
      {
        id: "f1",
        floorNumber: "Ground",
        suites: [
          {
            id: "s1",
            roomNumber: "G01",
            renters: [
              {
                id: "r1",
                name: "David Wilson",
                email: "david.wilson@example.com",
                phone: "555-0300",
                moveInDate: "2024-02-15",
                moveOutDate: undefined,
                pdfReport: {
                  id: "pdf6",
                  fileName: "inspection-report-parkview-g01.pdf",
                  uploadedAt: "2024-02-20T10:00:00Z",
                  dataUrl: "",
                  size: 345123,
                },
              },
            ],
          },
        ],
      },
      {
        id: "f2",
        floorNumber: "1",
        suites: [
          {
            id: "s2",
            roomNumber: "101",
            renters: [
              {
                id: "r2",
                name: "Emily Taylor",
                email: "emily.taylor@example.com",
                phone: "555-0301",
                moveInDate: "2024-03-10",
                moveOutDate: undefined,
                pdfReport: undefined,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "b4",
    name: "The Riverside",
    floors: [
      {
        id: "f1",
        floorNumber: "1",
        suites: [
          {
            id: "s1",
            roomNumber: "101",
            renters: [
              {
                id: "r1",
                name: "James Anderson",
                email: "james.anderson@example.com",
                phone: "555-0400",
                moveInDate: "2024-01-05",
                moveOutDate: undefined,
                pdfReport: {
                  id: "pdf7",
                  fileName: "inspection-report-riverside-101.pdf",
                  uploadedAt: "2024-01-12T13:20:00Z",
                  dataUrl: "",
                  size: 298765,
                },
              },
            ],
          },
        ],
      },
    ],
  },
];

function formatDateTimeLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminPage() {
  const router = useRouter();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedPDF, setSelectedPDF] = useState<{
    url: string;
    fileName: string;
  } | null>(null);
  const [data] = useState<Building[]>(mockData);

  // Check if user is logged in and is an admin
  useEffect(() => {
    if (typeof window === "undefined") return;
    const checkTimer = setTimeout(() => {
      const loggedIn = sessionStorage.getItem("clearmove-logged-in");
      const userType = sessionStorage.getItem("clearmove-user-type");
      
      // Check if user is logged in as admin
      if (loggedIn && userType === "admin") {
        console.log("User logged in as admin, access granted");
        return;
      }
      
      // No valid login or not admin, redirect to login
      console.log("No valid admin login found, redirecting to login");
      router.replace("/login");
    }, 200);
    
    return () => clearTimeout(checkTimer);
  }, [router]);

  const getKey = (
    buildingId: string,
    floorId?: string,
    suiteId?: string,
    renterId?: string
  ): string => {
    if (renterId) return `${buildingId}/${floorId}/${suiteId}/${renterId}`;
    if (suiteId) return `${buildingId}/${floorId}/${suiteId}`;
    if (floorId) return `${buildingId}/${floorId}`;
    return buildingId;
  };

  const toggleExpanded = (
    buildingId: string,
    floorId?: string,
    suiteId?: string,
    renterId?: string
  ) => {
    const key = getKey(buildingId, floorId, suiteId, renterId);
    setExpanded((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const isExpanded = (
    buildingId: string,
    floorId?: string,
    suiteId?: string,
    renterId?: string
  ): boolean => {
    const key = getKey(buildingId, floorId, suiteId, renterId);
    return expanded.has(key);
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return "Unknown size";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderRenter = (
    renter: Renter,
    suite: Suite,
    floorId: string,
    buildingId: string
  ) => {
    const renterExpanded = isExpanded(buildingId, floorId, suite.id, renter.id);

    return (
      <div key={renter.id} className="ml-6">
        <button
          type="button"
          onClick={() =>
            toggleExpanded(buildingId, floorId, suite.id, renter.id)
          }
          className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-2 text-left hover:bg-slate-100"
        >
          <div className="flex items-center gap-2">
            <span
              className={`text-xs transition-transform ${
                renterExpanded ? "rotate-90" : ""
              }`}
            >
              ▶
            </span>
            <div>
              <p className="text-xs font-semibold text-slate-900">
                {renter.name}
              </p>
              {renter.email && (
                <p className="text-[10px] text-slate-600">{renter.email}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-500">
            {renter.moveInDate && (
              <span>Move-in: {renter.moveInDate}</span>
            )}
            {renter.pdfReport && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700">
                PDF Report
              </span>
            )}
            {!renter.pdfReport && (
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-slate-600">
                No Report
              </span>
            )}
          </div>
        </button>

        {renterExpanded && (
          <div className="mt-2">
            {renter.pdfReport ? (
              <div className="ml-8 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <svg
                      className="h-5 w-5 text-red-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div>
                      <p className="text-xs font-semibold text-slate-900">
                        {renter.pdfReport.fileName}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Uploaded: {formatDateTimeLabel(renter.pdfReport.uploadedAt)} • {formatFileSize(renter.pdfReport.size)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      // In a real app, this would open the PDF in a viewer
                      // For now, we'll show a placeholder
                      if (!renter.pdfReport) return;
                      
                      if (renter.pdfReport.dataUrl) {
                        window.open(renter.pdfReport.dataUrl, "_blank");
                      } else {
                        setSelectedPDF({
                          url: renter.pdfReport.dataUrl || "",
                          fileName: renter.pdfReport.fileName,
                        });
                      }
                    }}
                    className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
                  >
                    View PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (renter.pdfReport?.dataUrl) {
                        const link = document.createElement("a");
                        link.href = renter.pdfReport.dataUrl;
                        link.download = renter.pdfReport.fileName;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }
                    }}
                    className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                  >
                    Download
                  </button>
                </div>
              </div>
            ) : (
              <div className="ml-8 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3">
                <p className="text-[11px] text-slate-500">
                  No inspection report uploaded yet
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderSuite = (suite: Suite, floorId: string, buildingId: string) => {
    const suiteExpanded = isExpanded(buildingId, floorId, suite.id);

    return (
      <div key={suite.id} className="ml-4">
        <button
          type="button"
          onClick={() => toggleExpanded(buildingId, floorId, suite.id)}
          className="mb-2 flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white p-2 text-left shadow-sm hover:bg-slate-50"
        >
          <div className="flex items-center gap-2">
            <span
              className={`text-xs transition-transform ${
                suiteExpanded ? "rotate-90" : ""
              }`}
            >
              ▶
            </span>
            <span className="text-sm font-semibold text-slate-900">
              Room {suite.roomNumber}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-600">
            <span>{suite.renters.length} renter{suite.renters.length !== 1 ? "s" : ""}</span>
          </div>
        </button>

        {suiteExpanded && (
          <div className="mt-2 space-y-3">
            {suite.renters.length > 0 && (
              <div>
                <h4 className="mb-2 ml-6 text-xs font-semibold uppercase tracking-wide text-slate-700">
                  Renters
                </h4>
                {suite.renters.map((renter) =>
                  renderRenter(renter, suite, floorId, buildingId)
                )}
              </div>
            )}
            {suite.renters.length === 0 && (
              <p className="ml-6 text-[11px] text-slate-500">
                No renters in this suite
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderFloor = (floor: Floor, buildingId: string) => {
    const floorExpanded = isExpanded(buildingId, floor.id);

    return (
      <div key={floor.id} className="ml-2">
        <button
          type="button"
          onClick={() => toggleExpanded(buildingId, floor.id)}
          className="mb-2 flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white p-3 text-left shadow-sm hover:bg-slate-50"
        >
          <div className="flex items-center gap-2">
            <span
              className={`text-xs transition-transform ${
                floorExpanded ? "rotate-90" : ""
              }`}
            >
              ▶
            </span>
            <span className="text-base font-semibold text-slate-900">
              Floor {floor.floorNumber}
            </span>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            {floor.suites.length} suite{floor.suites.length !== 1 ? "s" : ""}
          </span>
        </button>

        {floorExpanded && (
          <div className="mt-2 space-y-4">
            {floor.suites.map((suite) =>
              renderSuite(suite, floor.id, buildingId)
            )}
          </div>
        )}
      </div>
    );
  };

  const renderBuilding = (building: Building) => {
    const buildingExpanded = isExpanded(building.id);

    return (
      <div key={building.id} className="mb-6">
        <button
          type="button"
          onClick={() => toggleExpanded(building.id)}
          className="flex w-full items-center justify-between rounded-xl border border-slate-400 bg-white p-4 text-left shadow-md hover:bg-slate-50"
        >
          <div className="flex items-center gap-3">
            <span
              className={`text-sm transition-transform ${
                buildingExpanded ? "rotate-90" : ""
              }`}
            >
              ▶
            </span>
            <span className="text-xl font-bold text-slate-900">
              {building.name}
            </span>
          </div>
          <span className="rounded-full bg-slate-200 px-4 py-1.5 text-sm font-medium text-slate-700">
            {building.floors.length} floor{building.floors.length !== 1 ? "s" : ""}
          </span>
        </button>

        {buildingExpanded && (
          <div className="mt-4 space-y-6">
            {building.floors.map((floor) => renderFloor(floor, building.id))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 page-fade-in">
      <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-4 px-4 py-6 md:gap-8 md:px-8 md:py-10">
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-11 w-11 md:h-16 md:w-16">
              <Image
                src="/clearmove-logo.jpeg"
                alt="ClearMove logo"
                fill
                className="rounded-lg object-contain"
                priority
              />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight md:text-4xl">
                ClearMove
              </h1>
              <p className="text-xs font-medium text-slate-600 md:text-sm">
                Admin View
              </p>
            </div>
          </div>
        </header>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900 md:text-xl">
            Building & Room Management
          </h2>
          <p className="mb-6 text-xs text-slate-600 md:text-sm">
            View and manage PDF inspection reports uploaded by renters. Click to expand and view reports.
          </p>

          <div className="space-y-4">
            {data.map((building) => renderBuilding(building))}
          </div>
        </div>
      </main>

      {/* PDF Viewer Modal */}
      {selectedPDF && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <button
            type="button"
            className="absolute inset-0 h-full w-full cursor-zoom-out"
            onClick={() => setSelectedPDF(null)}
          />
          <div className="relative z-10 max-h-[90vh] w-full max-w-4xl rounded-2xl bg-black/90 p-3 shadow-2xl">
            <div className="mb-2 flex items-center justify-between gap-2 text-xs text-slate-200">
              <span className="truncate font-medium">
                {selectedPDF.fileName}
              </span>
              <button
                type="button"
                onClick={() => setSelectedPDF(null)}
                className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-slate-100 hover:bg-white/20"
              >
                Close
              </button>
            </div>
            <div className="flex items-center justify-center rounded-lg bg-white p-4">
              <iframe
                src={selectedPDF.url || undefined}
                className="h-[75vh] w-full rounded-lg"
                title={selectedPDF.fileName}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

