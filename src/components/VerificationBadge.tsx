import React from "react";
import { ShieldCheck, ShieldAlert, Clock, AlertCircle } from "lucide-react";
import { VerificationStatus } from "@/types";
import { useLanguage } from "@/i18n/LanguageContext";

interface Props {
  status: VerificationStatus;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

export const VerificationBadge: React.FC<Props> = ({
  status,
  size = "md",
  showText = true,
  className = "",
}) => {
  const { t } = useLanguage();
  const tx = (copy: string) => t(`copy:${copy}`);
  const iconSize = size === "sm" ? 14 : size === "md" ? 16 : 20;

  if (status === "verified") {
    return (
      <span
        title={tx("Identity Verified with Government ID & Background Check")}
        className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 ${
          size === "sm"
            ? "px-2 py-0.5 text-xs"
            : size === "md"
            ? "px-2.5 py-1 text-xs"
            : "px-3 py-1.5 text-sm"
        } ${className}`}
      >
        <ShieldCheck size={iconSize} className="text-emerald-600 shrink-0" />
        {showText && <span>{tx("ID Verified")}</span>}
      </span>
    );
  }

  if (status === "pending") {
    return (
      <span
        title={tx("ID Documents Submitted, Compliance Review in Progress")}
        className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-200 ${
          size === "sm"
            ? "px-2 py-0.5 text-xs"
            : size === "md"
            ? "px-2.5 py-1 text-xs"
            : "px-3 py-1.5 text-sm"
        } ${className}`}
      >
        <Clock size={iconSize} className="text-amber-600 shrink-0" />
        {showText && <span>{tx("Verification Pending")}</span>}
      </span>
    );
  }

  if (status === "rejected") {
    return (
      <span
        title={tx("Verification was rejected. Please re-submit valid documents.")}
        className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-rose-50 text-rose-700 border border-rose-200 ${
          size === "sm"
            ? "px-2 py-0.5 text-xs"
            : size === "md"
            ? "px-2.5 py-1 text-xs"
            : "px-3 py-1.5 text-sm"
        } ${className}`}
      >
        <AlertCircle size={iconSize} className="text-rose-600 shrink-0" />
        {showText && <span>{tx("Verification Rejected")}</span>}
      </span>
    );
  }

  return (
    <span
      title={tx("Identity verification required before booking or listing")}
      className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-slate-100 text-slate-600 border border-slate-200 ${
        size === "sm"
          ? "px-2 py-0.5 text-xs"
          : size === "md"
          ? "px-2.5 py-1 text-xs"
          : "px-3 py-1.5 text-sm"
      } ${className}`}
    >
      <ShieldAlert size={iconSize} className="text-slate-400 shrink-0" />
      {showText && <span>{tx("ID Unverified")}</span>}
    </span>
  );
};
