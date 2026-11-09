import { randomUUID } from "node:crypto";
import { getPrimaryLender } from "@/server/services/lender-service";
import { getSmsManagementData } from "@/features/sms/server/sms-management-service";
import { getSmsUsageAndHistory } from "@/features/sms/server/sms-sending-service";
import { SmsWorkbench } from "@/features/sms/components/sms-workbench";
import { FeatureMaintenanceCover } from "@/components/maintenance/feature-maintenance-cover";
import { getFeatureAvailability } from "@/shared/feature-availability";

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
  const availability = getFeatureAvailability("sms");
  if (!availability.available) {
    return <FeatureMaintenanceCover {...availability} />;
  }

  const { count, message, phone, status } = await searchParams;
  const lender = await getPrimaryLender();
  const management = lender ? await getSmsManagementData(lender.id) : null;
  const reporting =
    lender && management
      ? await getSmsUsageAndHistory(
          lender.id,
          management.account?.monthlyQuota ?? 0,
        )
      : null;

  return (
    <div>
      <div className="mb-6 md:mb-8">
        <p className="text-sm font-medium text-[#657386]">SMS</p>
        <h1 className="mt-1 text-2xl font-semibold md:mt-2 md:text-3xl">Send message</h1>
      </div>

      <SmsWorkbench
        count={count}
        management={management}
        message={message}
        phone={phone}
        reporting={reporting}
        requestIds={{
          all: randomUUID(),
          selected: randomUUID(),
        }}
        status={status}
      />
    </div>
  );
}
