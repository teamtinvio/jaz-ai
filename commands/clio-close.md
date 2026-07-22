---
description: "Run a resumable month, quarter, or year close"
argument-hint: "<period: 2026-06 | 2026-Q2 | FY2026>"
---

# Run a period close

Follow the **close** flow in the `clio-kit` skill (`references/flows.md`). State schema and the resume protocol are in `references/close-state.md`. The accounting steps themselves live in the `jaz-jobs` skill — this drives them, it does not replace them.

## Usage

```
/clio-close 2026-06
/clio-close 2026-Q2
/clio-close FY2026
```

Re-run the same period to resume exactly where the last session stopped.
