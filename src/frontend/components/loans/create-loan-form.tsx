"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Calculator, Check, Plus, X } from "lucide-react";
import { useActionState, useMemo, useRef, useState } from "react";
import {
  createLoanForBorrowerFormAction,
  type CreateLoanActionState,
} from "@/backend/actions/lending-actions";
import {
  addDateOnlyDays,
  calculateLoanPlan,
  type LoanInterestMethod,
  type LoanPlan,
} from "@/frontend/lib/loan-calculator";
import { LoanDatePicker } from "./loan-date-picker";

const INITIAL_ACTION_STATE: CreateLoanActionState = {
  status: "idle",
  message: "",
};

export function CreateLoanForm({
  borrowerId,
  currency,
  defaultStartDate,
}: {
  borrowerId: string;
  currency: string;
  defaultStartDate: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog.Root onOpenChange={setIsOpen} open={isOpen}>
      <Dialog.Trigger asChild>
        <button
          className="flex h-10 items-center gap-2 rounded-md bg-[#15191f] px-4 text-sm font-semibold text-white transition hover:bg-[#2d3745]"
          type="button"
        >
          <Plus aria-hidden="true" size={17} />
          Create loan
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 max-h-[100dvh] overflow-y-auto rounded-t-2xl border border-[#dfe5ec] bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-[#15191f] shadow-xl sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:w-[min(1040px,calc(100vw-32px))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg font-semibold">
                Create loan
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-[#657386]">
                Calculate a repayment plan, review it, and create the loan.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                aria-label="Close"
                className="flex size-9 shrink-0 items-center justify-center rounded-md border border-[#dfe5ec] text-[#657386] transition hover:bg-[#f8fafc]"
                type="button"
              >
                <X aria-hidden="true" size={17} />
              </button>
            </Dialog.Close>
          </div>

          <CreateLoanActionForm
            borrowerId={borrowerId}
            currency={currency}
            defaultStartDate={defaultStartDate}
            onSuccess={() => setIsOpen(false)}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function CreateLoanActionForm({
  borrowerId,
  currency,
  defaultStartDate,
  onSuccess,
}: {
  borrowerId: string;
  currency: string;
  defaultStartDate: string;
  onSuccess: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [amount, setAmount] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [dailyPayment, setDailyPayment] = useState("");
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState("");
  const [clientError, setClientError] = useState("");

  function resetForm() {
    setAmount("");
    setInterestRate("");
    setDailyPayment("");
    setStartDate(defaultStartDate);
    setEndDate("");
    setClientError("");
  }

  const [actionState, formAction, isPending] = useActionState(
    async (previousState: CreateLoanActionState, formData: FormData) => {
      const result = await createLoanForBorrowerFormAction(
        previousState,
        formData,
      );

      if (result.status === "success") {
        formRef.current?.reset();
        resetForm();
        onSuccess();
      }

      return result;
    },
    INITIAL_ACTION_STATE,
  );

  function applyPlan(plan: LoanPlan, rate: number) {
    setAmount(toInputNumber(plan.totalRepayable));
    setInterestRate(toInputNumber(rate));
    setDailyPayment(toInputNumber(plan.suggestedDailyPayment));
    setEndDate(plan.endDate);
    setClientError("");
  }

  function changeStartDate(nextDate: string) {
    setStartDate(nextDate);
    if (endDate && endDate <= nextDate) {
      setEndDate(addDateOnlyDays(nextDate, 1));
    }
  }

  const errorMessage =
    clientError || (actionState.status === "error" ? actionState.message : "");

  return (
    <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
      <LoanCalculator
        currency={currency}
        onApply={applyPlan}
        startDate={startDate}
      />

      <form
        action={formAction}
        className="grid content-start gap-4 rounded-xl border border-[#dfe5ec] bg-[#fbfcfe] p-4 sm:grid-cols-2 sm:p-5"
        onSubmit={(event) => {
          if (!endDate) {
            event.preventDefault();
            setClientError("Choose an end date before creating the loan.");
          } else if (endDate <= startDate) {
            event.preventDefault();
            setClientError("The end date must be after the start date.");
          } else {
            setClientError("");
          }
        }}
        ref={formRef}
      >
        <div className="sm:col-span-2">
          <p className="text-sm font-semibold text-[#15191f]">Loan details</p>
          <p className="mt-1 text-xs leading-5 text-[#657386]">
            You can enter values manually or apply the calculator estimate.
          </p>
        </div>
        <input name="borrower_id" type="hidden" value={borrowerId} />
        <NumberField
          label="Total repayable amount"
          min="1"
          name="amount"
          onChange={setAmount}
          placeholder="2500"
          value={amount}
        />
        <NumberField
          label="Interest rate (%)"
          min="0"
          name="interest_rate"
          onChange={setInterestRate}
          placeholder="8"
          value={interestRate}
        />
        <NumberField
          label="Daily payment"
          min="0.01"
          name="daily_payment"
          onChange={setDailyPayment}
          placeholder="50"
          value={dailyPayment}
        />
        <div className="hidden sm:block" />
        <LoanDatePicker
          label="Start date"
          name="start_date"
          onChange={changeStartDate}
          value={startDate}
        />
        <LoanDatePicker
          label="End date"
          min={addDateOnlyDays(startDate, 1)}
          name="end_date"
          onChange={(value) => {
            setEndDate(value);
            setClientError("");
          }}
          value={endDate}
        />
        {errorMessage ? (
          <p
            aria-live="polite"
            className="rounded-md border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-sm text-[#b91c1c] sm:col-span-2"
            role="alert"
          >
            {errorMessage}
          </p>
        ) : null}
        <div className="flex items-end sm:col-span-2">
          <button
            className="h-11 w-full rounded-md bg-[#15191f] px-4 text-sm font-semibold text-white transition hover:bg-[#2d3745] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending}
            type="submit"
          >
            {isPending ? "Creating loan..." : "Create loan"}
          </button>
        </div>
      </form>
    </div>
  );
}

function LoanCalculator({
  currency,
  onApply,
  startDate,
}: {
  currency: string;
  onApply: (plan: LoanPlan, rate: number) => void;
  startDate: string;
}) {
  const [capital, setCapital] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [termDays, setTermDays] = useState("30");
  const [method, setMethod] = useState<LoanInterestMethod>("flat");
  const numericRate = Number(interestRate);
  const plan = useMemo(
    () =>
      calculateLoanPlan({
        capital: Number(capital),
        interestRate: numericRate,
        method,
        startDate,
        termDays: Number(termDays),
      }),
    [capital, method, numericRate, startDate, termDays],
  );

  return (
    <section className="rounded-xl bg-[#172033] p-4 text-white shadow-sm sm:p-5">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-lg bg-white/10 text-[#93c5fd]">
          <Calculator aria-hidden="true" size={20} />
        </span>
        <div>
          <h2 className="font-semibold">Repayment calculator</h2>
          <p className="mt-0.5 text-xs text-[#b9c7dc]">Plan before creating the loan</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        <CalculatorField
          label="Capital"
          min="1"
          onChange={setCapital}
          placeholder="100,000"
          value={capital}
        />
        <CalculatorField
          label="Interest rate (%)"
          min="0"
          onChange={setInterestRate}
          placeholder="10"
          value={interestRate}
        />
        <label className="text-xs font-semibold text-[#d7e0ee]">
          Interest method
          <select
            className="mt-2 h-10 w-full rounded-md border border-white/15 bg-white/10 px-3 text-sm text-white outline-none focus:border-[#93c5fd] focus:ring-2 focus:ring-[#1d4ed8]"
            onChange={(event) =>
              setMethod(event.target.value as LoanInterestMethod)
            }
            value={method}
          >
            <option className="text-[#15191f]" value="flat">
              Flat rate for the term
            </option>
            <option className="text-[#15191f]" value="annual">
              Annual simple interest
            </option>
          </select>
        </label>
        <CalculatorField
          label="Repayment term (days)"
          max="3650"
          min="1"
          onChange={setTermDays}
          placeholder="30"
          step="1"
          value={termDays}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Common repayment terms">
        {[7, 14, 30, 60, 90].map((days) => (
          <button
            className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
              termDays === String(days)
                ? "bg-[#2563eb] text-white"
                : "bg-white/10 text-[#d7e0ee] hover:bg-white/15"
            }`}
            key={days}
            onClick={() => setTermDays(String(days))}
            type="button"
          >
            {days} days
          </button>
        ))}
      </div>

      <div className="mt-5 rounded-lg border border-white/10 bg-black/15 p-4">
        {plan ? (
          <dl className="space-y-2.5 text-sm">
            <CalculatorResult label="Capital" value={formatMoney(plan.capital, currency)} />
            <CalculatorResult
              label="Interest"
              value={formatMoney(plan.interestAmount, currency)}
            />
            <CalculatorResult
              emphasized
              label="Total repayable"
              value={formatMoney(plan.totalRepayable, currency)}
            />
            <CalculatorResult
              label="Suggested daily payment"
              value={formatMoney(plan.suggestedDailyPayment, currency)}
            />
            <CalculatorResult label="Estimated end date" value={formatDate(plan.endDate)} />
          </dl>
        ) : (
          <p className="py-4 text-center text-sm leading-6 text-[#b9c7dc]">
            Enter the capital, interest rate, and repayment term to see the plan.
          </p>
        )}
      </div>

      <button
        className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-white text-sm font-semibold text-[#172033] transition hover:bg-[#eef4ff] disabled:cursor-not-allowed disabled:opacity-45"
        disabled={!plan}
        onClick={() => {
          if (plan) onApply(plan, numericRate);
        }}
        type="button"
      >
        <Check aria-hidden="true" size={16} />
        Use this calculation
      </button>
      <p className="mt-3 text-xs leading-5 text-[#9eabc0]">
        This is an estimate. Confirm the agreed rate and repayment period before creating the loan.
      </p>
    </section>
  );
}

function NumberField({
  label,
  min,
  name,
  onChange,
  placeholder,
  value,
}: {
  label: string;
  min: string;
  name: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <label className="text-sm font-medium text-[#2d3745]">
      {label}
      <input
        className="mt-2 h-11 w-full rounded-md border border-[#cfd8e3] bg-white px-3 text-sm outline-none transition focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#dbeafe]"
        inputMode="decimal"
        min={min}
        name={name}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required
        step="0.01"
        type="number"
        value={value}
      />
    </label>
  );
}

function CalculatorField({
  label,
  max,
  min,
  onChange,
  placeholder,
  step = "0.01",
  value,
}: {
  label: string;
  max?: string;
  min: string;
  onChange: (value: string) => void;
  placeholder: string;
  step?: string;
  value: string;
}) {
  return (
    <label className="text-xs font-semibold text-[#d7e0ee]">
      {label}
      <input
        className="mt-2 h-10 w-full rounded-md border border-white/15 bg-white/10 px-3 text-sm text-white outline-none placeholder:text-[#8290a6] focus:border-[#93c5fd] focus:ring-2 focus:ring-[#1d4ed8]"
        inputMode="decimal"
        max={max}
        min={min}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        step={step}
        type="number"
        value={value}
      />
    </label>
  );
}

function CalculatorResult({
  emphasized = false,
  label,
  value,
}: {
  emphasized?: boolean;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-[#b9c7dc]">{label}</dt>
      <dd className={emphasized ? "font-semibold text-[#93c5fd]" : "font-medium text-white"}>
        {value}
      </dd>
    </div>
  );
}

function formatMoney(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      currency,
      maximumFractionDigits: 2,
      style: "currency",
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function toInputNumber(value: number) {
  return value.toFixed(2).replace(/\.00$/, "");
}
