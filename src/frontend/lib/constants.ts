export const roles = {
  lender: "lender",
  collector: "collector",
  borrower: "borrower",
} as const;

export const routes = {
  login: "/auth/login",
  lenderDashboard: "/dashboard/lender",
  collectorDashboard: "/dashboard/collector",
  borrowerDashboard: "/dashboard/borrower",
} as const;
