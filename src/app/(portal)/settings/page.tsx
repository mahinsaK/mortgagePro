import {
  updateLenderProfileAction,
} from "@/backend/actions/lending-actions";
import { logoutAllLenderDevicesAction } from "@/backend/actions/auth-actions";
import { currencyOptions } from "@/backend/lib/currency";
import { getPrimaryLender } from "@/backend/services/lender-service";
import { PhoneInput } from "@/frontend/components/forms/phone-input";
import { LenderPasswordForm } from "@/frontend/components/settings/lender-password-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const lender = await getPrimaryLender();
  const contact = parseContactInfo(lender?.contactInfo ?? "");

  return (
    <div>
      <div className="mb-6 md:mb-8">
        <p className="text-sm font-medium text-[#657386]">Settings</p>
        <h1 className="mt-1 text-2xl font-semibold md:mt-2 md:text-3xl">Lender profile</h1>
      </div>

      <section className="max-w-3xl rounded-lg border border-[#dfe5ec] bg-white p-4 shadow-sm md:p-5">
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
          <ReadOnlyField label="Email" value={lender?.email || "Not set"} />
          <label className="text-sm font-medium text-[#2d3745]">
            Phone
            <PhoneInput
              className="mt-2 h-10 w-full rounded-md border border-[#cfd8e3] px-3 text-sm outline-none transition focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#dbeafe]"
              defaultValue={contact.phone}
              name="phone"
            />
          </label>
          <Field
            defaultValue={contact.address}
            label="Address"
            name="address"
          />
          <ReadOnlyField
            label="Status"
            value={formatStatus(lender?.status)}
          />
          <label className="text-sm font-medium text-[#2d3745]">
            App currency
            <select
              className="mt-2 h-10 w-full rounded-md border border-[#cfd8e3] bg-white px-3 text-sm outline-none transition focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#dbeafe]"
              defaultValue={lender?.currency ?? "USD"}
              name="currency"
            >
              {currencyOptions.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.label}
                </option>
              ))}
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

      <section className="mt-5 max-w-3xl rounded-lg border border-[#dfe5ec] bg-white p-4 shadow-sm md:mt-6 md:p-5">
        <div className="mb-5">
          <p className="text-sm font-medium text-[#657386]">Security</p>
          <h2 className="mt-1 text-lg font-semibold">Change password</h2>
          <p className="mt-2 text-sm text-[#657386]">
            Changing your password signs this account out on every device.
          </p>
        </div>

        <LenderPasswordForm />
      </section>

      <section className="mt-5 max-w-3xl rounded-lg border border-[#dfe5ec] bg-white p-4 shadow-sm md:mt-6 md:p-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-[#657386]">Device sessions</p>
            <h2 className="mt-1 text-lg font-semibold">Log out everywhere</h2>
            <p className="mt-2 text-sm text-[#657386]">
              Close your lender session on this device and every other device.
            </p>
          </div>
          <form action={logoutAllLenderDevicesAction}>
            <button
              className="h-10 w-full rounded-md border border-[#dc2626] px-4 text-sm font-semibold text-[#b91c1c] transition hover:bg-[#fef2f2] sm:w-auto"
              type="submit"
            >
              Log out all devices
            </button>
          </form>
        </div>
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
  type?: "email" | "password" | "text";
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

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-sm font-medium text-[#2d3745]">
      <p>{label}</p>
      <p className="mt-2 flex min-h-10 items-center rounded-md border border-[#dfe5ec] bg-[#f6f7f9] px-3 text-sm text-[#657386]">
        {value}
      </p>
    </div>
  );
}

function formatStatus(status: string | undefined) {
  if (!status) {
    return "Unknown";
  }

  return `${status.charAt(0).toUpperCase()}${status.slice(1)}`;
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
