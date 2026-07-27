---
description: "What Jaz can do — the full operation map"
argument-hint: "[namespace or keyword]"
---

# What Jaz can do

Call the Jaz `describe_capabilities` tool.

- No argument → the full map: every namespace with its operation count and what it covers.
- `$ARGUMENTS` looks like a namespace name (e.g. `invoices`, `bank_accounts`) → pass it as `namespace` to list that area's operations with their parameters.
- Otherwise → pass it as `query` to rank matching operations across all namespaces.

Report the result as a short grouped list, largest areas first, then end with two or three things the user could usefully ask for right now given what they were last working on.

Do not restate any count you did not get from the tool.
