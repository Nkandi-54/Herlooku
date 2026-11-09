"use client";

import React, { useEffect, useRef, useState } from "react";
import { Camera, Loader2, CheckCircle2, X } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

interface PrivateDocumentUploadProps {
  label: string;
  hint?: string;
  /** Current storage path (or empty). */
  value: string;
  onChange: (path: string) => void;
  /** Preview aspect: portrait for selfies, landscape for ID scans. */
  aspect?: "landscape" | "portrait";
  documentKind: "id_front" | "id_back" | "selfie";
}

/**
 * Uploads an identity document to the PRIVATE `identity-documents` Supabase
 * storage bucket via /api/upload?kind=identity.
 *
 * The returned value is a storage PATH, not a URL. The file is only reachable
 * by its owner or an administrator through a short-lived signed URL, so ID
 * scans are never publicly accessible.
 */
export const PrivateDocumentUpload: React.FC<PrivateDocumentUploadProps> = ({
  label,
  hint,
  value,
  onChange,
  aspect = "landscape",
  documentKind,
}) => {
  const { t } = useLanguage();
  const tx = (copy: string) => t(`copy:${copy}`);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError(tx("Unsupported file type. Please upload a JPG, PNG or WEBP image."));
      return;
    }
    if (file.size === 0 || file.size > 5 * 1024 * 1024) {
      setError(tx("File must be greater than 0 bytes and no larger than 5 MB."));
      return;
    }

    setUploading(true);

    try {
      const localPreview = URL.createObjectURL(file);
      setPreview(localPreview);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("kind", "identity");
      formData.append("documentKind", documentKind);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok || typeof data.path !== "string" || !data.path) {
        setError(data.error || tx("Upload failed. Please try again."));
        return;
      }

      onChange(data.path);
    } catch (uploadError) {
      console.error("Identity photo upload failed:", uploadError);
      setError(tx("Network error during upload. Please try again."));
    } finally {
      setUploading(false);
    }
  };

  const dims =
    aspect === "portrait" ? "w-24 h-24 rounded-2xl" : "w-44 h-28 rounded-xl";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-800">{label}</label>
        {hint && <span className="text-[11px] text-slate-400">{hint}</span>}
      </div>

      <div className="flex items-start gap-3">
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="shrink-0 border-2 border-dashed border-slate-300 hover:border-brand-400 hover:bg-brand-50/40 disabled:opacity-60 transition-colors rounded-xl flex flex-col items-center justify-center text-slate-500 hover:text-brand-700"
          style={{
            width: aspect === "portrait" ? 96 : 176,
            height: aspect === "portrait" ? 96 : 112,
          }}
        >
          {uploading ? (
            <Loader2 size={20} className="animate-spin" />
          ) : value ? (
            <CheckCircle2 size={20} className="text-emerald-600" />
          ) : (
            <Camera size={20} />
          )}
          <span className="text-[10px] font-bold mt-1 px-1 text-center leading-tight">
            {uploading
              ? tx("Uploading…")
              : value
                ? tx("Replace")
                : tx("Upload")}
          </span>
        </button>

        {(preview || value) && (
          <div className="relative">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt={label}
                className={`${dims} object-cover border border-slate-300 shadow-sm bg-slate-100`}
              />
            ) : (
              <div
                className={`${dims} border border-slate-300 bg-slate-50 flex items-center justify-center text-[10px] text-slate-500 font-semibold text-center px-2`}
              >
                {tx("Uploaded securely")}
              </div>
            )}
            {preview && (
              <button
                type="button"
                onClick={() => {
                  setPreview(null);
                  onChange("");
                }}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center shadow"
                aria-label={tx("Remove")}
              >
                <X size={12} />
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="text-[11px] font-semibold text-rose-600">{error}</p>
      )}
      <p className="text-[10px] text-slate-400">
        {tx(
          "JPG, PNG or WEBP · max 5 MB. Stored privately for admin review and deleted after the review decision.",
        )}
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture={aspect === "portrait" ? "user" : undefined}
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
};
