export type ControllerResponse<T> = {
  ok: boolean;
  data?: T;
  error?: string;
};

export type Status = "active" | "inactive";

export function ok<T>(data: T): ControllerResponse<T> {
  return { ok: true, data };
}

export function fail<T = never>(error: string): ControllerResponse<T> {
  return { ok: false, error };
}

export function requiredString(value: unknown, field: string) {
  const text = String(value ?? "").trim();

  if (!text) {
    throw new Error(`${field} is required.`);
  }

  return text;
}

export function optionalString(value: unknown) {
  return String(value ?? "").trim();
}

export function nonNegativeNumber(value: unknown, field: string) {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    throw new Error(`${field} must be a valid number.`);
  }

  return number;
}

export function positiveNumber(value: unknown, field: string) {
  const number = nonNegativeNumber(value, field);

  if (number === 0) {
    throw new Error(`${field} must be greater than zero.`);
  }

  return number;
}

export function status(value: unknown): Status {
  return value === "inactive" ? "inactive" : "active";
}

export function isoDate(value: unknown, field: string) {
  const text = requiredString(value, field);
  const date = new Date(`${text}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`${field} must be a valid date.`);
  }

  return date.toISOString();
}

export function contactInfo(fields: Record<string, string>) {
  return JSON.stringify(fields);
}
