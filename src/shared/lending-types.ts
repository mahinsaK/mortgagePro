// Public display models and bounded query options shared across route boundaries.

export type BorrowerRow = {
  id: string;
  name: string;
  businessName: string;
  contactInfo: string;
  addressInfo: string;
  status: string;
  createdAt: string;
  loanCount?: number;
  activeLoanCount?: number;
  completedLoanCount?: number;
};

export type LoanRow = {
  id: string;
  borrowerId: string;
  borrowerName: string;
  amount: string;
  amountValue: string;
  totalPaid: string;
  remainingAmount: string;
  interestRate: string;
  interestRateValue: string;
  dailyPayment: string;
  dailyPaymentValue: string;
  startDate: string;
  startDateInput: string;
  endDate: string;
  endDateInput: string;
  status: string;
};

export type BorrowerProfileData = {
  borrower: BorrowerRow | null;
  currency: string;
  loans: LoanRow[];
  pageInfo: PageInfo;
};

export type CollectorRow = {
  id: string;
  username: string;
  name: string;
  contactInfo: string;
  areaInfo: string;
  status: string;
  createdAt: string;
};

export type PaymentRow = {
  id: string;
  loanId: string;
  borrowerName: string;
  collectorName: string;
  amount: string;
  amountValue: number;
  method: string;
  date: string;
  rawDate: string;
  recordedAt: string;
};

export type LoanPaymentDetails = {
  loanId: string;
  borrowerName: string;
  totalPaid: string;
  remaining: string;
  payments: Array<{
    id: string;
    amount: string;
    collectorName: string;
    method: string;
    date: string;
    recordedAt: string;
  }>;
};

export type PageInfo = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type PaginationOptions = {
  page?: number;
  pageSize?: number;
};

export type BorrowerAttentionFilter = "missing-phone";
export type LoanAttentionFilter = "overdue" | "ending-today" | "ending-soon";

export type BorrowersPageOptions = PaginationOptions & {
  attention?: BorrowerAttentionFilter;
  query?: string;
};

export type LoansPageOptions = PaginationOptions & {
  attention?: LoanAttentionFilter;
  asOf?: string;
};

export type BorrowerProfileOptions = PaginationOptions & {
  loanStatus?: "completed";
};

export type DailyCollectionsOptions = PaginationOptions & {
  collectorId?: string;
};

export type DailyCollectionCollector = {
  id: string;
  name: string;
};
