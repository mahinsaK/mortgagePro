"use server";

import { revalidatePath } from "next/cache";
import {
  deleteLoanPayment,
  PaymentWriteError,
} from "@/backend/services/payment-recording-service";

export type DeletePaymentActionResult = {
  ok: boolean;
  message: string;
};

export async function deletePaymentAction(
  paymentId: string,
): Promise<DeletePaymentActionResult> {
  try {
    await deleteLoanPayment(paymentId);
  } catch (error) {
    if (error instanceof PaymentWriteError) {
      return { ok: false, message: error.message };
    }

    return {
      ok: false,
      message: "Unable to delete this payment safely. Please try again.",
    };
  }

  revalidatePath("/payments");
  revalidatePath("/payments/daily");
  revalidatePath("/loans");
  revalidatePath("/borrowers");
  revalidatePath("/dashboard/lender");

  return { ok: true, message: "Payment deleted." };
}
