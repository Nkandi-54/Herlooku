import { NextResponse, type NextRequest } from "next/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const token_hash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const next = requestUrl.searchParams.get("next");
  const errorDescription = requestUrl.searchParams.get("error_description");

  const siteUrl = getSiteUrl(request);

  if (errorDescription) {
    return NextResponse.redirect(
      `${siteUrl}/login?error=${encodeURIComponent(errorDescription)}`,
    );
  }

  const supabase = await createServerSupabase();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return handlePostAuthRedirect(supabase, siteUrl, next);
    }
    console.error("Auth callback exchangeCodeForSession error:", error.message);
  } else if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    if (!error) {
      return handlePostAuthRedirect(supabase, siteUrl, next);
    }
    console.error("Auth callback verifyOtp error:", error.message);
  }

  // The link was missing, expired or already used. Do NOT claim success here:
  // redirecting with `confirmed=true` told users their address was verified
  // when it was not, which then dead-ends against the confirmation gate.
  return NextResponse.redirect(
    `${siteUrl}/login?error=${encodeURIComponent(
      "That link has expired or has already been used. Request a new one below.",
    )}`,
  );
}

async function handlePostAuthRedirect(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  siteUrl: string,
  nextParam: string | null,
) {
  if (nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")) {
    return NextResponse.redirect(`${siteUrl}${nextParam}`);
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const role = user.user_metadata?.role;
      if (role === "worker") {
        return NextResponse.redirect(`${siteUrl}/dashboard/worker`);
      }
      if (role === "client") {
        return NextResponse.redirect(`${siteUrl}/dashboard/client`);
      }
      if (role === "admin" || role === "super_admin") {
        return NextResponse.redirect(`${siteUrl}/admin`);
      }
    }
  } catch (err) {
    console.error("Failed to determine user role on auth callback:", err);
  }

  return NextResponse.redirect(`${siteUrl}/login?confirmed=true`);
}

