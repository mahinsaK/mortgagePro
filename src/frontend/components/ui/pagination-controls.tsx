import Link from "next/link";

type PageInfo = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export function PaginationControls({
  basePath,
  pageInfo,
  query = {},
}: {
  basePath: string;
  pageInfo: PageInfo;
  query?: Record<string, string | undefined>;
}) {
  const previousPage = Math.max(1, pageInfo.page - 1);
  const nextPage = Math.min(pageInfo.totalPages, pageInfo.page + 1);
  const start = pageInfo.total === 0 ? 0 : (pageInfo.page - 1) * pageInfo.pageSize + 1;
  const end = Math.min(pageInfo.page * pageInfo.pageSize, pageInfo.total);

  return (
    <div className="flex flex-col gap-3 border-t border-[#eef2f6] px-4 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <p className="text-[#657386]">
        Showing {start}-{end} of {pageInfo.total}
      </p>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:flex">
        {pageInfo.page > 1 ? (
          <Link
            className="flex min-h-11 items-center justify-center rounded-md border border-[#cfd8e3] px-3 py-2 text-center font-medium text-[#2d3745] transition hover:bg-[#f8fafc]"
            href={pageHref(basePath, previousPage, query)}
            scroll={false}
          >
            Previous
          </Link>
        ) : (
          <span className="flex min-h-11 cursor-not-allowed items-center justify-center rounded-md border border-[#dfe5ec] px-3 py-2 text-center font-medium text-[#9aa6b2]">
            Previous
          </span>
        )}
        <span className="whitespace-nowrap px-1 text-center font-medium text-[#2d3745] sm:px-2">
          Page {pageInfo.page} of {pageInfo.totalPages}
        </span>
        {pageInfo.page < pageInfo.totalPages ? (
          <Link
            className="flex min-h-11 items-center justify-center rounded-md border border-[#cfd8e3] px-3 py-2 text-center font-medium text-[#2d3745] transition hover:bg-[#f8fafc]"
            href={pageHref(basePath, nextPage, query)}
            scroll={false}
          >
            Next
          </Link>
        ) : (
          <span className="flex min-h-11 cursor-not-allowed items-center justify-center rounded-md border border-[#dfe5ec] px-3 py-2 text-center font-medium text-[#9aa6b2]">
            Next
          </span>
        )}
      </div>
    </div>
  );
}

function pageHref(
  basePath: string,
  page: number,
  query: Record<string, string | undefined>,
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value) {
      params.set(key, value);
    }
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const search = params.toString();
  return search ? `${basePath}?${search}` : basePath;
}
