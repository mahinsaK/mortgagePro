import { describe, expect, it } from "vitest";
import {
  getFeatureAvailability,
  isFeatureAvailable,
} from "../feature-availability";

describe("feature availability", () => {
  it("keeps SMS unavailable while its workflow is under maintenance", () => {
    expect(isFeatureAvailable("sms")).toBe(false);
    expect(getFeatureAvailability("sms")).toMatchObject({
      available: false,
      label: "SMS messaging",
      title: "SMS is under maintenance",
    });
  });
});
