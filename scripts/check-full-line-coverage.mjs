#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

function walkForLcovFiles(dir, files) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === "node_modules" || entry.name === ".bun") {
      continue;
    }

    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walkForLcovFiles(full, files);
      continue;
    }

    if (entry.isFile() && entry.name === "lcov.info") {
      files.push(full);
    }
  }
}

function isSourceFile(target) {
  return /[\\/]src[\\/].*\.(t|j)sx?$/.test(target) && !target.includes(".d.ts");
}

function parseLcov(file) {
  const content = fs.readFileSync(file, "utf8");
  const uncovered = [];
  let currentFile = null;

  for (const raw of content.split(/\r?\n/)) {
    if (raw.startsWith("SF:")) {
      currentFile = raw.slice(3);
      continue;
    }

    if (!raw.startsWith("DA:")) {
      continue;
    }

    if (!currentFile || !isSourceFile(currentFile)) {
      continue;
    }

    const parts = raw.slice(3).split(",");
    if (parts.length < 2) {
      continue;
    }

    const line = Number(parts[0]);
    const hits = Number(parts[1]);

    if (!Number.isFinite(line) || !Number.isFinite(hits)) {
      continue;
    }

    if (hits === 0) {
      uncovered.push({ file: currentFile, line });
    }
  }

  return uncovered;
}

const lcovFiles = [];
walkForLcovFiles(process.cwd(), lcovFiles);

if (lcovFiles.length === 0) {
  console.error("Coverage check failed: no lcov.info files found.");
  process.exit(1);
}

const misses = [];
for (const file of lcovFiles) {
  misses.push(...parseLcov(file));
}

if (misses.length === 0) {
  console.log("✅ Line coverage check passed. Every tracked source line has coverage 100%.");
  process.exit(0);
}

console.error(`❌ Line coverage check failed: ${misses.length} source lines are not covered.`);
const byFile = new Map();
for (const item of misses) {
  const key = item.file;
  if (!byFile.has(key)) {
    byFile.set(key, new Set());
  }

  byFile.get(key).add(item.line);
}

for (const [file, lines] of byFile.entries()) {
  const list = [...lines].sort((a, b) => a - b);
  console.error(`- ${file}: ${list.length} uncovered lines`);
}

process.exit(1);
