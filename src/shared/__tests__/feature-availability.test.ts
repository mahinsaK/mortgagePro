import { describe, expect, it } from "vitest";
import {
  getFeatureAvailability,
  isFeatureAvailable,
} from "../feature-availability";

describe("feature availability", () => {
  it("makes SMS available when its workflow is enabled", () => {
    expect(isFeatureAvailable("sms")).toBe(true);
    expect(getFeatureAvailability("sms")).toMatchObject({
      available: true,
      label: "SMS messaging",
      title: "SMS messaging",
    });
  });
});
