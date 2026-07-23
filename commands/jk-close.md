---
description: "Run a resumable month, quarter, or year close"
argument-hint: "<period: 2026-06 | 2026-Q2 | FY2026>"
---

# Run a period close

Follow the **close** flow in the `jaz-kit` skill (`references/flows.md`). State schema and the resume protocol are in `references/close-state.md`. The accounting steps themselves live in the `jaz-jobs` skill — this drives them, it does not replace them.

## Usage

```
/jk-close 2026-06
/jk-close 2026-Q2
/jk-close FY2026
```

Re-run the same period to resume exactly where the last session stopped.
