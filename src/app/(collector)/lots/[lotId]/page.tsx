"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type Material = {
  id: string;
  category: string;
  subcategory: string | null;
  unit: string;
};

type LotImage = {
  id: string;
  url: string;
};

type Recycler = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  address?: string | null;
  offeredRate: number;
  unit?: string;
  estimatedAmount: number;
  pickupAvailable?: boolean;
  serviceRadiusKm?: number | null;
  authorizationStatus?: string;
};

type Quote = {
  id: string;
  quotedPrice: number;
  quotedTotal: number | null;
  status: string;
  expiresAt: string | null;
  recycler: {
    id: string;
    name: string;
    city: string | null;
    state: string | null;
  };
};

type Transaction = {
  id: string;
  transactionNumber: string;
  quotedPrice: number | null;
  finalPrice: number;
  quotedWeight: number | null;
  finalWeight: number | null;
  paymentMethod: string;
  paymentStatus: string;
  completedAt: string | null;
  payout?: {
    id: string;
    amount: number;
    method: string;
    provider: string | null;
    providerPayoutId: string | null;
    status: string;
  } | null;
};

type Handover = {
  id: string;
  weight: number;
  latitude: number | null;
  longitude: number | null;
  photoUrl: string | null;
  handoverReference: string;
  verificationHash: string;
  collectorConfirmedAt: string | null;
  recyclerConfirmedAt: string | null;
  createdAt: string;
};

type TraceabilityEvent = {
  id: string;
  eventType: string;
  actorType: string;
  actorId: string | null;
  latitude: number | null;
  longitude: number | null;
  metadata: Record<string, unknown> | null;
  previousHash: string | null;
  eventHash: string;
  createdAt: string;
};

type Lot = {
  id: string;
  lotNumber: string;
  description: string | null;
  approxWeight: number;
  condition: string | null;
  sourceType: string | null;

  aiCategory: string | null;
  aiSubcategory: string | null;
  aiConfidence: number | null;
  aiModel: string | null;

  confirmedCategory: string | null;
  confirmedSubcategory: string | null;

  estimatedMinValue: number | null;
  estimatedMaxValue: number | null;

  collectionLatitude: number | null;
  collectionLongitude: number | null;
  collectionLocation: string | null;

  status: string;

  material: Material;
  images: LotImage[];
  quotes: Quote[];
  transaction: Transaction | null;
  handover: Handover | null;
  events: TraceabilityEvent[];
};

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
};

type RecyclerApiResponse = {
  success: boolean;
  data?: {
    recyclers: Recycler[];
    count: number;
  };
  error?: string;
};

