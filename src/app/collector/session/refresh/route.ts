import { NextResponse } from "next/server";
import { refreshActiveCollectorSession } from "@/backend/services/collector-auth-service";

export async function POST() {
  try {
    const session = await refreshActiveCollectorSession();

    if (!session) {
      return sessionResponse({ status: "invalid" }, 401);
    }

    return sessionResponse({ status: "refreshed" });
  } catch {
    return sessionResponse({ status: "unavailable" }, 503);
  }
}

function sessionResponse(body: { status: string }, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
