---
description: "Set up Jaz Kit, or add another company"
argument-hint: "[company name]"
---

# Set up Jaz Kit / add a company

Follow the **setup** flow in the `jaz-kit` skill (`references/flows.md`). Onboarding questions are in `references/org-interview.md`; file scaffolds are in `references/templates.md`.

## Usage

```
/jk-setup                 first run — creates the kit and connects a company
/jk-setup Acme Pte Ltd    add another company
```

Run it as often as you have companies. It detects an existing kit and goes straight to adding the next one.
