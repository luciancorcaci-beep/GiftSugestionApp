#!/usr/bin/env node
// Reliable coverage-threshold gate for CI.
//
// vitest 0.34.6 (this project's pinned version) does not actually fail the
// process when --coverage.thresholds.* / test.coverage.thresholds in
// vitest.config.ts are unmet (verified empirically: exit code stayed 0 even
// with an intentionally impossible 99% threshold configured both ways).
// Rather than ship a CI gate that silently never fails, this script reads
// the coverage/coverage-summary.json the 'json-summary' reporter already
// produces and enforces the threshold itself.
import { readFileSync } from 'node:fs';

const THRESHOLD = 85;
const METRICS = ['statements', 'branches', 'functions', 'lines'];

const summaryPath = 'coverage/coverage-summary.json';
let summary;
try {
  summary = JSON.parse(readFileSync(summaryPath, 'utf-8'));
} catch (error) {
  console.error(`Could not read ${summaryPath}. Did the coverage run produce a json-summary report? (${error.message})`);
  process.exit(1);
}

const total = summary.total;
let failed = false;

for (const metric of METRICS) {
  const pct = total[metric]?.pct;
  const status = pct >= THRESHOLD ? 'PASS' : 'FAIL';
  if (status === 'FAIL') failed = true;
  console.log(`${status}: ${metric} ${pct}% (threshold ${THRESHOLD}%)`);
}

if (failed) {
  console.error(`\nCoverage gate failed: at least one metric is below ${THRESHOLD}%.`);
  process.exit(1);
}

console.log(`\nCoverage gate passed: all metrics ≥ ${THRESHOLD}%.`);
