import { AuthenticationServiceUnavailableError } from "@/backend/services/auth-session-service";
import { getLocalLenderNotifications } from "@/backend/services/local-notification-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);

  try {
    const result = await getLocalLenderNotifications({
      localDate: url.searchParams.get("localDate"),
      timezoneOffsetMinutes: url.searchParams.get("timezoneOffsetMinutes"),
    });

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
    if (isValidationError(error)) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    return Response.json(
      { error: "Notifications are temporarily unavailable." },
      { status: 503 },
    );
  }
}

function isValidationError(error: unknown): error is Error {
  return (
    error instanceof Error &&
    !(error instanceof AuthenticationServiceUnavailableError) &&
    ["localDate", "timezoneOffsetMinutes"].some((field) =>
      error.message.startsWith(field),
    )
  );
}
