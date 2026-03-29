/**
 * Org context banner — shows which org is active on stderr.
 * Extracted from api-action.ts for DRY reuse.
 */
import { success, warning, muted, sym } from './theme.js';

interface OrgInfo {
  label: string;
  orgName: string;
  currency: string;
}

/**
 * Render the org banner to stderr.
 *
 * Pinned (explicit flag/env):    ● acme-sg · Acme Pte Ltd (SGD)
 * Unpinned (multi-org warning):  ▲ acme-sg · Acme Pte Ltd (SGD) — not pinned
 */
export function renderOrgBanner(org: OrgInfo, isPinned: boolean, isMultiOrg: boolean): void {
  if (!isPinned && isMultiOrg) {
    process.stderr.write(
      warning(`  ${sym.warning} ${org.label} ${muted('·')} ${org.orgName} (${org.currency})`) +
      muted(` — not pinned\n`) +
      muted(`    Pin: export JAZ_ORG=${org.label}  or  --org ${org.label}\n`),
    );
  } else {
    process.stderr.write(
      muted(`  ${success(sym.bullet)} ${org.label} ${muted('·')} ${org.orgName} (${org.currency})\n`),
    );
  }
}
