"use client";

import React, { useEffect, useState } from "react";
import { Loader2, Maximize2 } from "lucide-react";

interface PrivateDocumentImageProps {
  path: string;
  alt: string;
  onZoom: (url: string) => void;
}

export const PrivateDocumentImage: React.FC<PrivateDocumentImageProps> = ({
  path,
  alt,
  onZoom,
}) => {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const loadImage = async () => {
      setUrl("");
      setError("");

      try {
        const response = await fetch(
          `/api/storage/signed-url?path=${encodeURIComponent(path)}`,
          { signal: controller.signal, cache: "no-store" },
        );
        const data = await response.json();

        if (!response.ok || typeof data.url !== "string") {
          throw new Error(data.error || "Could not load this private document.");
        }

        setUrl(data.url);
      } catch (loadError) {
        if (controller.signal.aborted) return;
        console.error("Could not load private verification image:", loadError);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load this private document.",
        );
      }
    };

    void loadImage();
    return () => controller.abort();
  }, [path]);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-black">
      {url ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={alt}
            className="w-full h-32 object-cover transition-transform group-hover:scale-105"
            onError={() => {
              setUrl("");
              setError("The secure image link could not be opened.");
            }}
          />
          <button
            type="button"
            onClick={() => onZoom(url)}
            aria-label={`View ${alt}`}
            className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Maximize2 size={14} />
          </button>
        </>
      ) : (
        <div className="w-full h-32 flex items-center justify-center px-3 text-center text-xs text-slate-400">
          {error || (
            <span className="inline-flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" />
              Loading secure image…
            </span>
          )}
        </div>
      )}
    </div>
  );
};