export default function LotDetailsPage() {
  const params = useParams();
  const lotId = params.lotId as string;

  const [lot, setLot] = useState<Lot | null>(null);
  const [recyclers, setRecyclers] = useState<Recycler[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [actionLoading, setActionLoading] = useState("");
  const [actionError, setActionError] = useState("");

  // Handover
  const [finalWeight, setFinalWeight] = useState("");
  const [handoverPhotoUrl, setHandoverPhotoUrl] = useState("");
  const [handoverLatitude, setHandoverLatitude] = useState("");
  const [handoverLongitude, setHandoverLongitude] = useState("");

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<
    "UPI" | "CASH" | "BANK_TRANSFER"
  >("UPI");

  /*
   * IMPORTANT:
   * Keeps track of the exact recycler whose quote is being requested.
   *
   * Before:
   *   actionLoading === "quote"
   *
   * That made every recycler button show "Processing...".
   *
   * Now:
   *   actionLoading === `quote-${recycler.id}`
   *
   * So only the clicked recycler is loading.
   */

  const fetchLot = useCallback(async () => {
    try {
      setError("");

      const response = await fetch(`/api/lots/${lotId}`);

      const result: ApiResponse<Lot> = await response.json();

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.error || "Failed to fetch lot");
      }

      setLot(result.data);

      if (result.data.handover) {
        setFinalWeight(String(result.data.handover.weight));
        setHandoverPhotoUrl(result.data.handover.photoUrl || "");

        if (result.data.handover.latitude !== null) {
          setHandoverLatitude(
            String(result.data.handover.latitude),
          );
        }

        if (result.data.handover.longitude !== null) {
          setHandoverLongitude(
            String(result.data.handover.longitude),
          );
        }
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong",
      );
    } finally {
      setLoading(false);
    }
  }, [lotId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLot();
  }, [fetchLot]);

  async function runAction(
    action: string,
    url: string,
    options?: RequestInit,
  ) {
    try {
      setActionLoading(action);
      setActionError("");

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        ...options,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || `Failed to ${action}`,
        );
      }

      await fetchLot();

      return result;
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : `Failed to ${action}`,
      );

      return null;
    } finally {
      setActionLoading("");
    }
  }

  async function analyseMaterial() {
    await runAction(
      "analyse",
      `/api/lots/${lotId}/analyse`,
    );
  }

  async function confirmMaterial() {
    if (!lot?.aiCategory) return;

    await runAction(
      "confirm",
      `/api/lots/${lotId}/confirm`,
      {
        body: JSON.stringify({
          confirmedCategory: lot.aiCategory,
          confirmedSubcategory: lot.aiSubcategory,
        }),
      },
    );
  }

  async function calculatePrice() {
    await runAction(
      "price",
      `/api/lots/${lotId}/price`,
    );
  }

  async function findRecyclers() {
    try {
      setActionLoading("recyclers");
      setActionError("");

      const response = await fetch(
        `/api/lots/${lotId}/match-recyclers`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const result: RecyclerApiResponse =
        await response.json();

      if (
        !response.ok ||
        !result.success ||
        !result.data
      ) {
        throw new Error(
          result.error || "Failed to find recyclers",
        );
      }

      setRecyclers(result.data.recyclers);
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Failed to find recyclers",
      );
    } finally {
      setActionLoading("");
    }
  }

  /*
   * --------------------------------------------------
   * REQUEST QUOTE
   * --------------------------------------------------
   *
   * This function sends ONLY the clicked recyclerId.
   *
   * Example:
   *
   * Recycler A clicked
   *      ↓
   * { recyclerId: "A" }
   *
   * Recycler B is NOT touched.
   */

  async function requestQuote(recyclerId: string) {
    console.log("🚨 FULL REQUEST ID:", recyclerId);

    const loadingKey = `quote-${recyclerId}`;

    try {
      setActionLoading(loadingKey);
      setActionError("");

      console.log("🔥 CLICKED RECYCLER:", recyclerId);

      const response = await fetch(
        `/api/lots/${lotId}/quotes`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            recyclerId,
          }),
        },
      );

      const result = await response.json();

      console.log("🔥 QUOTE RESPONSE:", {
        recyclerId,
        status: response.status,
        result,
      });

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Failed to request quote",
        );
      }

      setRecyclers((current) =>
        current.filter(
          (recycler) => recycler.id !== recyclerId,
        ),
      );

      await fetchLot();
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Failed to request quote",
      );
    } finally {
      setActionLoading("");
    }
  }

  async function acceptQuote(quoteId: string) {
    await runAction(
      "accept-quote",
      `/api/lots/${lotId}/quotes/${quoteId}/accept`,
      {
        body: JSON.stringify({}),
      },
    );
  }

  async function recordHandover() {
    if (!finalWeight || Number(finalWeight) <= 0) {
      setActionError("Enter a valid final weight.");
      return;
    }

    const latitude = handoverLatitude
      ? Number(handoverLatitude)
      : null;

    const longitude = handoverLongitude
      ? Number(handoverLongitude)
      : null;

    await runAction(
      "handover",
      `/api/lots/${lotId}/handover`,
      {
        body: JSON.stringify({
          weight: Number(finalWeight),
          latitude,
          longitude,
          photoUrl: handoverPhotoUrl || null,
        }),
      },
    );
  }

  async function completePayment() {
    await runAction(
      "payment",
      `/api/lots/${lotId}/payment`,
      {
        body: JSON.stringify({
          paymentMethod,
        }),
      },
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-64 rounded bg-neutral-800" />
            <div className="h-40 rounded-2xl bg-neutral-900" />
            <div className="h-60 rounded-2xl bg-neutral-900" />
          </div>
        </div>
      </main>
    );
  }

  if (error || !lot) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <div className="rounded-2xl border border-red-900 bg-red-950/30 p-6">
            <h1 className="text-xl font-semibold">
              Failed to load lot
            </h1>

            <p className="mt-2 text-sm text-red-300">
              {error || "Lot not found"}
            </p>

            <Link
              href="/"
              className="mt-5 inline-block rounded-lg bg-white px-4 py-2 text-sm font-medium text-black"
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const isCompleted = lot.status === "COMPLETED";
  const isReady = lot.status === "READY";
  const isPickupRequested =
    lot.status === "PICKUP_REQUESTED";
  const isHandedOver = lot.status === "HANDED_OVER";

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto max-w-5xl px-6 py-10">

        {/* HEADER */}

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link
              href="/"
              className="text-sm text-neutral-500 hover:text-white"
            >
              ← Dashboard
            </Link>

            <h1 className="mt-3 text-3xl font-bold tracking-tight">
              {lot.lotNumber}
            </h1>

            <p className="mt-1 text-sm text-neutral-400">
              {lot.material.category}
              {lot.material.subcategory
                ? ` · ${lot.material.subcategory}`
                : ""}
            </p>
          </div>

          <StatusBadge status={lot.status} />
        </div>

        {/* GLOBAL ERROR */}

        {actionError && (
          <div className="mb-6 rounded-xl border border-red-900 bg-red-950/30 px-4 py-3 text-sm text-red-300">
            {actionError}
          </div>
        )}

        {/* OVERVIEW */}

        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6">
          <SectionTitle
            number="01"
            title="Lot Overview"
          />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Info
              label="Material"
              value={lot.material.category}
            />

            <Info
              label="Weight"
              value={`${lot.approxWeight} ${lot.material.unit}`}
            />

            <Info
              label="Condition"
              value={lot.condition || "Not specified"}
            />

            <Info
              label="Source"
              value={lot.sourceType || "Not specified"}
            />
          </div>

          {lot.description && (
            <div className="mt-5 border-t border-neutral-800 pt-5">
              <p className="text-xs uppercase tracking-wider text-neutral-500">
                Description
              </p>

              <p className="mt-2 text-sm text-neutral-300">
                {lot.description}
              </p>
            </div>
          )}

          {lot.images.length > 0 && (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {lot.images.map((image) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={image.id}
                  src={image.url}
                  alt="E-waste"
                  className="aspect-square rounded-xl border border-neutral-800 object-cover"
                />
              ))}
            </div>
          )}
        </section>

        {/* AI ANALYSIS */}

        <section className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6">
          <SectionTitle
            number="02"
            title="AI Material Analysis"
          />

          {!lot.aiCategory ? (
            <div>
              <p className="mb-5 text-sm text-neutral-400">
                Use AI to identify the material, condition and
                recyclable category from the uploaded image.
              </p>

              <ActionButton
                onClick={analyseMaterial}
                loading={actionLoading === "analyse"}
              >
                Analyse with AI
              </ActionButton>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Info
                  label="Category"
                  value={lot.aiCategory}
                />

                <Info
                  label="Subcategory"
                  value={lot.aiSubcategory || "—"}
                />

                <Info
                  label="Confidence"
                  value={
                    lot.aiConfidence !== null
                      ? `${Math.round(
                        lot.aiConfidence * 100,
                      )}%`
                      : "—"
                  }
                />
              </div>

              {!lot.confirmedCategory ? (
                <div className="rounded-xl border border-yellow-900/70 bg-yellow-950/20 p-4">
                  <p className="text-sm text-yellow-300">
                    Review the AI result and confirm the material
                    before price discovery.
                  </p>

                  <ActionButton
                    onClick={confirmMaterial}
                    loading={
                      actionLoading === "confirm"
                    }
                    className="mt-4"
                  >
                    Confirm Material
                  </ActionButton>
                </div>
              ) : (
                <div className="rounded-xl border border-green-900/70 bg-green-950/20 p-4">
                  <p className="text-sm font-medium text-green-300">
                    ✓ Material confirmed
                  </p>

                  <p className="mt-1 text-sm text-neutral-400">
                    {lot.confirmedCategory}
                    {lot.confirmedSubcategory
                      ? ` · ${lot.confirmedSubcategory}`
                      : ""}
                  </p>
                </div>
              )}
            </div>
          )}
        </section>

        {/* PRICE */}

        <section className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6">
          <SectionTitle
            number="03"
            title="Price Discovery"
          />

          {lot.estimatedMinValue === null ||
            lot.estimatedMaxValue === null ? (
            <div>
              <p className="mb-5 text-sm text-neutral-400">
                Calculate an estimated value using recent transaction
                and recycler price data.
              </p>

              <ActionButton
                onClick={calculatePrice}
                loading={actionLoading === "price"}
                disabled={!lot.confirmedCategory}
              >
                Calculate Estimated Price
              </ActionButton>

              {!lot.confirmedCategory && (
                <p className="mt-3 text-xs text-neutral-500">
                  Confirm the material first.
                </p>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-5">
                <p className="text-xs uppercase tracking-wider text-neutral-500">
                  Estimated minimum
                </p>

                <p className="mt-2 text-2xl font-bold">
                  ₹
                  {lot.estimatedMinValue.toLocaleString(
                    "en-IN",
                  )}
                </p>
              </div>

              <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-5">
                <p className="text-xs uppercase tracking-wider text-neutral-500">
                  Estimated maximum
                </p>

                <p className="mt-2 text-2xl font-bold">
                  ₹
                  {lot.estimatedMaxValue.toLocaleString(
                    "en-IN",
                  )}
                </p>
              </div>
            </div>
          )}
        </section>

        {/* RECYCLERS */}

        <section className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6">
          <SectionTitle
            number="04"
            title="Recycler Matching"
          />

          {lot.quotes.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm text-neutral-400">
                Recycler quotes for this lot.
              </p>

              {lot.quotes.map((quote) => (
                <div
                  key={quote.id}
                  className="rounded-xl border border-neutral-800 bg-neutral-950 p-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold">
                        {quote.recycler.name}
                      </p>

                      <p className="mt-1 text-sm text-neutral-500">
                        {quote.recycler.city || "—"}
                        {quote.recycler.state
                          ? `, ${quote.recycler.state}`
                          : ""}
                      </p>

                      <p className="mt-3 text-sm text-neutral-300">
                        ₹{quote.quotedPrice}/kg
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      {quote.quotedTotal !== null && (
                        <p className="text-xl font-bold">
                          ₹
                          {quote.quotedTotal.toLocaleString("en-IN")}
                        </p>
                      )}

                      {quote.status === "ACTIVE" &&
                        (lot.status === "READY" ||
                          lot.status === "MATCHING") && (
                          <ActionButton
                            onClick={() => acceptQuote(quote.id)}
                            loading={
                              actionLoading === `accept-${quote.id}`
                            }
                            className="mt-3"
                          >
                            {actionLoading === `accept-${quote.id}`
                              ? "Accepting..."
                              : "Accept Quote"}
                          </ActionButton>
                        )}

                      {quote.status === "ACCEPTED" && (
                        <span className="mt-3 inline-block rounded-full bg-green-950 px-3 py-1 text-xs text-green-300">
                          ✓ Accepted
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {recyclers.length > 0 && (
            <div
              className={`space-y-4 ${lot.quotes.length > 0 ? "mt-6" : ""
                }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-neutral-300">
                  Matched recyclers
                </p>

                <span className="text-xs text-neutral-500">
                  {recyclers.length} found
                </span>
              </div>

              {recyclers.map((recycler) => {
                const quoteLoading =
                  actionLoading === `quote-${recycler.recyclerId}`;

                return (
                  <div
                    key={recycler.recyclerId}
                    className="rounded-xl border border-neutral-800 bg-neutral-950 p-5"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">
                            {recycler.name}
                          </h3>

                          <span className="rounded-full bg-green-950 px-2 py-1 text-[10px] uppercase tracking-wider text-green-300">
                            Verified
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-neutral-500">
                          {recycler.city || "—"}
                          {recycler.state
                            ? `, ${recycler.state}`
                            : ""}
                        </p>

                        {recycler.address && (
                          <p className="mt-1 text-xs text-neutral-600">
                            {recycler.address}
                          </p>
                        )}

                        <div className="mt-4 flex flex-wrap gap-2">
                          {recycler.pickupAvailable && (
                            <span className="rounded-lg border border-neutral-800 px-2 py-1 text-xs text-neutral-400">
                              Pickup available
                            </span>
                          )}

                          {recycler.serviceRadiusKm && (
                            <span className="rounded-lg border border-neutral-800 px-2 py-1 text-xs text-neutral-400">
                              {recycler.serviceRadiusKm} km radius
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="min-w-45 lg:text-right">
                        <p className="text-xs text-neutral-500">
                          Offered rate
                        </p>

                        <p className="mt-1 text-2xl font-bold">
                          ₹{recycler.offeredRate}
                          <span className="text-sm font-normal text-neutral-500">
                            /{recycler.unit || "kg"}
                          </span>
                        </p>

                        <p className="mt-1 text-sm text-neutral-400">
                          Est. ₹
                          {recycler.estimatedAmount.toLocaleString(
                            "en-IN",
                          )}
                        </p>

                        <ActionButton
                          onClick={() =>
                            requestQuote(recycler.recyclerId)
                          }
                          loading={quoteLoading}
                          className="mt-4 w-full lg:w-auto"
                        >
                          {quoteLoading
                            ? "Requesting..."
                            : "Get Quote"}
                        </ActionButton>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {recyclers.length === 0 && lot.quotes.length === 0 && (
            <div>
              <p className="mb-5 text-sm text-neutral-400">
                Find authorized recyclers that accept this material.
              </p>

              <ActionButton
                onClick={findRecyclers}
                loading={actionLoading === "recyclers"}
                disabled={!lot.confirmedCategory || !isReady}
              >
                Find Recyclers
              </ActionButton>

              {!isReady && (
                <p className="mt-3 text-xs text-neutral-500">
                  Recycler matching becomes available after material
                  confirmation.
                </p>
              )}
            </div>
          )}
        </section>

        {/* HANDOVER */}

        <section className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6">
          <SectionTitle
            number="05"
            title="Digital Handover"
          />

          {!lot.transaction ? (
            <LockedMessage>
              Accept a recycler quote before starting handover.
            </LockedMessage>
          ) : lot.handover ? (
            <div className="space-y-5">
              <div className="rounded-xl border border-green-900/70 bg-green-950/20 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-300">
                      ✓ Handover recorded
                    </p>

                    <p className="mt-2 text-sm text-neutral-400">
                      Reference:{" "}
                      <span className="font-mono text-neutral-300">
                        {lot.handover.handoverReference}
                      </span>
                    </p>
                  </div>

                  <p className="text-2xl font-bold">
                    {lot.handover.weight} kg
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Info
                  label="Final weight"
                  value={`${lot.handover.weight} kg`}
                />

                <Info
                  label="Collector confirmation"
                  value={
                    lot.handover.collectorConfirmedAt
                      ? "Confirmed"
                      : "Pending"
                  }
                />

                <Info
                  label="Recycler confirmation"
                  value={
                    lot.handover.recyclerConfirmedAt
                      ? "Confirmed"
                      : "Pending"
                  }
                />

                <Info
                  label="Verification"
                  value="SHA-256 recorded"
                />
              </div>

              <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
                <p className="text-xs uppercase tracking-wider text-neutral-500">
                  Verification hash
                </p>

                <p className="mt-2 break-all font-mono text-xs text-neutral-400">
                  {lot.handover.verificationHash}
                </p>
              </div>

              {lot.handover.photoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={lot.handover.photoUrl}
                  alt="Handover proof"
                  className="max-h-80 rounded-xl border border-neutral-800 object-cover"
                />
              )}
            </div>
          ) : !isPickupRequested ? (
            <LockedMessage>
              Accept a recycler quote to request pickup and enable
              handover.
            </LockedMessage>
          ) : (
            <div className="space-y-5">
              <div className="rounded-xl border border-blue-900/60 bg-blue-950/20 p-4">
                <p className="text-sm font-medium text-blue-300">
                  Pickup requested
                </p>

                <p className="mt-1 text-sm text-neutral-400">
                  Enter the final weight after the recycler collects
                  the material.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <InputField
                  label="Final weight (kg)"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={`Approx. ${lot.approxWeight}`}
                  value={finalWeight}
                  onChange={setFinalWeight}
                />

                <InputField
                  label="Handover photo URL (optional)"
                  type="text"
                  placeholder="Global Image URL"
                  value={handoverPhotoUrl}
                  onChange={setHandoverPhotoUrl}
                />
              </div>

              <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
                <p className="text-xs text-neutral-500">
                  This creates a tamper-evident handover record using
                  the lot, transaction, recycler, weight, location and
                  previous traceability hash.
                </p>
              </div>

              <ActionButton
                onClick={recordHandover}
                loading={
                  actionLoading === "handover"
                }
              >
                Confirm Handover
              </ActionButton>
            </div>
          )}
        </section>

        {/* PAYMENT */}

        {/* <section className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6">
          <SectionTitle
            number="06"
            title="Payment"
          />

          {!lot.transaction ? (
            <LockedMessage>
              Payment becomes available after a recycler quote is
              accepted.
            </LockedMessage>
          ) : lot.transaction.paymentStatus === "PAID" ? (
            <div className="space-y-5">
              <div className="rounded-xl border border-green-900/70 bg-green-950/20 p-5">
                <p className="text-sm font-medium text-green-300">
                  ✓ Payment completed
                </p>

                <p className="mt-2 text-3xl font-bold">
                  ₹
                  {lot.transaction.finalPrice.toLocaleString(
                    "en-IN",
                  )}
                </p>

                <p className="mt-1 text-sm text-neutral-500">
                  via{" "}
                  {formatPaymentMethod(
                    lot.transaction.paymentMethod,
                  )}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Info
                  label="Transaction"
                  value={
                    lot.transaction.transactionNumber
                  }
                />

                <Info
                  label="Payment status"
                  value="PAID"
                />

                <Info
                  label="Provider"
                  value={
                    lot.transaction.payout?.provider ||
                    "MOCK_PROVIDER"
                  }
                />

                <Info
                  label="Provider reference"
                  value={
                    lot.transaction.payout
                      ?.providerPayoutId || "—"
                  }
                />
              </div>
            </div>
          ) : !isHandedOver ? (
            <LockedMessage>
              Complete the digital handover before processing payment.
            </LockedMessage>
          ) : (
            <div className="space-y-6">
              <div>
                <p className="text-sm text-neutral-400">
                  Final payable amount
                </p>

                <p className="mt-2 text-4xl font-bold">
                  ₹
                  {lot.transaction.finalPrice.toLocaleString(
                    "en-IN",
                  )}
                </p>
              </div>

              <div>
                <p className="mb-3 text-sm font-medium">
                  Select payment method
                </p>

                <div className="grid gap-3 sm:grid-cols-3">
                  <PaymentOption
                    label="UPI"
                    description="Instant digital payment"
                    selected={
                      paymentMethod === "UPI"
                    }
                    onClick={() =>
                      setPaymentMethod("UPI")
                    }
                  />

                  <PaymentOption
                    label="Cash"
                    description="Cash at handover"
                    selected={
                      paymentMethod === "CASH"
                    }
                    onClick={() =>
                      setPaymentMethod("CASH")
                    }
                  />

                  <PaymentOption
                    label="Bank Transfer"
                    description="Direct bank transfer"
                    selected={
                      paymentMethod ===
                      "BANK_TRANSFER"
                    }
                    onClick={() =>
                      setPaymentMethod(
                        "BANK_TRANSFER",
                      )
                    }
                  />
                </div>
              </div>

              <div className="rounded-xl border border-yellow-900/60 bg-yellow-950/20 p-4">
                <p className="text-sm text-yellow-300">
                  Demo payment
                </p>

                <p className="mt-1 text-xs text-neutral-500">
                  This currently uses the projects mock payment
                  provider and records a successful payout.
                </p>
              </div>

              <ActionButton
                onClick={completePayment}
                loading={
                  actionLoading === "payment"
                }
              >
                Complete Payment · ₹
                {lot.transaction.finalPrice.toLocaleString(
                  "en-IN",
                )}
              </ActionButton>
            </div>
          )}
        </section> */}

        {/* COMPLETION */}

        {isCompleted && (
          <section className="mt-6 rounded-2xl border border-green-900/70 bg-green-950/20 p-6">
            <p className="text-sm font-medium text-green-300">
              🎉 Lot lifecycle completed
            </p>

            <p className="mt-2 text-sm text-neutral-400">
              The material has been handed over and payment has been
              recorded successfully.
            </p>

            {lot.transaction?.completedAt && (
              <p className="mt-3 text-xs text-neutral-600">
                Completed{" "}
                {new Date(
                  lot.transaction.completedAt,
                ).toLocaleString("en-IN")}
              </p>
            )}
          </section>
        )}

        {/* TRACEABILITY */}

        <section className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6">
          <SectionTitle
            number="07"
            title="Traceability"
          />

          {lot.events.length === 0 ? (
            <p className="text-sm text-neutral-500">
              No traceability events yet.
            </p>
          ) : (
            <div className="relative space-y-4">
              {lot.events.map((event, index) => (
                <div
                  key={event.id}
                  className="relative rounded-xl border border-neutral-800 bg-neutral-950 p-5"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-700 text-xs text-neutral-400">
                          {index + 1}
                        </span>

                        <p className="font-medium">
                          {formatEventType(
                            event.eventType,
                          )}
                        </p>
                      </div>

                      <p className="mt-2 text-xs text-neutral-500">
                        Actor: {event.actorType}
                      </p>
                    </div>

                    <p className="text-xs text-neutral-600">
                      {new Date(
                        event.createdAt,
                      ).toLocaleString("en-IN")}
                    </p>
                  </div>

                  <div className="mt-4 border-t border-neutral-800 pt-4">
                    <p className="text-[10px] uppercase tracking-wider text-neutral-600">
                      Event hash
                    </p>

                    <p className="mt-1 break-all font-mono text-[11px] text-neutral-500">
                      {event.eventHash}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

/* ---------------------------------- */
/* UI COMPONENTS */
/* ---------------------------------- */

function SectionTitle({
  number,
  title,
}: {
  number: string;
  title: string;
}) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <span className="font-mono text-xs text-neutral-600">
        {number}
      </span>

      <h2 className="text-lg font-semibold">
        {title}
      </h2>
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
      <p className="text-xs uppercase tracking-wider text-neutral-600">
        {label}
      </p>

      <p className="mt-2 text-sm font-medium text-neutral-200">
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
  const styles: Record<string, string> = {
    DRAFT: "bg-neutral-800 text-neutral-300",
    READY: "bg-blue-950 text-blue-300",
    MATCHING: "bg-purple-950 text-purple-300",
    PICKUP_REQUESTED:
      "bg-yellow-950 text-yellow-300",
    HANDED_OVER:
      "bg-orange-950 text-orange-300",
    COMPLETED:
      "bg-green-950 text-green-300",
    CANCELLED:
      "bg-red-950 text-red-300",
  };

  return (
    <span
      className={`rounded-full px-3 py-1.5 text-xs font-medium ${styles[status] || styles.DRAFT
        }`}
    >
      {formatStatus(status)}
    </span>
  );
}

function ActionButton({
  children,
  onClick,
  loading,
  disabled,
  className = "",
}: {
  children: React.ReactNode;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={`rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {loading ? "Processing..." : children}
    </button>
  );
}

function InputField({
  label,
  type,
  step,
  min,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  type: string;
  step?: string;
  min?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs uppercase tracking-wider text-neutral-500">
        {label}
      </span>

      <input
        type={type}
        step={step}
        min={min}
        placeholder={placeholder}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-white outline-none placeholder:text-neutral-700 focus:border-neutral-500"
      />
    </label>
  );
}

function PaymentOption({
  label,
  description,
  selected,
  onClick,
}: {
  label: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-4 text-left transition ${selected
          ? "border-white bg-white text-black"
          : "border-neutral-800 bg-neutral-950 hover:border-neutral-600"
        }`}
    >
      <p className="font-semibold">{label}</p>

      <p
        className={`mt-1 text-xs ${selected
            ? "text-neutral-600"
            : "text-neutral-500"
          }`}
      >
        {description}
      </p>
    </button>
  );
}

function LockedMessage({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-5">
      <p className="text-sm text-neutral-500">
        {children}
      </p>
    </div>
  );
}

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1),
    )
    .join(" ");
}

function formatEventType(eventType: string) {
  return eventType
    .toLowerCase()
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1),
    )
    .join(" ");
}

function formatPaymentMethod(method: string) {
  if (method === "BANK_TRANSFER") {
    return "Bank Transfer";
  }

  if (method === "UPI") {
    return "UPI";
  }

  if (method === "CASH") {
    return "Cash";
  }

  return method;
}
