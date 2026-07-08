import { SmsWorkbench } from "@/frontend/components/sms/sms-workbench";

export const dynamic = "force-dynamic";

export default async function SmsPage({
  searchParams,
}: {
  searchParams: Promise<{
    count?: string;
    message?: string;
    phone?: string;
    status?: string;
  }>;
}) {
  const { count, message, phone, status } = await searchParams;

  return (
    <div>
      <div className="mb-8">
        <p className="text-sm font-medium text-[#657386]">SMS</p>
        <h1 className="mt-2 text-3xl font-semibold">Send message</h1>
      </div>

      <SmsWorkbench
        count={count}
        message={message}
        phone={phone}
        status={status}
      />
    </div>
  );
}
