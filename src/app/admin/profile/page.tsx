"use client";

import React, { useState, useEffect } from "react";
import {
  Save,
  CheckCircle2,
  ShieldCheck,
  Camera,
  Settings2,
} from "lucide-react";
import { User } from "@/types";
import { AvatarUpload } from "@/components/AvatarUpload";
import { VerificationBadge } from "@/components/VerificationBadge";

export default function AdminProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
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

  /** Instantly persist avatar changes (upload/remove). */
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
        body: JSON.stringify({ name, location, avatar }),
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
        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-400">
          Loading administrator profile...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">
            Administrator Profile
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage your command-center identity, display name and profile photo.
          </p>
        </div>
        {user && <VerificationBadge status={user.idVerificationStatus} />}
      </div>

      {success && (
        <div className="p-3.5 bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>Administrator profile saved successfully!</span>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-slate-900/70 rounded-2xl p-6 sm:p-8 border border-slate-800/80 shadow-lg space-y-6"
      >
        {/* Profile Photo Upload */}
        <div className="pb-2 border-b border-slate-800/80">
          <AvatarUpload
            value={avatar}
            name={name}
            size={88}
            label="Administrator Profile Photo"
            onChange={setAvatar}
            onPersist={persistAvatar}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block">
              Display Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-xs font-semibold bg-slate-950/80 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block">
              Account Phone
            </label>
            <input
              type="text"
              disabled
              value={phone}
              className="w-full text-xs font-semibold bg-slate-800/60 border border-slate-700 rounded-xl p-3 text-slate-500 cursor-not-allowed"
            />
            <span className="text-[10px] text-slate-500">
              Locked at account creation
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300 block">
            Office / Location Label
          </label>
          <input
            type="text"
            placeholder="e.g. Nairobi Headquarters"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full text-xs font-semibold bg-slate-950/80 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="p-4 bg-purple-950/20 border border-purple-500/20 rounded-xl text-[11px] text-slate-300 flex items-start gap-2.5">
          <Settings2 size={16} className="text-purple-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Your profile photo and display name appear in the admin sidebar,
            verification queue and community directory. Changes apply instantly
            across the command center.
          </p>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-purple-600/20 flex items-center gap-2"
          >
            <Save size={15} />
            <span>
              {saving ? "Saving Changes..." : "Save Administrator Profile"}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}
