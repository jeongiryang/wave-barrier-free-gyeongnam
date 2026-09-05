"use strict";

const { execFileSync } = require("node:child_process");
const fs = require("node:fs");

function validateEntries(entries, allowSensitive) {
  let sensitive = false;
  for (const { path, mode } of entries) {
    if (!path || path.startsWith("/") || path.split("/").some((part) => part === ".." || part === ".git") || /[\x00-\x1f\\]/.test(path)) throw new Error("Unsafe patch path");
    if (["120000", "160000"].includes(mode)) throw new Error("Symlink/submodule patches require manual review");
    if (/(^|\/)(\.env(?:\..*)?|\.gitattributes|\.gitmodules|\.gitconfig|\.npmrc)$/.test(path) || path.startsWith(".codex/")) throw new Error("Credential/configuration path requires manual review");
    if (/^(AGENTS\.md$|CLAUDE\.md$|\.wave\/|\.github\/)/.test(path)) sensitive = true;
  }
  if (sensitive && !allowSensitive) throw new Error("Sensitive automation change lacks immutable PM authorization");
  return { sensitive, publishable: !sensitive };
}

function inspectIndex(allowSensitive) {
  const entries = execFileSync("git", ["diff", "--cached", "--raw", "--no-renames", "-z"], { encoding: "utf8" }).split("\0");
  const changes = [];
  for (let i = 0; i < entries.length - 1; i += 2) {
    const fields = entries[i].split(" ");
    changes.push({ path: entries[i + 1], mode: fields[1] });
  }
  return { count: changes.length, ...validateEntries(changes, allowSensitive) };
}

if (require.main === module) {
  const result = inspectIndex(process.env.ALLOW_SENSITIVE === "true");
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `has_changes=${result.count > 0}\npublishable=${result.publishable}\n`);
  if (!result.publishable) console.log("Sensitive changes validated as an artifact only; manual publication required (Human Gate #294).");
}

module.exports = { validateEntries, inspectIndex };
