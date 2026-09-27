"use client";

import { CldUploadWidget } from "next-cloudinary";

type UploadResult = {
  info?: {
    secure_url?: string;
    public_id?: string;
  };
};

type Props = {
  onUpload: (data: {
    url: string;
    publicId: string;
  }) => void;
};

export function EWasteImageUpload({ onUpload }: Props) {
  return (
    <CldUploadWidget
      uploadPreset={
        process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
      }
      options={{
        sources: ["local", "camera"],
        multiple: false,
        maxFiles: 1,
        resourceType: "image",
        clientAllowedFormats: ["jpg", "jpeg", "png", "webp"],
        maxFileSize: 10_000_000,
        folder: "scrapsetu",
      }}
      onSuccess={(result) => {
        const uploadResult = result as UploadResult;

        const url = uploadResult.info?.secure_url;
        const publicId = uploadResult.info?.public_id;

        if (!url || !publicId) {
          console.error("Cloudinary upload missing URL:", result);
          return;
        }

        onUpload({
          url,
          publicId,
        });
      }}
    >
      {({ open }) => (
        <button
          type="button"
          onClick={() => open()}
          className="rounded-xl border px-5 py-3"
        >
          Upload E-Waste Image
        </button>
      )}
    </CldUploadWidget>
  );
}