import { searchBorrowerSmsRecipients } from "@/backend/services/sms-recipient-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";
  const recipients = await searchBorrowerSmsRecipients(query);

  return Response.json({ recipients });
}
