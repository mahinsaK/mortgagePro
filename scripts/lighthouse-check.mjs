import { spawn } from "node:child_process";
import process from "node:process";
import { launch } from "chrome-launcher";
import lighthouse from "lighthouse";
import { chromium } from "playwright";

const externalBaseUrl = process.env.LIGHTHOUSE_BASE_URL?.replace(/\/$/, "");
const port = Number(process.env.LIGHTHOUSE_PORT ?? 3100);
const runCount = Number(process.env.LIGHTHOUSE_RUNS ?? 3);
const baseUrl = externalBaseUrl ?? `http://127.0.0.1:${port}`;
const paths = ["/auth/login", "/auth/register", "/collector/login"];
const server = externalBaseUrl ? null : startServer(port);

try {
  await waitForServer(`${baseUrl}/auth/login`);
  for (const path of paths) {
    const results = [];
    for (let run = 0; run < runCount; run += 1) {
      results.push(await auditPage(`${baseUrl}${path}`));
    }

    const median = {
      accessibility: medianValue(
        results.map((result) => result.accessibility),
      ),
      cls: medianValue(results.map((result) => result.cls)),
      performance: medianValue(results.map((result) => result.performance)),
    };
    console.log(
      `${path}: accessibility=${median.accessibility.toFixed(2)}, performance=${median.performance.toFixed(2)}, CLS=${median.cls.toFixed(3)}`,
    );

    if (median.accessibility < 0.9) {
      throw new Error(`${path} accessibility score is below 0.90.`);
    }
    if (median.cls > 0.1) {
      throw new Error(`${path} CLS exceeds 0.10.`);
    }
    if (median.performance < 0.8) {
      console.warn(`${path} performance score is below the 0.80 pilot target.`);
    }
  }
} finally {
  if (server) {
    server.kill("SIGTERM");
  }
}

async function auditPage(url) {
  const chrome = await launch({
    chromePath: chromium.executablePath(),
    chromeFlags: ["--headless", "--no-sandbox"],
  });

  try {
    const report = await lighthouse(url, {
      port: chrome.port,
      output: "json",
      logLevel: "error",
      onlyCategories: ["performance", "accessibility"],
      formFactor: "mobile",
      screenEmulation: {
        mobile: true,
        width: 390,
        height: 844,
        deviceScaleFactor: 3,
        disabled: false,
      },
    });
    if (!report?.lhr || report.lhr.runtimeError) {
      throw new Error(
        report?.lhr.runtimeError?.message ??
          `Lighthouse did not return a valid report for ${url}.`,
      );
    }
    return {
      accessibility: report.lhr.categories.accessibility.score ?? 0,
      cls:
        report.lhr.audits["cumulative-layout-shift"].numericValue ??
        Number.POSITIVE_INFINITY,
      performance: report.lhr.categories.performance.score ?? 0,
    };
  } finally {
    await chrome.kill();
  }
}

function startServer(serverPort) {
  return spawn("npm", ["run", "start", "--", "-p", String(serverPort)], {
    env: { ...process.env, PORT: String(serverPort) },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function waitForServer(url) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // The production server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for ${url}. Run npm run build first.`);
}

function medianValue(values) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)];
}
