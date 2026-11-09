import "server-only";
import { Query } from "@/server/appwrite/server-client";
import { getPrimaryLender } from "@/server/services/lender-service";
import { emptyPageInfo, formatContactArea, formatContactPhone, formatDate, listForLender, MAX_LOOKUP_LIMIT, normalizePagination, toPageInfo } from "@/server/services/lending-query-helpers";
import type { CollectorRow, DailyCollectionCollector, PaginationOptions } from "@/shared/lending-types";

export async function getCollectorsPageData(options: PaginationOptions = {}) {
  const lender = await getPrimaryLender();
  const pagination = normalizePagination(options);

  if (!lender) {
    return {
      lender: null,
      collectors: [] as CollectorRow[],
      summary: { total: 0, active: 0, inactive: 0 },
      pageInfo: emptyPageInfo(pagination),
    };
  }

  const [collectors, activeCollectors] = await Promise.all([
    listForLender("collectors", lender.id, {
      page: pagination.page,
      pageSize: pagination.pageSize,
      orderBy: "created_at",
      select: ["$id", "$createdAt", "name", "contact_info", "status", "created_at"],
    }),
    listForLender("collectors", lender.id, {
      extraQueries: [Query.equal("status", "active")],
      limit: 1,
      select: ["$id"],
    }),
  ]);

  return {
    lender,
    summary: {
      total: collectors.total,
      active: activeCollectors.total,
      inactive: Math.max(collectors.total - activeCollectors.total, 0),
    },
    pageInfo: toPageInfo(collectors.total, pagination),
    collectors: collectors.documents.map((collector) => ({
      id: collector.$id,
      username: collector.$id,
      name: String(collector.name ?? ""),
      contactInfo: formatContactPhone(String(collector.contact_info ?? "")),
      areaInfo: formatContactArea(String(collector.contact_info ?? "")),
      status: String(collector.status ?? "active"),
      createdAt: formatDate(String(collector.created_at ?? collector.$createdAt)),
    })),
  };
}

/** Lists the current lender's collectors for the daily-payment filter. */
export async function getDailyCollectionCollectors(): Promise<
  DailyCollectionCollector[]
> {
  const lender = await getPrimaryLender();

  if (!lender) {
    return [];
  }

  const collectors = await listForLender("collectors", lender.id, {
    limit: MAX_LOOKUP_LIMIT,
    select: ["$id", "name"],
  });

  return collectors.documents
    .map((collector) => ({
      id: collector.$id,
      name: String(collector.name ?? "Unknown collector"),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}
