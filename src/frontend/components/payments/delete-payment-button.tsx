"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deletePaymentAction } from "@/backend/actions/payment-actions";

const DELETE_WARNING =
  "Delete this payment permanently?\n\nOnly continue if this payment was recorded by mistake. The amount will be removed from the loan's total paid, the remaining balance will increase, and this action cannot be undone.";

export function DeletePaymentButton({
  paymentId,
  onDeleted,
}: {
  paymentId: string;
  onDeleted?: () => void | Promise<void>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function deletePayment() {
    if (!window.confirm(DELETE_WARNING)) {
      return;
    }

    startTransition(async () => {
      const result = await deletePaymentAction(paymentId);

      if (!result.ok) {
        window.alert(result.message);
        return;
      }

      router.refresh();
      await onDeleted?.();
    });
  }

  return (
    <button
      aria-label="Delete payment"
      className="flex size-9 shrink-0 items-center justify-center rounded-md border border-[#fecaca] text-[#b91c1c] transition hover:bg-[#fef2f2] disabled:cursor-not-allowed disabled:opacity-50"
      disabled={isPending}
      onClick={deletePayment}
      title="Delete payment"
      type="button"
    >
      <Trash2 aria-hidden="true" size={16} />
    </button>
  );
}
