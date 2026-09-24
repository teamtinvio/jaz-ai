---
description: "Check an organization's connection, or manage its optional API key"
argument-hint: "[check | add | rotate]"
---

# Manage keys

OAuth is the default connection: to reconnect, run `clio auth login` and verify the organization; no key file is involved. For a company on the optional API-key route, follow the **keys** flow in the `jaz-kit` skill (`references/flows.md`). The credential model is in `references/workspace.md`.

## Usage

```
/jk-keys
/jk-keys rotate
```
