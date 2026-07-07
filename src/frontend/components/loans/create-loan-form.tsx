import { createLoanForBorrowerAction } from "@/backend/actions/lending-actions";

export function CreateLoanForm({ borrowerId }: { borrowerId: string }) {
  return (
    <section className="mb-6 rounded-lg border border-[#dfe5ec] bg-white p-5 shadow-sm">
      <div className="mb-5">
        <p className="text-sm font-medium text-[#657386]">New loan</p>
        <h2 className="mt-1 text-lg font-semibold">Create loan for borrower</h2>
      </div>

      <form
        action={createLoanForBorrowerAction}
        className="grid gap-4 lg:grid-cols-6"
      >
        <input name="borrower_id" type="hidden" value={borrowerId} />
        <Field
          label="Amount"
          min="1"
          name="amount"
          placeholder="2500"
          required
          step="0.01"
          type="number"
        />
        <Field
          label="Interest"
          min="0"
          name="interest_rate"
          placeholder="8"
          required
          step="0.01"
          type="number"
        />
        <Field
          label="Daily payment"
          min="0"
          name="daily_payment"
          placeholder="50"
          required
          step="0.01"
          type="number"
        />
        <Field label="Start date" name="start_date" required type="date" />
        <Field label="End date" name="end_date" required type="date" />
        <div className="flex items-end">
          <button
            className="h-10 w-full rounded-md bg-[#15191f] px-4 text-sm font-semibold text-white transition hover:bg-[#2d3745]"
            type="submit"
          >
            Create loan
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
  type,
  min,
  step,
}: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  type: "date" | "number";
  min?: string;
  step?: string;
}) {
  return (
    <label className="text-sm font-medium text-[#2d3745]">
      {label}
      <input
        className="mt-2 h-10 w-full rounded-md border border-[#cfd8e3] px-3 text-sm outline-none transition focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#dbeafe]"
        min={min}
        name={name}
        placeholder={placeholder}
        required={required}
        step={step}
        type={type}
      />
    </label>
  );
}
