export const userRoles = {
  lender: "lender",
  collector: "collector",
  borrower: "borrower",
} as const;

export type UserRole = (typeof userRoles)[keyof typeof userRoles];
