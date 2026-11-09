import "server-only";
import { Query } from "@/server/appwrite/server-client";
import { listTenantDocuments, type TenantCollection, type TenantDocument } from "@/server/services/tenant-data-service";
import type { PaginationOptions } from "@/shared/lending-types";

export const DEFAULT_PAGE_SIZE = 10;

export const BORROWER_PROFILE_LOAN_PAGE_SIZE = 5;

export const MAX_LOOKUP_LIMIT = 5000;

export function listForLender(
  collection: TenantCollection,
  lenderId: string,
  options: PaginationOptions & {
    extraQueries?: string[];
    limit?: number;
    orderBy?: string | string[];
    select?: string[];
  } = {},
) {
  const queries = [
    ...(options.extraQueries ?? []),
  ];

  if (options.orderBy) {
    const orderAttributes = Array.isArray(options.orderBy)
      ? options.orderBy
      : [options.orderBy];
    queries.push(
      ...orderAttributes.map((attribute) => Query.orderDesc(attribute)),
    );
  }

  if (options.select) {
    queries.push(Query.select(options.select));
  }

  if (options.page && options.pageSize) {
    queries.push(Query.limit(options.pageSize));
    queries.push(Query.offset((options.page - 1) * options.pageSize));
  } else {
    queries.push(Query.limit(options.limit ?? DEFAULT_PAGE_SIZE));
  }

  return listTenantDocuments(collection, lenderId, queries);
}

export function newestFirst(documents: TenantDocument[]) {
  return [...documents].sort((left, right) => {
    const leftDate = Date.parse(String(left.created_at ?? left.$createdAt ?? ""));
    const rightDate = Date.parse(String(right.created_at ?? right.$createdAt ?? ""));
    return (Number.isNaN(rightDate) ? 0 : rightDate) -
      (Number.isNaN(leftDate) ? 0 : leftDate);
  });
}

export function paginatedDocuments(
  documents: TenantDocument[],
  pagination: { page: number; pageSize: number },
) {
  const offset = (pagination.page - 1) * pagination.pageSize;
  return {
    documents: documents.slice(offset, offset + pagination.pageSize),
    total: documents.length,
  };
}

export function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatDateInput(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return toDateInputValue(date);
}

export function formatContactPhone(value: string) {
  if (!value) {
    return "";
  }

  try {
    const parsed = JSON.parse(value) as Record<string, string>;
    return parsed.phone ?? "";
  } catch {
    return value;
  }
}

export function formatContactArea(value: string) {
  if (!value) {
    return "";
  }

  try {
    const parsed = JSON.parse(value) as Record<string, string>;
    return parsed.area ?? "";
  } catch {
    return "";
  }
}

export function normalizeDateOnly(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return toDateInputValue(new Date());
  }

  return toDateInputValue(date);
}

export function normalizePagination(options: PaginationOptions) {
  const page = Math.max(1, Math.floor(Number(options.page ?? 1)) || 1);
  const pageSize = Math.min(
    50,
    Math.max(1, Math.floor(Number(options.pageSize ?? DEFAULT_PAGE_SIZE)) || DEFAULT_PAGE_SIZE),
  );

  return { page, pageSize };
}

export function toPageInfo(total: number, pagination: { page: number; pageSize: number }) {
  return {
    page: pagination.page,
    pageSize: pagination.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pagination.pageSize)),
  };
}

export function emptyPageInfo(pagination: { page: number; pageSize: number }) {
  return {
    ...pagination,
    total: 0,
    totalPages: 1,
  };
}

export function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

export function getDateRange(dateOnly: string) {
  const startDate = new Date(`${dateOnly}T00:00:00`);
  const endDate = new Date(startDate);

  endDate.setDate(startDate.getDate() + 1);

  return {
    start: startDate.toISOString(),
    end: endDate.toISOString(),
  };
}

export function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
