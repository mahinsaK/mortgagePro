import { NotificationsPageContent } from "@/frontend/components/notifications/local-notifications";

export const dynamic = "force-dynamic";

export default function NotificationsPage() {
  return (
    <div>
      <div className="mb-6 md:mb-8">
        <p className="text-sm font-medium text-[#657386]">Notifications</p>
        <h1 className="mt-1 text-2xl font-semibold md:mt-2 md:text-3xl">
          Local advice
        </h1>
      </div>

      <NotificationsPageContent />
    </div>
  );
}
