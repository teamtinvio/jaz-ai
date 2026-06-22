# Bank-rule column-value mapping (reconcileWithDirectCashEntry)

A bank rule's `reconcileWithDirectCashEntry` shortcut can resolve fields **per row** from a custom bank-statement column instead of hard-coding them. This is the "Set X by" capability: read a column, match its value, and resolve to a target (GL account, tax profile, classifier, contact, or tag).

## ColumnValueMapConfig shape

Every `*Map` field below takes the same shape:

```jsonc
{
  "columnKey": "<camelCaseKeyOfTheCustomColumn>",   // the bank-statement column to read
  "mappings": [
    { "matchType": "EXACT",       "matchValue": "RENT",  "targetResourceId": "<uuid-or-tag-name>" },
    { "matchType": "CONTAINS",    "matchValue": "uber",  "targetResourceId": "<uuid>" },
    { "matchType": "STARTS_WITH", "matchValue": "INV-",  "targetResourceId": "<uuid>" },
    { "targetResourceId": "<uuid>" }                       // catch-all default (no matchValue) — put LAST
  ]
}
```

- `matchType`: `EXACT` | `CONTAINS` | `STARTS_WITH`, compared **case-insensitively**. Omit `matchType`/`matchValue` for a catch-all default row.
- `mappings` are **ordered — the first matching row wins**. Always place the catch-all (blank `matchValue`) last.
- `targetResourceId` is a **resource UUID** for account/tax/classifier/contact maps, or the **tag NAME** (not a UUID) for `tagsMap`.

## Where each map field nests

Inside `configuration.reconcileWithDirectCashEntry`:

- On the shortcut itself:
  - `contactResourceIdMap` — "Set Contact by" (overrides `contactResourceId` when it resolves).
  - `tagsMap` — "Set Tag by" (appends a tag, target = tag NAME, in addition to static `tags`).
- On each `fixedAllocation[]` line:
  - `amountSourceColumnKey` — "Set amount by": take the line's amount from the **absolute value** of a custom AMOUNT column. **Mutually exclusive with `amount`** — omit `amount` when this is set (sending both is rejected).
  - `organizationAccountResourceIdMap` — "Set Account by" (in lieu of a static `organizationAccountResourceId`).
  - `taxProfileResourceIdMap` — "Set Tax by".
  - `classifierConfigMap` — "Set Classifier by" (target = classifier class UUID).

## Reference-string column tokens

`reference` (and `name`) also support custom-column tokens beyond `{{bankReference}}`/`{{bankPayee}}`/`{{bankDescription}}`:

- `{{column:<key>}}` — the column value, signed.
- `{{column_abs:<key>}}` — the absolute value (use for AMOUNT columns).

## Example

```jsonc
{
  "reconcileWithDirectCashEntry": {
    "amountAllocationType": "FIXED",
    "reference": "AUTO-{{column:category}}",
    "contactResourceIdMap": { "columnKey": "payee", "mappings": [{ "matchType": "CONTAINS", "matchValue": "acme", "targetResourceId": "<contact-uuid>" }] },
    "fixedAllocation": [
      {
        "amountSourceColumnKey": "amount",
        "organizationAccountResourceIdMap": {
          "columnKey": "category",
          "mappings": [
            { "matchType": "EXACT", "matchValue": "RENT", "targetResourceId": "<rent-acct-uuid>" },
            { "targetResourceId": "<suspense-acct-uuid>" }
          ]
        }
      }
    ]
  }
}
```

Types live in `src/core/api/bank-rules.ts` (`ColumnValueMapConfig`, `ColumnValueMapEntry`). `configuration` is sent in full on every create/update (full replacement — see Rule 90b).
