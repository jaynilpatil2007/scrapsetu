"use client";

import { EWasteImageUpload } from "@/components/collector/EWasteImageUpload";

export default function NewLotPage() {
  const handleUpload = async (data: {
    url: string;
    publicId: string;
  }) => {
    console.log("Cloudinary upload:", data);

    try {
      const response = await fetch(
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

      const result = await response.json();

      console.log("AI classification:", result);
    } catch (error) {
      console.error(
        "Failed to classify material:",
        error,
      );
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