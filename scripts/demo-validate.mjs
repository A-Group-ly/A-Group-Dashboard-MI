// Offline check of the synthetic dataset: no database, no network, no secrets.
//   node scripts/demo-validate.mjs
import { PLANS } from '../src/lib/subscriptionDemo.ts';
import { generateScaleDataset, validateScaleDataset } from '../prisma/demo/generate.ts';

const catalog = { plans: PLANS };
const a = generateScaleDataset(catalog);
const b = generateScaleDataset(catalog);
const report = validateScaleDataset(a, catalog);

const deterministic = JSON.stringify(a) === JSON.stringify(b);
console.log(JSON.stringify({ ...report, deterministic }, null, 2));
if (!report.ok || !deterministic) {
  console.error('VALIDATION FAILED');
  process.exit(1);
}
console.log('VALIDATION PASSED');
