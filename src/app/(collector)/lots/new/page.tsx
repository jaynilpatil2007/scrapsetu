"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { EWasteImageUpload } from "@/components/collector/EWasteImageUpload";

type Material = {
  id: string;
  category: string;
  subcategory: string | null;
  unit: string;
};

type UploadedImage = {
  url: string;
  publicId: string;
};

type Analysis = {
  category: string;
  subcategory: string;
  condition: string;
  confidence: number;
  hazards: string[];
  recyclableMaterials: string[];
  explanation: string;
};

export default function NewLotPage() {
  const router = useRouter();

  const [materials, setMaterials] = useState<Material[]>([]);
  const [materialId, setMaterialId] = useState("");
  const [weight, setWeight] = useState("");
  const [image, setImage] = useState<UploadedImage | null>(null);

  const [loadingMaterials, setLoadingMaterials] =
    useState(true);

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<
    "idle" | "creating" | "analyzing"
  >("idle");

  const [analysis, setAnalysis] =
    useState<Analysis | null>(null);

  const [error, setError] = useState("");

  useEffect(() => {
    async function loadMaterials() {
      try {
        const response = await fetch("/api/materials");
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.error || "Failed to load materials",
          );
        }

        setMaterials(result.data ?? []);
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Failed to load materials",
        );
      } finally {
        setLoadingMaterials(false);
      }
    }

    loadMaterials();
  }, []);

  async function handleCreateLot() {
    setError("");

    if (!materialId) {
      setError("Please select a material.");
      return;
    }

    const approxWeight = Number(weight);

    if (!approxWeight || approxWeight <= 0) {
      setError("Please enter a valid weight.");
      return;
    }

    if (!image) {
      setError("Please upload an e-waste image.");
      return;
    }

    try {
      setLoading(true);
      setStep("creating");

      // 1. Create draft lot
      const lotResponse = await fetch("/api/lots", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          materialId,
          approxWeight,

          description: "E-waste lot",

          condition: "Used",

          sourceType: "HOUSEHOLD",

          images: [
            {
              url: image.url,
            },
          ],
        }),
      });

      const lotResult = await lotResponse.json();

      if (!lotResponse.ok || !lotResult.success) {
        throw new Error(
          lotResult.error || "Failed to create lot",
        );
      }

      const lotId = lotResult.data?.id;

      if (!lotId) {
        throw new Error(
          "Lot created but lot ID was not returned",
        );
      }

      console.log("Lot created:", lotResult);

      // 2. Analyze the uploaded image
      setStep("analyzing");

      const analyseResponse = await fetch(
        `/api/lots/${lotId}/analyse`,
        {
          method: "POST",
        },
      );

      const analyseResult = await analyseResponse.json();

      if (!analyseResponse.ok || !analyseResult.success) {
        throw new Error(
          analyseResult.error ||
            "AI analysis failed",
        );
      }

      console.log(
        "AI analysis:",
        analyseResult,
      );

      setAnalysis(analyseResult.data.analysis);

      // Keep lot ID for next step
      sessionStorage.setItem(
        "scrapsetu-current-lot",
        lotId,
      );
    } catch (error) {
      console.error("Create lot failed:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong",
      );

      setStep("idle");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto max-w-2xl px-6 py-12">

        <div>
          <p className="text-sm text-neutral-500">
            ScrapSetu
          </p>

          <h1 className="mt-2 text-3xl font-semibold">
            Create E-Waste Lot
          </h1>

          <p className="mt-2 text-neutral-400">
            Add your e-waste and let AI identify it.
          </p>
        </div>

        <div className="mt-10 space-y-6">

          {/* Material */}
          <div>
            <label className="mb-2 block text-sm text-neutral-400">
              Material
            </label>

            <select
              value={materialId}
              onChange={(event) =>
                setMaterialId(event.target.value)
              }
              disabled={loadingMaterials || loading}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 outline-none"
            >
              <option value="">
                {loadingMaterials
                  ? "Loading materials..."
                  : "Select material"}
              </option>

              {materials.map((material) => (
                <option
                  key={material.id}
                  value={material.id}
                >
                  {material.category}
                  {material.subcategory
                    ? ` — ${material.subcategory}`
                    : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Weight */}
          <div>
            <label className="mb-2 block text-sm text-neutral-400">
              Approximate weight
            </label>

            <div className="flex gap-3">
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={weight}
                onChange={(event) =>
                  setWeight(event.target.value)
                }
                disabled={loading}
                placeholder="e.g. 2.5"
                className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 outline-none"
              />

              <div className="flex items-center rounded-xl border border-neutral-800 bg-neutral-900 px-5 text-sm text-neutral-500">
                kg
              </div>
            </div>
          </div>

          {/* Image */}
          <div>
            <label className="mb-2 block text-sm text-neutral-400">
              E-waste image
            </label>

            {image ? (
              <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
                <img
                  src={image.url}
                  alt="Uploaded e-waste"
                  className="max-h-64 w-full rounded-lg object-contain"
                />

                <button
                  type="button"
                  onClick={() => setImage(null)}
                  disabled={loading}
                  className="mt-3 text-sm text-neutral-400 underline"
                >
                  Change image
                </button>
              </div>
            ) : (
              <EWasteImageUpload
                onUpload={(data) => {
                  setImage(data);
                  setError("");
                }}
              />
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Progress */}
          {loading && (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-400">
              {step === "creating"
                ? "Creating your lot..."
                : "🤖 AI is analyzing your e-waste..."}
            </div>
          )}

          {/* Create */}
          {!analysis && (
            <button
              type="button"
              onClick={handleCreateLot}
              disabled={loading}
              className="w-full rounded-xl bg-white px-5 py-3 font-medium text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Processing..."
                : "Create Lot"}
            </button>
          )}

          {/* AI Result */}
          {analysis && (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">

              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium">
                  AI Analysis
                </h2>

                <span className="rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-400">
                  {Math.round(
                    analysis.confidence * 100,
                  )}
                  % confidence
                </span>
              </div>

              <div className="mt-6 space-y-4">

                <div>
                  <p className="text-xs text-neutral-500">
                    Category
                  </p>

                  <p className="mt-1 font-medium">
                    {analysis.category}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-neutral-500">
                    Subcategory
                  </p>

                  <p className="mt-1 font-medium">
                    {analysis.subcategory}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-neutral-500">
                    Condition
                  </p>

                  <p className="mt-1 font-medium">
                    {analysis.condition}
                  </p>
                </div>

                <p className="text-sm leading-6 text-neutral-400">
                  {analysis.explanation}
                </p>

              </div>

              <button
                type="button"
                onClick={() => {
                  const lotId =
                    sessionStorage.getItem(
                      "scrapsetu-current-lot",
                    );

                  if (lotId) {
                    router.push(
                      `/lots/${lotId}`,
                    );
                  }
                }}
                className="mt-6 w-full rounded-xl bg-white px-5 py-3 font-medium text-black"
              >
                Continue →
              </button>

            </div>
          )}

        </div>
      </div>
    </main>
  );
}