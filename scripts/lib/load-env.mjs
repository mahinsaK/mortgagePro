import { readFileSync } from "node:fs";

export function loadScriptEnv() {
  return {
    ...readEnvFile(".env.example"),
    ...nonEmptyEntries(readEnvFile(".env.local")),
    ...nonEmptyProcessEnv(),
  };
}

function readEnvFile(path) {
  const values = {};

  try {
    const content = readFileSync(path, "utf8");

    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!match) {
        continue;
      }

      const [, key, rawValue] = match;
      values[key] = rawValue.replace(/^["']|["']$/g, "");
    }
  } catch {
    // Environment files are optional; required values are validated by callers.
  }

  return values;
}

function nonEmptyProcessEnv() {
  return nonEmptyEntries(process.env);
}

function nonEmptyEntries(values) {
  return Object.fromEntries(
    Object.entries(values).filter(
      ([, value]) => typeof value === "string" && value.length > 0,
    ),
  );
}
