---
description: "Review the fixed asset register in Jaz: check depreciation, identify disposals and write-offs needed"
argument-hint: ""
---

# Fixed Asset Review

Run the FA review playbook from the jaz-jobs skill (`references/fa-review.md`). Reviews the fixed asset register for accuracy and completeness.

## Usage

```
/jaz-fa-review
/jaz-fa-review check for assets to dispose
```

## Workflow

### 1. Open the playbook

The steps are in the jaz-jobs skill: `references/fa-review.md`. Read it first and walk its steps in order; it names the exact tool or command for each one.

### 2. Review assets

The playbook walks through:
- Assets with zero remaining book value (candidates for write-off/disposal)
- Assets past useful life but still active
- Depreciation accuracy vs policy
- Missing or misclassified assets

### 3. Process disposals

For assets to dispose, use the calculator first:

```bash
clio calc asset-disposal --cost 50000 --salvage 5000 --life 5 --acquired 2020-01-01 --disposed 2025-06-15 --proceeds 8000 --json
```

The calculator returns the gain or loss; it posts nothing. A registered asset is disposed of through the register, which books the disposal itself. Do not also post the calculator's full disposal journal: that books it twice.

```bash
# Scrapped: no journal
clio fixed-assets discard <assetResourceId> --disposal-date 2025-06-15 --depreciation-end-date 2025-06-15 --json

# Sold: post the proceeds as the sale entry first (Dr bank, Cr the asset's fixed-asset account),
# then mark the asset sold against that journal's credit line
clio journals create --input sale-entry.json --json
clio fixed-assets sell --id <assetResourceId> --depreciation-end-date 2025-06-15 --gain-loss-account <accountId> --sale-type JOURNAL_MANUAL --sale-item <journalCreditLineId> --json
```

Compare the gain or loss the register booked with the calculator's figure.

### 4. Verify

Check the trial balance for fixed asset and accumulated depreciation accounts:

```bash
clio accounts search --name "Fixed Asset" --json
clio reports generate trial-balance --to 2025-12-31 --json
```

## Key Rules

- Disposals compute gain/loss: proceeds - (cost - accumulated depreciation)
- `clio calc asset-disposal` only calculates; you post the disposal journal and update the register
- The register update is a separate call: `clio fixed-assets sell` (sold) or `clio fixed-assets discard` (scrapped); without it Jaz keeps depreciating the asset
- Depreciation methods for CLI calculators: `sl` (straight-line), `ddb` (double declining), `150db`
