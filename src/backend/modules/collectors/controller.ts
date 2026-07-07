import { fail, ok } from "../shared";
import { toCreateCollectorDto } from "./dto";
import { CollectorService } from "./service";

export class CollectorController {
  constructor(private readonly collectorService = new CollectorService()) {}

  create(input: Record<string, unknown>) {
    try {
      return ok(this.collectorService.prepareCreate(toCreateCollectorDto(input)));
    } catch (error) {
      return fail(
        error instanceof Error ? error.message : "Collector creation failed.",
      );
    }
  }
}
