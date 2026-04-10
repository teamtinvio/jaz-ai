# CLI Error Recovery Guide

> 30+ error patterns with root cause and fix. Grouped by category.
> CLI errors go to stderr. Exit codes: 0 = success, 1 = user error, 2 = API/network error, 3 = auth error.

---

## Auth Errors (Exit 3)

| Error | Cause | Fix |
|-------|-------|-----|
| `No API key configured` | No auth source found in resolution chain | `clio auth add jk-xxx` or `export JAZ_API_KEY=jk-xxx` |
| `Invalid API key` | Key doesn't start with `jk-` or is malformed | Verify key format: must be `jk-` prefix + UUID |
| `Unauthorized (401)` | Key expired, revoked, or wrong org | Run `clio auth whoami` to check; re-add key with `clio auth add` |
| `--api-key and --org cannot be used together` | Conflicting auth flags | Use one or the other, not both |
| `Profile 'xyz' not found` | `--org xyz` references non-existent profile | Run `clio auth list` to see available profiles |
| `JAZ_API_KEY overrides --org` | Env var takes precedence silently | `unset JAZ_API_KEY` before using `--org` or `clio auth switch` |

---

## Entity Resolution Errors (Exit 1)

| Error | Cause | Fix |
|-------|-------|-----|
| `Multiple contacts match 'Acme'` | Fuzzy match found 2+ candidates above threshold | Use exact billingName or UUID |
| `Contact not found: 'xyz'` | No match in org's contact list | Run `clio contacts search xyz` to check spelling |
| `Account not found: 'xyz'` | No matching account name or code | Run `clio accounts list --json` to see available accounts |
| `Bank account not found` | Name doesn't match any bank-type account | Run `clio bank accounts --json` for exact names |
| `Tax profile not found` | No match on tax profile name or code | Run `clio tax-profiles list --json` for available profiles |
| `Multiple accounts match` | Ambiguous account name | Use account code (e.g., `1000`) or UUID instead |

**Key rule**: Contact resolution is fuzzy. Account resolution in `--lines` JSON is NOT fuzzy -- use UUID or exact name.

---

## Validation Errors (Exit 1)

| Error | Cause | Fix |
|-------|-------|-----|
| `missing required option(s): --contact, --lines` | Required flag not provided | Add the missing flags |
| `lineItems[0].accountResourceId is required` | Line item missing account (required for finalized) | Add accountResourceId to each line item |
| `currency is required` | FX transaction without currency | Add `--currency SGD` (or target currency) |
| `contactResourceId is required` | Transaction without contact | Add `--contact "Name"` or `--contact <uuid>` |
| `valueDate is required` | Transaction without date | Add `--date YYYY-MM-DD` |
| `journalEntries must have equal debits and credits` | Journal out of balance | Ensure DEBIT total equals CREDIT total |
| `At least one line item is required` | Empty --lines array | Provide at least one line item object |
| `Invalid date format` | Date not in YYYY-MM-DD | Use ISO format: `--date 2026-03-15` |
| `unitPrice must be a number` | String passed for numeric field | Remove quotes from numeric values in JSON |
| `Invalid status filter` | Wrong status value for entity type | Check valid statuses: DRAFT, APPROVED, PAID, VOIDED, DELETED |

---

## Pagination Errors (Exit 1)

| Error | Cause | Fix |
|-------|-------|-----|
| `--all and --offset cannot be combined` | Conflicting pagination modes | Use either `--all` or `--offset`, not both |
| `offset must be >= 0` | Negative offset value | Offset is 0-indexed page number (0 = first page) |
| `limit must be between 1 and 100` | Out-of-range page size | Max 100 per page; use `--all` for larger fetches |
| `Result truncated (10000 row cap)` | `--all` hit default max-rows | Add `--max-rows 50000` to increase the cap |

---

## API / Network Errors (Exit 1 or 2)

| Error | Cause | Fix |
|-------|-------|-----|
| `ECONNREFUSED` | API server unreachable | Check network connection; verify API URL |
| `ETIMEDOUT` | Request timed out | Retry; check for slow network or large payload |
| `429 Too Many Requests` | Rate limited by API | Wait 30-60 seconds and retry |
| `API error 422: ...` | Server-side validation failure | Read the error message -- it names the bad field |
| `API error 400: ...` | Malformed request body | Check JSON syntax in `--lines` or `--input` |
| `API error 404: ...` | Endpoint or resource not found | Verify resourceId exists; check command spelling |
| `API error 500: ...` | Server-side error | Retry once; if persistent, check API status |

---

## File / Input Errors (Exit 1)

| Error | Cause | Fix |
|-------|-------|-----|
| `File not found: ./payload.json` | `--input` path doesn't exist | Check file path and working directory |
| `Invalid JSON in input file` | Malformed JSON in `--input` file | Validate with `jq . payload.json` before passing |
| `Unexpected token in JSON` | Bad JSON in `--lines` flag | Escape quotes properly; use single quotes around JSON |
| `Bank file format not supported` | Unsupported statement format | Supported: CSV, OFX, QIF, XLS, XLSX |

---

## Recovery Patterns

**Auth not working?** Systematic diagnosis:
```bash
clio auth whoami          # Check current auth source
clio auth list            # See all saved profiles
echo $JAZ_API_KEY         # Check for env override
echo $JAZ_ORG             # Check for pinned org
```

**Entity not found?** Search before creating:
```bash
clio contacts search "partial name" --json | jq '.data[] | {name, resourceId}'
clio accounts list --json | jq '.data[] | {name, code: .accountCode, id: .resourceId}'
```

**Create failed?** Check the draft first:
```bash
# Validate JSON offline
echo '[{"name":"Item","quantity":1,"unitPrice":100}]' | jq .

# Try without --finalize (less strict validation)
clio invoices create --contact "Acme" --date 2026-01-15 --lines '[...]'
```
