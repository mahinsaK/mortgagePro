import { fail, ok } from "../shared";
import type { DashboardLoanRowDto, DashboardPaymentExportRowDto } from "./dto";
import { toDashboardSearchDto } from "./dto";
import { DashboardService } from "./service";

export class DashboardController {
  constructor(private readonly dashboardService = new DashboardService()) {}

  searchLoans(loans: DashboardLoanRowDto[], input: Record<string, unknown>) {
    try {
      return ok(
        this.dashboardService.filterLoans(loans, toDashboardSearchDto(input)),
      );
    } catch (error) {
      return fail(
        error instanceof Error ? error.message : "Dashboard search failed.",
      );
    }
  }

  exportPaymentsByDateRange({
    endDate,
    rows,
    startDate,
  }: {
    rows: DashboardPaymentExportRowDto[];
    startDate?: string;
    endDate?: string;
  }) {
    try {
      return ok(
        this.dashboardService.filterPaymentExportsByDateRange({
          endDate,
          rows,
          startDate,
        }),
      );
    } catch (error) {
      return fail(
        error instanceof Error ? error.message : "Dashboard export failed.",
      );
    }
  }
}
