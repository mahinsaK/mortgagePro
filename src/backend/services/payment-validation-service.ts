type LoanOwnershipInput = {
  collectorLenderId: string;
  loanLenderId: string;
};

export function validateCollectorCanCollectLoan({
  collectorLenderId,
  loanLenderId,
}: LoanOwnershipInput) {
  if (collectorLenderId !== loanLenderId) {
    return {
      ok: false as const,
      reason: "This loan belongs to another lender.",
    };
  }

  return {
    ok: true as const,
  };
}
