import { updateLenderProfileAction } from "@/backend/actions/lending-actions";
import { getPrimaryLender } from "@/backend/services/lender-service";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const lender = await getPrimaryLender();
  const contact = parseContactInfo(lender?.contactInfo ?? "");

  return (
    <div>
      <div className="mb-8">
        <p className="text-sm font-medium text-[#657386]">Settings</p>
        <h1 className="mt-2 text-3xl font-semibold">Lender profile</h1>
      </div>

      <section className="max-w-3xl rounded-lg border border-[#dfe5ec] bg-white p-5 shadow-sm">
        <div className="mb-5">
          <p className="text-sm font-medium text-[#657386]">Business details</p>
          <h2 className="mt-1 text-lg font-semibold">Update profile</h2>
        </div>

        <form action={updateLenderProfileAction} className="grid gap-4 sm:grid-cols-2">
          <Field
            defaultValue={lender?.companyName ?? ""}
            label="Company name"
            name="company_name"
            required
          />
          <Field
            defaultValue={lender?.email ?? ""}
            label="Email"
            name="email"
            required
            type="email"
          />
          <Field defaultValue={contact.phone} label="Phone" name="phone" />
          <Field
            defaultValue={contact.address}
            label="Address"
            name="address"
          />
          <label className="text-sm font-medium text-[#2d3745]">
            Status
            <select
              className="mt-2 h-10 w-full rounded-md border border-[#cfd8e3] bg-white px-3 text-sm outline-none transition focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#dbeafe]"
              defaultValue={lender?.status ?? "active"}
              name="status"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          <div className="flex items-end">
            <button
              className="h-10 w-full rounded-md bg-[#15191f] px-4 text-sm font-semibold text-white transition hover:bg-[#2d3745]"
              type="submit"
            >
              Save profile
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function Field({
  defaultValue,
  label,
  name,
  required,
  type = "text",
}: {
  defaultValue: string;
  label: string;
  name: string;
  required?: boolean;
  type?: "email" | "text";
}) {
  return (
    <label className="text-sm font-medium text-[#2d3745]">
      {label}
      <input
        className="mt-2 h-10 w-full rounded-md border border-[#cfd8e3] px-3 text-sm outline-none transition focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#dbeafe]"
        defaultValue={defaultValue}
        name={name}
        required={required}
        type={type}
      />
    </label>
  );
}

function parseContactInfo(value: string) {
  if (!value) {
    return { phone: "", address: "" };
  }

  try {
    const parsed = JSON.parse(value) as Record<string, string>;
    return {
      phone: parsed.phone ?? "",
      address: parsed.address ?? parsed.area ?? "",
    };
  } catch {
    return { phone: value, address: "" };
  }
}
