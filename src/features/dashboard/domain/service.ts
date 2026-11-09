import type {
  DashboardLoanRowDto,
  DashboardPaymentExportRowDto,
  DashboardSearchDto,
} from "./dto";

export class DashboardService {
  filterLoans(
    loans: DashboardLoanRowDto[],
    search: DashboardSearchDto,
  ): DashboardLoanRowDto[] {
    const query = normalize(search.query);

    if (!query) {
      return loans;
    }

    return loans.filter((loan) =>
      [loan.borrower, loan.borrowerContact, loan.borrowerPhone]
        .map(normalize)
        .join(" ")
        .includes(query),
    );
  }

  filterPaymentExportsByDateRange({
    endDate,
    rows,
    startDate,
  }: {
    rows: DashboardPaymentExportRowDto[];
    startDate?: string;
    endDate?: string;
  }) {
    return rows.filter((row) => {
      const date = new Date(row.date).toISOString().slice(0, 10);
      return (!startDate || date >= startDate) && (!endDate || date <= endDate);
    });
  }
}

function normalize(value: string) {
  return value.toLowerCase().replaceAll(/[\s()-]/g, "");
}
