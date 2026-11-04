"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";
import { useLanguage } from "@/i18n/LanguageContext";
import { Camera, Loader2, Trash2, UserRound, CheckCircle2 } from "lucide-react";

interface AvatarUploadProps {
  /** Current avatar URL (persisted). */
  value: string;
  /** Called with the new URL once an upload succeeds (pass "" when removing). */
  onChange: (url: string) => void;
  /** Called after a successful upload/removal so parents can persist immediately. */
  onPersist?: (url: string) => void | Promise<void>;
  /** Rendered name for the fallback initials & alt text. */
  name?: string;
  /** Visual size in px. */
  size?: number;
  label?: string;
}

export const AvatarUpload: React.FC<AvatarUploadProps> = ({
  value,
  onChange,
  onPersist,
  name = "",
  size = 96,
  label = "Profile Photo",
}) => {
  const { t } = useLanguage();
  const tx = (copy: string) => t(`copy:${copy}`);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [justUploaded, setJustUploaded] = useState(false);

  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    setError("");
    setJustUploaded(false);
    setUploading(true);

    try {
      // Instant local preview while uploading
      const localPreview = URL.createObjectURL(file);
      onChange(localPreview);

      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        // Revert preview to the last persisted value on failure
        onChange(value);
        setError(data.error || "Upload failed. Please try again.");
        return;
      }

      onChange(data.url);
      setJustUploaded(true);
      setTimeout(() => setJustUploaded(false), 2500);
      if (onPersist) await onPersist(data.url);
    } catch (err) {
      onChange(value);
      setError("Network error during upload. Please try again.");
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setError("");
    onChange("");
    if (onPersist) void onPersist("");
  };

  return (
    <div className="flex items-center gap-5">
      {/* Preview / fallback */}
      <div
        className="relative shrink-0 rounded-full overflow-hidden bg-gradient-to-br from-brand-100 to-sky-100"
        style={{ width: size, height: size, boxShadow: "0 0 0 4px rgba(14,165,233,0.15)" }}
      >
        {value ? (
          <Image
            src={value}
            alt={name}
            fill
            unoptimized
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center font-black text-brand-700"
            style={{ fontSize: size / 3 }}
          >
            {initials || <UserRound size={size / 2.2} />}
          </div>
        )}

        {uploading && (
          <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
            <Loader2 size={size / 3} className="text-white animate-spin" />
          </div>
        )}
        {justUploaded && (
          <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center">
            <CheckCircle2 size={14} className="text-white" />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-1.5">
        <span className="text-xs font-bold text-slate-700 block">{label}</span>
        <p className="text-[10px] text-slate-400">
          {tx("JPG, PNG, WEBP or GIF · max 5 MB. Square photos look best.")}
        </p>
        <div className="flex items-center gap-2 pt-0.5">
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-[11px] font-bold transition-colors flex items-center gap-1.5 shadow-sm"
          >
            {uploading ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Camera size={13} />
            )}
            <span>{tx(value ? "Change Photo" : "Upload Photo")}</span>
          </button>
          {value && (
            <button
              type="button"
              disabled={uploading}
              onClick={handleRemove}
              className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 disabled:opacity-60 text-[11px] font-bold transition-colors flex items-center gap-1"
              title={tx("Remove photo")}
              aria-label={tx("Remove photo")}
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
        {error && <p className="text-[11px] font-semibold text-rose-600">{error}</p>}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleFile}
        />
      </div>
    </div>
  );
};
