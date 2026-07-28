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
      <div className="mb-6 md:mb-8">
        <p className="text-sm font-medium text-[#657386]">SMS</p>
        <h1 className="mt-1 text-2xl font-semibold md:mt-2 md:text-3xl">Send message</h1>
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
