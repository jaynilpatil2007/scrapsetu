"use client";

import { EWasteImageUpload } from "@/components/collector/EWasteImageUpload";

export default function NewLotPage() {
 const handleUpload = async (data: {
    url: string;
    publicId: string;
  }) => {
    try {
      // 1. AI classification
      const aiResponse = await fetch(
        "/api/ai/classify-material",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            imageUrl: data.url,
          }),
        },
      );

      const aiResult = await aiResponse.json();

      if (!aiResult.success) {
        throw new Error(aiResult.error);
      }

      const material = aiResult.data;

      console.log("AI classification:", material);

      // 2. Create lot
      const lotResponse = await fetch("/api/lots", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          collectorId: "demo-collector-id",

          imageUrl: data.url,
          imagePublicId: data.publicId,

          category: material.category,
          subcategory: material.subcategory,

          condition: material.condition,

          quantity: 1,
          unit: "kg",

          aiConfidence: material.confidence,
          aiModel: "material-agent",

          hazards: material.hazards,
          recyclableMaterials:
            material.recyclableMaterials,
        }),
      });

      const lotResult = await lotResponse.json();

      console.log("Created lot:", lotResult);
    } catch (error) {
      console.error("Lot creation failed:", error);
    }
  };

  return (
    <main className="p-6">
      <h1 className="mb-6 text-2xl font-semibold">
        Create E-Waste Lot
      </h1>

      <EWasteImageUpload onUpload={handleUpload} />
    </main>
  );
}