import { createBorrowerAction } from "@/backend/actions/lending-actions";

export function AddBorrowerForm() {
  return (
    <section className="mb-6 rounded-lg border border-[#dfe5ec] bg-white p-5 shadow-sm">
      <div className="mb-5">
        <p className="text-sm font-medium text-[#657386]">New borrower</p>
        <h2 className="mt-1 text-lg font-semibold">Add borrower profile</h2>
      </div>

      <form action={createBorrowerAction} className="grid gap-4 lg:grid-cols-5">
        <Field label="Name" name="name" placeholder="Avery Stone" required />
        <Field
          label="Business"
          name="business_name"
          placeholder="Stone Hardware"
        />
        <Field label="Phone" name="phone" placeholder="+1 555 0100" />
        <Field
          label="Address"
          name="address"
          placeholder="Main Street"
        />
        <div className="flex items-end">
          <button
            className="h-10 w-full rounded-md bg-[#15191f] px-4 text-sm font-semibold text-white transition hover:bg-[#2d3745]"
            type="submit"
          >
            Add borrower
          </button>
        </div>
      </form>
    </section>
  );
}

function Field({
  label,
  name,
  placeholder,
  required,
}: {
  label: string;
  name: string;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <label className="text-sm font-medium text-[#2d3745]">
      {label}
      <input
        className="mt-2 h-10 w-full rounded-md border border-[#cfd8e3] px-3 text-sm outline-none transition focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#dbeafe]"
        name={name}
        placeholder={placeholder}
        required={required}
      />
    </label>
  );
}
