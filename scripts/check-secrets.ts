// Scans the project for credentials that have escaped into files git
// can see.
//
//     npm run check:secrets
//
// Run it before every commit, and certainly before the first push after
// adding real Razorpay keys. It exits non-zero if it finds anything, so
// it also works as a pre-commit hook.
//
// It deliberately never prints a secret it finds, only where it is.
// Printing one into a terminal puts it in your shell history and your
// scrollback, which is how a leak becomes two leaks.

import { execFileSync } from "node:child_process";
import fs from "node:fs";

type Finding = { file: string; line: number; rule: string };

// Only files git actually tracks or would track. A credential sitting
// in .env is correct and must not be reported; the same credential in a
// tracked file is the whole problem.
function filesGitCanSee(): string[] {
  const output = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard"],
    { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 },
  );

  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((file) => !file.startsWith("node_modules/"))
    .filter((file) => !file.startsWith("generated/"))
    // Vendored Prisma documentation. Full of example connection strings
    // that are not ours and cannot leak anything. Scanning them buries
    // a real finding under twenty fake ones, which is how a scanner
    // stops being read.
    .filter((file) => !/^\.(agents|claude|windsurf)\//.test(file))
    .filter((file) => !file.endsWith("package-lock.json"))
    .filter((file) => !file.endsWith(".tsbuildinfo"));
}

const RULES: { name: string; pattern: RegExp }[] = [
  // A real Razorpay key id. The placeholder in .env.example is allowed
  // by the exception below.
  { name: "Razorpay key id", pattern: /\brzp_(test|live)_[A-Za-z0-9]{10,}\b/ },
  // A Postgres or Prisma connection string carrying a password.
  {
    name: "database url with credentials",
    pattern: /\b(postgres|postgresql|prisma\+postgres):\/\/[^\s"':/]+:[^\s"'@]+@/,
  },
  // An assignment that hands a secret-looking name a long literal.
  {
    name: "hardcoded secret assignment",
    pattern:
      /\b(key_secret|keySecret|apiSecret|api_secret|webhook_secret|webhookSecret|sessionSecret|SESSION_SECRET)\s*[:=]\s*["'][A-Za-z0-9_\-]{12,}["']/,
  },
];

// Placeholders and obvious test fixtures. These exist so the example
// file and the security checks can show the SHAPE of a credential
// without being one.
const ALLOWED = [
  /REPLACE_ME/,
  /PASTE_THE/,
  // Documentation showing the SHAPE of a url with the password elided,
  // as in `postgresql://user:...@host`. Three dots is never a password.
  /:\.\.\.@/,
  /test_key_secret_abc123/,
  /test_webhook_secret_xyz789/,
  // A connection string pointing at localhost. The local database sits
  // on this machine behind this machine's own login, so there is
  // nothing in it to steal and nothing to rotate. Hardcoding the
  // local username here instead would go stale the next time it
  // changes, and a stale exception gets widened rather than fixed.
  // A remote host never matches this and is never let through.
  /:\/\/[^\s"'@]+@(localhost|127\.0\.0\.1|\[::1\]):/,
  /not-the-real-secret/,
];

function main() {
  const findings: Finding[] = [];

  for (const file of filesGitCanSee()) {
    let contents: string;
    try {
      contents = fs.readFileSync(file, "utf8");
    } catch {
      continue; // binary or unreadable, nothing to scan
    }

    contents.split(/\r?\n/).forEach((line, index) => {
      if (ALLOWED.some((allowed) => allowed.test(line))) {
        return;
      }
      for (const rule of RULES) {
        if (rule.pattern.test(line)) {
          findings.push({ file, line: index + 1, rule: rule.name });
        }
      }
    });
  }

  if (findings.length === 0) {
    console.log("No credentials found in anything git can see.");
    console.log(
      "Real secrets belong in .env and .env.neon, both of which are gitignored.",
    );
    process.exit(0);
  }

  console.log(`FOUND ${findings.length} possible credential(s):\n`);
  for (const finding of findings) {
    // Location only. The value is never printed.
    console.log(`  ${finding.file}:${finding.line}  ${finding.rule}`);
  }
  console.log(
    "\nMove each one into .env, then ROTATE it: assume anything that reached a file git can see is already compromised.",
  );
  process.exit(1);
}

main();
