"use client";

import React, { useState, useEffect } from "react";
import {
  User as UserIcon,
  MapPin,
  Phone,
  Home,
  FileText,
  Save,
  CheckCircle2,
  ShieldCheck,
  Lock,
} from "lucide-react";
import { User } from "@/types";
import { VerificationBadge } from "@/components/VerificationBadge";
import { AvatarUpload } from "@/components/AvatarUpload";
import { useLanguage } from "@/i18n/LanguageContext";

export default function ClientProfilePage() {
  const { t } = useLanguage();
  const tx = (copy: string) => t(`copy:${copy}`);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [householdSize, setHouseholdSize] = useState("");
  const [householdNotes, setHouseholdNotes] = useState("");
  const [avatar, setAvatar] = useState("");

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setName(data.user.name || "");
        setLocation(data.user.location || "");
        setPhone(data.user.phone || "");
        setHouseholdSize(data.user.householdSize || "");
        setHouseholdNotes(data.user.householdNotes || "");
        setAvatar(data.user.avatar || "");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  /** Instantly persist avatar changes (upload/remove) without waiting for form save. */
  const persistAvatar = async (url: string) => {
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: url }),
      });
      if (res.ok) {
        window.dispatchEvent(new Event("auth-changed"));
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          location,
          householdSize,
          householdNotes,
          avatar,
        }),
      });

      if (res.ok) {
        setSuccess(true);
        window.dispatchEvent(new Event("auth-changed"));
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500">{tx("Loading household profile...")}</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">{tx("Edit Household Profile")}</h1>
        <p className="text-xs text-slate-500 mt-1">
          {tx("Manage your household details and service requirements.")}
        </p>
      </div>

      {/* Privacy Guarantee Banner */}
      <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-start gap-3 text-xs shadow-sm">
        <Lock size={18} className="text-sky-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-sky-300">{tx("Privacy & Contact Protection")}</span>
          <p className="text-slate-300 leading-relaxed text-[11px]">
            {tx("Workers cannot view your telephone number or personal contact details. All booking dispatch and arrival schedules are coordinated exclusively through Herlooku Task Ninja.")}
          </p>
        </div>
      </div>

      {success && (
        <div className="p-3.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{tx("Household profile saved successfully!")}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
        {/* Profile Photo Upload */}
        <div className="pb-1 border-b border-slate-100">
          <AvatarUpload
            value={avatar}
            name={name}
            size={88}
            label={tx("Client / Household Profile Photo")}
            onChange={setAvatar}
            onPersist={persistAvatar}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">{tx("Client / Household Name")}</label>
            <input
              type="text"
              required
              aria-label={tx("Client / Household Name")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">{tx("Account Phone (For SMS/Dispatch)")}</label>
            <input
              type="text"
              disabled
              aria-label={tx("Account Phone (For SMS/Dispatch)")}
              value={phone}
              className="w-full text-xs font-semibold bg-slate-100 border border-slate-200 rounded-xl p-3 text-slate-500 cursor-not-allowed"
            />
            <span className="text-[10px] text-slate-400">{tx("Verified during account setup")}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">{tx("Household Area & Neighborhood")}</label>
            <input
              type="text"
              required
              aria-label={tx("Household Area & Neighborhood")}
              placeholder={tx("e.g. Westlands, Nairobi")}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">{tx("Household Composition")}</label>
            <input
              type="text"
              aria-label={tx("Household Composition")}
              placeholder={tx("e.g. 2 Adults, 1 Toddler, 1 Cat")}
              value={householdSize}
              onChange={(e) => setHouseholdSize(e.target.value)}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">{tx("Profile Photo URL (optional)")}</label>
          <input
            type="text"
            aria-label={tx("Profile Photo URL (optional)")}
            value={avatar}
            onChange={(e) => setAvatar(e.target.value)}
            placeholder={tx("Upload a photo above, or paste an image URL")}
            className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">
            {tx("Household Guidelines & Task Expectations")}
          </label>
          <textarea
            rows={3}
            aria-label={tx("Household Guidelines & Task Expectations")}
            placeholder={tx("e.g. We require punctuality, gentle care with toddlers, and organic meal preparation...")}
            value={householdNotes}
            onChange={(e) => setHouseholdNotes(e.target.value)}
            className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
          >
            <Save size={14} />
            <span>{tx(saving ? "Saving Changes..." : "Save Household Profile")}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
