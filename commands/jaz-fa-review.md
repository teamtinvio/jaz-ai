---
description: "Review the fixed asset register in Jaz — check depreciation, identify disposals and write-offs needed"
argument-hint: ""
---

# Fixed Asset Review

Execute the FA review workflow via `clio jobs fa-review`. Reviews the fixed asset register for accuracy and completeness.

## Usage

```
/jaz-fa-review
/jaz-fa-review check for assets to dispose
```

## Workflow

### 1. Generate the blueprint

```bash
clio jobs fa-review --json
```

### 2. Review assets

The blueprint walks through:
- Assets with zero remaining book value (candidates for write-off/disposal)
- Assets past useful life but still active
- Depreciation accuracy vs policy
- Missing or misclassified assets

### 3. Process disposals

For assets to dispose, use the calculator first:

```bash
clio calc asset-disposal --cost 50000 --salvage 5000 --life 5 --acquired 2020-01-01 --disposed 2025-06-15 --proceeds 8000 --json
```

Then execute the disposal recipe:

```bash
clio ct asset-disposal --cost 50000 --salvage 5000 --life 5 --acquired 2020-01-01 --disposed 2025-06-15 --proceeds 8000 --start-date 2025-06-15 --json
```

### 4. Verify

Check the trial balance for fixed asset and accumulated depreciation accounts:

```bash
clio accounts search --ref "Fixed Asset" --json
clio reports generate trial-balance --to 2025-12-31 --json
```

## Key Rules

- Disposals compute gain/loss: proceeds - (cost - accumulated depreciation)
- The asset-disposal recipe creates the disposal journal + notes for FA deregistration
- FA deregistration in Jaz's native FA module is a manual step (not API-accessible yet)
- Depreciation methods for CLI calculators: `sl` (straight-line), `ddb` (double declining), `150db`
