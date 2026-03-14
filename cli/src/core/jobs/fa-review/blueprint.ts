/**
 * Fixed Asset Review blueprint generator.
 * Produces a structured JobBlueprint for reviewing the fixed asset register —
 * no actual API calls, just an actionable checklist for accountants.
 */

import type { JobBlueprint, JobPhase } from '../types.js';
import { buildSummary } from '../types.js';

export interface FaReviewOptions {
  /** Reporting currency (e.g., SGD, PHP). */
  currency?: string;
}

export function generateFaReviewBlueprint(opts: FaReviewOptions = {}): JobBlueprint {
  const currency = opts.currency ?? 'SGD';

  // Phase 1: Register Review
  const registerReview: JobPhase = {
    name: 'Register Review',
    description: 'Pull the fixed asset summary and verify against general ledger balances.',
    steps: [
      {
        order: 1,
        description: 'Pull fixed asset summary report',
        category: 'report',
        apiCall: 'POST /generate-reports/fixed-assets-summary',
        notes: 'Review: asset description, cost, accumulated depreciation, NBV, useful life remaining, depreciation method per asset',
        verification: 'FA register generated — note total cost, total accumulated depreciation, total NBV',
      },
      {
        order: 2,
        description: 'Verify FA register against GL balances',
        category: 'verify',
        apiCall: 'POST /generate-reports/trial-balance',
        notes: 'Compare FA register totals to TB: (1) total cost should match FA cost accounts, (2) total accumulated depreciation should match contra accounts, (3) NBV should match net FA on BS',
        verification: 'FA register totals agree with GL. Any differences investigated and resolved.',
      },
    ],
  };

  // Phase 2: Depreciation Check
  const depreciationCheck: JobPhase = {
    name: 'Depreciation Check',
    description: 'Verify depreciation has been run correctly and review fully depreciated assets.',
    steps: [
      {
        order: 3,
        description: 'Verify depreciation runs are up to date',
        category: 'verify',
        apiCall: 'POST /generate-reports/fixed-assets-summary',
        calcCommand: 'clio calc depreciation',
        notes: 'Check that monthly/annual depreciation has been posted for all assets through the current period. Recalculate sample of assets to verify amounts.',
        verification: 'Depreciation is current — no missed periods. Sample recalculations match posted amounts.',
      },
      {
        order: 4,
        description: 'Check fully depreciated assets',
        category: 'review',
        apiCall: 'POST /generate-reports/fixed-assets-summary',
        notes: 'Identify assets with NBV = 0 or NBV = salvage value. Review whether: (1) asset is still in use, (2) asset should be disposed/written off, (3) useful life estimate needs revision.',
        verification: 'All fully depreciated assets reviewed — disposals and write-offs identified',
      },
    ],
  };

  // Phase 3: Disposals & Write-offs
  const disposalsWriteoffs: JobPhase = {
    name: 'Disposals & Write-offs',
    description: 'Process asset disposals and calculate gain/loss on disposal.',
    steps: [
      {
        order: 5,
        description: 'Process asset disposals',
        category: 'adjust',
        apiCall: 'POST /journals',
        recipeRef: 'asset-disposal',
        calcCommand: 'clio calc asset-disposal',
        notes: 'For each disposal: (1) calculate NBV at disposal date, (2) compare to sale proceeds, (3) recognize gain or loss. Journal: Dr Bank/Receivable, Dr Accumulated Depreciation, Cr Asset Cost, Cr/Dr Gain/Loss on Disposal.',
        verification: 'Disposal journals balanced. Gain/loss correctly calculated. Asset removed from register.',
      },
      {
        order: 6,
        description: 'Process asset write-offs',
        category: 'adjust',
        apiCall: 'POST /journals',
        recipeRef: 'asset-disposal',
        notes: 'For write-offs (zero proceeds): Dr Accumulated Depreciation, Dr Loss on Write-off (for remaining NBV), Cr Asset Cost. Document reason for write-off (obsolescence, damage, etc.).',
        verification: 'Write-off journals balanced. Assets removed from register. Reasons documented.',
      },
    ],
  };

  // Phase 4: Verification
  const verification: JobPhase = {
    name: 'Verification',
    description: 'Final reconciliation of fixed assets to trial balance and reasonableness check.',
    steps: [
      {
        order: 7,
        description: 'Reconcile updated FA register to trial balance',
        category: 'verify',
        apiCall: 'POST /generate-reports/trial-balance',
        notes: 'After all disposals and write-offs, re-pull TB and FA register. Verify they agree.',
        verification: 'FA register totals match TB. All movements accounted for (additions, depreciation, disposals, write-offs).',
      },
      {
        order: 8,
        description: 'Check NBV reasonableness',
        category: 'review',
        apiCall: 'POST /generate-reports/fixed-assets-summary',
        notes: [
          'Review remaining NBV for reasonableness:',
          '(1) No negative NBV,',
          '(2) NBV does not exceed replacement cost,',
          '(3) Useful lives are appropriate for asset type,',
          '(4) Salvage values are reasonable,',
          '(5) No impairment indicators (market value decline, physical damage, change in use).',
        ].join(' '),
        verification: 'All NBV values reasonable. No impairment indicators identified, or impairment review initiated where needed.',
      },
    ],
  };

  const phases = [registerReview, depreciationCheck, disposalsWriteoffs, verification];

  return {
    jobType: 'fa-review',
    period: 'current',
    currency,
    mode: 'standalone',
    phases,
    summary: buildSummary(phases),
  };
}
