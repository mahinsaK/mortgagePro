import { AuthenticationServiceUnavailableError } from "@/backend/services/auth-session-service";
import { getDashboardOverdueLoans } from "@/backend/services/dashboard-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const asOf = new URL(request.url).searchParams.get("asOf") ?? "";

  try {
    const result = await getDashboardOverdueLoans(asOf);
    if (!result) {
      return Response.json(
        { error: "Lender login is required." },
        { status: 401 },
      );
    }

    return Response.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      !(error instanceof AuthenticationServiceUnavailableError) &&
      error.message.startsWith("asOf must")
    ) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    return Response.json(
      { error: "Overdue loans are temporarily unavailable." },
      { status: 503 },
    );
  }
}
