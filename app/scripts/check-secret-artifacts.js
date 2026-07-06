import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const repositoryRoot = process.cwd();
const trackedFiles = execFileSync("git", ["ls-files"], {
  cwd: repositoryRoot,
  encoding: "utf8",
})
  .split(/\r?\n/)
  .filter(Boolean)
  .filter((file) => existsSync(path.join(repositoryRoot, file)));

const forbiddenFilePatterns = [
  /(^|\/)cookiejar(?:[^/]*)\.txt$/i,
  /(^|\/)cookies?\.txt$/i,
  /\.cookiejar$/i,
];

const sessionTokenPattern =
  /\b(?:kimi_sid|logos_sid_v2)\b[\s=:"']+eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/;

const violations = [];

for (const file of trackedFiles) {
  const normalizedFile = file.replaceAll("\\", "/");
  if (forbiddenFilePatterns.some((pattern) => pattern.test(normalizedFile))) {
    violations.push(`${file}: forbidden session artifact`);
    continue;
  }

  const absolutePath = path.join(repositoryRoot, file);
  if (statSync(absolutePath).size > 1024 * 1024) continue;

  const content = readFileSync(absolutePath);
  if (content.includes(0)) continue;

  if (sessionTokenPattern.test(content.toString("utf8"))) {
    violations.push(`${file}: session token detected`);
  }
}

if (violations.length > 0) {
  console.error("Secret artifact check failed:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log("Secret artifact check passed.");
