// D:\quickbook\quickbook-app\spec-builder\assemble.js
import fs from 'fs';
import path from 'path';
import { getPart1 } from './part1.js';
import { getPart2 } from './part2.js';
import { getPart3 } from './part3.js';
import { getPart4 } from './part4.js';
import { getPart5 } from './part5.js';

const parts = [
  getPart1(),
  getPart2(),
  getPart3(),
  getPart4(),
  getPart5()
];

const fullSpec = parts.join('\n\n');

// 1. Write to Disk D
const diskDPath = path.resolve('D:/quickbook/quickbook-app/BACKEND.md');
fs.writeFileSync(diskDPath, fullSpec, 'utf8');

// 2. Write to Artifact Directory on Drive C
const artifactDir = 'C:/Users/BHAVESH/.gemini/antigravity/brain/52c3c363-e24c-4617-90eb-d0f3e3146511';
if (!fs.existsSync(artifactDir)) {
  fs.mkdirSync(artifactDir, { recursive: true });
}
const artifactPath = path.join(artifactDir, 'BACKEND.md');
fs.writeFileSync(artifactPath, fullSpec, 'utf8');

// 3. Write metadata file for Artifact UI
const metadataPath = path.join(artifactDir, 'BACKEND.md.metadata.json');
const metadata = {
  RequestFeedback: false,
  Summary: "Comprehensive master backend and continuous double-entry accounting specification (BACKEND.md) for QuickBooks Online (2026 Edition). Covers §B0 to §B18, complete PostgreSQL DDL, 10 Financial Invariants, 29 +Create workflow pipelines, Redis caching, latency budgets, and seed reconciliation proofs.",
  UserFacing: true
};
fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');

const stats = fs.statSync(diskDPath);
const lines = fullSpec.split('\n').length;

console.log(`✓ Successfully assembled BACKEND.md:`);
console.log(`  - Target 1 (Disk D): ${diskDPath}`);
console.log(`  - Target 2 (Artifact): ${artifactPath}`);
console.log(`  - Size: ${stats.size} bytes`);
console.log(`  - Lines: ${lines} lines`);
