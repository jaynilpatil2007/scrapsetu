"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Lot = {
  id: string;
  lotNumber: string;
  description: string | null;
  approxWeight: number;
  status: string;
  confirmedCategory: string | null;
  confirmedSubcategory: string | null;
  aiCategory: string | null;
  aiSubcategory: string | null;
  estimatedMinValue: number | null;
  estimatedMaxValue: number | null;
  createdAt: string;
};

export default function CollectorDashboard() {
  const [lots, setLots] = useState<Lot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
  async function loadLots() {
    try {
      setError("");

      const response = await fetch("/api/lots", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to load lots",
        );
      }

      setLots(data.data?.lots ?? data.lots ?? []);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong",
      );
    } finally {
      setLoading(false);
    }
  }

  loadLots();

  const handleFocus = () => {
    loadLots();
  };

  window.addEventListener("focus", handleFocus);

  return () => {
    window.removeEventListener("focus", handleFocus);
  };
}, []);

  const completedLots = lots.filter(
    (lot) => lot.status === "COMPLETED",
  ).length;

  const totalEarned = lots
    .filter((lot) => lot.status === "COMPLETED")
    .reduce(
      (total, lot) => total + (lot.estimatedMaxValue ?? 0),
      0,
    );

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-neutral-400">
              ScrapSetu
            </p>

            <h1 className="mt-2 text-3xl font-semibold">
              Your e-waste
            </h1>

            <p className="mt-2 text-neutral-400">
              Track your lots and earnings.
            </p>
          </div>

          <Link
            href="/lots/new"
            className="rounded-xl bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-neutral-200"
          >
            + Add Lot
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-10 grid gap-4 sm:grid-cols-3">

          <StatCard
            label="Total Lots"
            value={lots.length}
          />

          <StatCard
            label="Completed"
            value={completedLots}
          />

          <StatCard
            label="Estimated Earnings"
            value={`₹${totalEarned.toLocaleString("en-IN")}`}
          />

        </div>

        {/* Lots */}
        <section className="mt-12">

          <div className="flex items-center justify-between">
            <h2 className="text-xl font-medium">
              Your Lots
            </h2>

            <span className="text-sm text-neutral-500">
              {lots.length} total
            </span>
          </div>

          {loading && (
            <div className="mt-6 text-sm text-neutral-500">
              Loading your lots...
            </div>
          )}

          {error && (
            <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
              {error}
            </div>
          )}

          {!loading && !error && lots.length === 0 && (
            <div className="mt-6 rounded-2xl border border-dashed border-neutral-800 p-10 text-center">
              <p className="text-neutral-400">
                No e-waste lots yet.
              </p>

              <Link
                href="/lots/new"
                className="mt-4 inline-block text-sm underline underline-offset-4"
              >
                Create your first lot
              </Link>
            </div>
          )}

          <div className="mt-6 grid gap-4">
            {lots.map((lot) => {
              const category =
                lot.confirmedCategory ??
                lot.aiCategory ??
                "Unknown material";

              const subcategory =
                lot.confirmedSubcategory ??
                lot.aiSubcategory;

              return (
                <Link
                  key={lot.id}
                  href={`/lots/${lot.id}`}
                  className="group rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 transition hover:border-neutral-600"
                >
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium">
                          {category}
                        </h3>

                        <StatusBadge status={lot.status} />
                      </div>

                      {subcategory && (
                        <p className="mt-1 text-sm text-neutral-400">
                          {subcategory}
                        </p>
                      )}

                      <p className="mt-3 text-sm text-neutral-500">
                        {lot.lotNumber} · {lot.approxWeight} kg
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      {lot.estimatedMinValue != null &&
                      lot.estimatedMaxValue != null ? (
                        <>
                          <p className="text-lg font-medium">
                            ₹
                            {lot.estimatedMinValue.toLocaleString(
                              "en-IN",
                            )}
                            {" – "}
                            ₹
                            {lot.estimatedMaxValue.toLocaleString(
                              "en-IN",
                            )}
                          </p>

                          <p className="text-xs text-neutral-500">
                            Estimated value
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-neutral-500">
                          Price not estimated
                        </p>
                      )}
                    </div>

                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5">
      <p className="text-sm text-neutral-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-semibold">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  return (
    <span className="rounded-full border border-neutral-700 px-2.5 py-1 text-[11px] uppercase tracking-wide text-neutral-400">
      {status.replaceAll("_", " ")}
    </span>
  );
}