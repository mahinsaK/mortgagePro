import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const secretPatterns = [
  { name: "private key", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: "Google OAuth secret", pattern: /GOCSPX-[A-Za-z0-9_-]{20,}/ },
  { name: "GitHub token", pattern: /gh[pousr]_[A-Za-z0-9]{30,}/ },
  { name: "AWS access key", pattern: /AKIA[0-9A-Z]{16}/ },
  { name: "OpenAI key", pattern: /sk-(?:proj-)?[A-Za-z0-9_-]{20,}/ },
  {
    name: "committed environment secret",
    pattern:
      /^(?:APPWRITE_(?:RUNTIME|SETUP)_API_KEY|COLLECTOR_SESSION_SECRET|SECURITY_MONITORING_SECRET|TEXTLK_API_TOKEN)=["']?(?!(?:your_|paste_|replace_|example))[^\s"']{16,}/m,
  },
];

const trackedFiles = runGit(["ls-files", "-z"])
  .split("\0")
  .filter(Boolean)
  .filter((file) => file !== "package-lock.json");
const findings = [];

for (const file of trackedFiles) {
  let content;
  try {
    content = readFileSync(file, "utf8");
  } catch {
    continue;
  }

  for (const secretPattern of secretPatterns) {
    if (secretPattern.pattern.test(content)) {
      findings.push(`${secretPattern.name} pattern in ${file}`);
    }
  }
}

const history = runGit([
  "log",
  "--all",
  "--format=commit:%H",
  "-p",
  "--",
  ":!package-lock.json",
]);
for (const secretPattern of secretPatterns.slice(0, 5)) {
  if (secretPattern.pattern.test(history)) {
    findings.push(`${secretPattern.name} pattern in Git history`);
  }
}

if (findings.length > 0) {
  console.error("Potential secret leakage detected:");
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    `Secret scan passed for ${trackedFiles.length} tracked files and Git history.`,
  );
}

function runGit(args) {
  return execFileSync("git", args, {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
}
