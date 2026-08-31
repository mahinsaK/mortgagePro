import { searchBorrowerSmsRecipients } from "@/backend/services/sms-recipient-service";
import { isFeatureAvailable } from "@/shared/feature-availability";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isFeatureAvailable("sms")) {
    return Response.json(
      { error: "SMS is currently under maintenance." },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";
  const recipients = await searchBorrowerSmsRecipients(query);

  return Response.json({ recipients });
}
