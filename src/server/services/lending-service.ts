/** Compatibility entry point for lender-scoped record queries and display models. */
export type {
  BorrowerAttentionFilter,
  BorrowerProfileData,
  BorrowerRow,
  CollectorRow,
  DailyCollectionCollector,
  LoanAttentionFilter,
  LoanPaymentDetails,
  LoanRow,
  PageInfo,
  PaymentRow,
} from "@/shared/lending-types";

export {
  getBorrowerLoansPageData,
  getBorrowerProfileData,
  getBorrowersExportData,
  getBorrowersPageData,
} from "@/features/borrowers/server/borrower-query-service";
export {
  getDailyCollectionCollectors,
  getCollectorsPageData,
} from "@/features/collectors/server/collector-query-service";
export {
  getLoansPageData,
  loanBelongsToActiveLender,
} from "@/features/loans/server/loan-query-service";
export {
  getDailyCollectionsData,
  getLoanPaymentDetails,
  getPaymentsExportData,
  getPaymentsPageData,
} from "@/features/payments/server/payment-query-service";
