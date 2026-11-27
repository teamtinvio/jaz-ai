# PDF Templates

A PDF template is the print layout of one kind of document. Each organization holds one or more per template type, and exactly one default per type. A document prints with its own template, else its contact's assigned template, else the default of its type.

**A document's own template.** Create and update of invoices, customer credit notes, quotes and purchase orders take `template` (MCP: a template's resourceId or exact name, found among the document's type) and send it as `templateResourceId`. Left out, a create takes the contact's template, else the default, and an update keeps the current one. Reads return it as `templateResourceId` (invoices also `deliverySlipTemplateResourceId`); the get tools name each under `templates`. A sale order prints only its confirmation and delivery slip (`orderConfirmationTemplateResourceId`, `deliverySlipTemplateResourceId`, from its contact or the default); a purchase request prints with no template. Neither takes one of its own.

Tools (MCP, `pdf_templates` namespace): `list_pdf_templates`, `search_pdf_templates`, `get_pdf_template`, `list_pdf_template_styles`, `list_pdf_template_layout_settings`, `create_pdf_template`, `update_pdf_template`, `set_default_pdf_template`, `upload_template_image`, `delete_pdf_templates`. CLI: `clio pdf-templates` (list, search, get, styles, create, update, set-default, delete). Every tool and command that takes a template takes its **resourceId or exact name**. A name several types use needs `templateType` to narrow it.

## Template types

| `templateType` | Document |
|---|---|
| `INVOICE` | Invoice |
| `CUSTOMER_CREDIT` | Customer credit note |
| `RECEIPT` | Invoice payment receipt |
| `REFUND` | Credit note refund advice |
| `CUSTOMER_STATEMENT` | Statement of account |
| `SALE_QUOTE` | Quote |
| `PURCHASE_ORDER` | Purchase order |
| `INVOICE_DELIVERY_SLIP` | Delivery slip printed from an invoice |
| `ORDER_DELIVERY_SLIP` | Delivery slip printed from a sale order |
| `SALE_ORDER_CONFIRMATION` | Sale order |
| `DIRECT_CASH_IN_RECEIPT` | Cash-in receipt |
| `DIRECT_CASH_OUT_ADVICE` | Cash-out advice |
| `BILL_PAYMENT_ADVICE` | Bill payment advice |
| `COLLECTION_REQUEST` | Payment request (pay link and checkout QR) |
| `PAYSLIP` | Payslip |

## The layout (`templateSettings`)

A JSON object, read and written as an object. Its shape is the app's own editor output, about 150 to 200 settings in sections that differ by type. `list_pdf_template_layout_settings` (`GET /api/v1/pdf-templates/layout?templateType=`) lists every one a type can hold: its path, the kind of value (OBJECT, LIST, FILES, BOOLEAN, TEXT, NUMBER, PERCENT, CHOICE), its choices or bounds, when its label is required, and the sets of column widths that must add up to 100. The ones most often changed, with the names the app shows:

| Key | Values (the name the app shows) |
|---|---|
| `colorTheme` | `default` (Gray), `calm` (Green), `bold` (Midnight), `trust` (Blue), `social` (Pink), `ivory`, `gold`, `peach`; a theme shows only on the Overlay, Smooth and Formal styles |
| `margins` | `default` (Standard), `compact`, `comfortable` (Relaxed) |
| `templateFont` | `Inter`, `LatoFont` (Lato), `Roboto`, `Figtree`, `SourceSans3` (Source Sans 3) |
| `fontSize` | `default`, `smaller`, `larger` |
| `documentTitle` | `{ title, isUppercase }` (customer statements use `statementDocumentTitle` / `balanceDocumentTitle`) |
| `documentLogo` | `[{ fileId, fileUrl, fileName, fileType, resourceId }]`, an image already on one of the organization's templates (below); `[]` prints no logo |
| `headerImageType` | `LOGO`, or `LETTERHEAD` to print `documentLetterhead` across the top |
| `documentLetterhead` | same shape as `documentLogo` |

Every template a tool returns carries `looks`: its style and these settings by the names the app shows (`{ style: "Formal", colorTheme: "Blue" }`). Say those to people, never the codes or keys. In `sideDetailConfigs`, `vatId` is the GST/VAT number and `registrationId` the company registration number: never label one as the other.

Other sections: `documentDetailConfigs`, `sideDetailConfigs`, `tableColumnConfigs`, `totalDetailConfigs`, `taxSummaryConfigs`, `footerConfigs` (notes, bank details, online payment), `supportingTableConfigs`, `payslipConfigs`, `deliverySlipConfigs`, and the statement and balance sections. Read a template with `get_pdf_template` to see its own.

- **Only what the app's editor sets.** Send only keys and values `list_pdf_template_layout_settings` lists for the type: read it before writing. A setting it does not list cannot be set (say so plainly), never something to try. A refusal lists every problem with the values allowed: pass it on as it reads.
- **A new logo, letterhead or payment QR is uploaded first, then placed.** `upload_template_image` (`kind` LOGO, LETTERHEAD or PAYMENT_QR; the file attached to the call or a `sourceUrl`) posts the image to `POST /api/v1/pdf-templates/images` and answers `{fileId, fileName, fileType, fileUrl}` with `settings`, the change that puts it on a template (`documentLogo` + `headerImageType`, `documentLetterhead` + `headerImageType`, or `footerConfigs.paymentsSection.qrCode`): pass that to `create_pdf_template` or `update_pdf_template`. An image one of the organization's templates already prints can be reused instead: that entry's `fileId` with its stored `fileUrl`, copied from `get_pdf_template`. Any other file or address is a 422.
- **Values are checked only where they change.** A layout read and sent back is never refused over a value saved before (old templates can carry `HELVETICA` or `Arial`, which the engine still draws). A changed key or value outside what `list_pdf_template_layout_settings` lists is a 422 naming it.

## What templates cannot do

No setting exists for: column order, item images, a SKU column, paper other than A4, footer text on every page, hiding invoice page numbers, a signature line (invoices, credit notes, purchase orders), a fixed terms block, the amount in words on invoices, a PayNow QR with the amount, hex colours (offer the closest theme), exact logo placement (offer the closest style), bill templates. These settings are all the app has: say so plainly ("Invoices cannot show the amount in words. There is no setting for it."), never "not available yet". Read a template before writing; never write to learn a shape, and never create documents on real customers to preview one: say where to open it.

## `settings`: a change, merged

The tools take `settings` (CLI: `--set path=value`, `--settings-file`) as a CHANGE, never the whole layout:
- **Objects merge key by key, at any depth.** `{"documentTitle": {"title": "Tax Invoice"}}` keeps `isUppercase`.
- **Arrays, values and `null` replace whole.** `{"documentLogo": []}` removes the logo; there is no way to remove a key, only to set it.
- **Update** merges onto the stored layout and sends all of it (the API replaces the layout in full on update).
- **Create** sends the change as is, and the API merges it onto the layout of the organization's default template of the type by the same rules. Without `settings`, the new template is a copy of that layout. With no template of the type to start from, `settings` is the whole layout.

## Defaults

- **A new template is never the default.** `set_default_pdf_template` (an update with `isDefault: true` on the wire) makes one the default and answers `previousDefault`. Only `true` is accepted: change the default by setting it on the template that should become it.
- **Create starts from the default template**: its layout (see above) and its style when `styleCode` is left out; with no template of the type, the type's default style.

## Styles

`styleCode` is one of the codes `list_pdf_template_styles` returns for the template type (`STYLE_CODE_CLASSIC`, `STYLE_CODE_SMOOTH`, `STYLE_CODE_OVERLAY`, `STYLE_CODE_FORMAL`, `STYLE_CODE_BENTO`, as the catalog offers them per type). Any other code is a 422 listing the valid ones. The `STYLE_ONE` / `STYLE_TWO` / `STYLE_THREE` values some upstream schema names are not used.

## Page order and the second document

`templateOrderType` applies to six types; every other type refuses it.

| Template type | `templateOrderType` (first = what a new template starts with) |
|---|---|
| `RECEIPT` | `RECEIPT_ONLY`, `RECEIPT_FOLLOWED_BY_INVOICE`, `INVOICE_FOLLOWED_BY_RECEIPT` |
| `REFUND` | `REFUND_ONLY`, `REFUND_FOLLOWED_BY_CUSTOMER_CREDIT`, `CUSTOMER_CREDIT_FOLLOWED_BY_REFUND` |
| `DIRECT_CASH_IN_RECEIPT`, `DIRECT_CASH_OUT_ADVICE`, `BILL_PAYMENT_ADVICE` | `RECEIPT_ONLY`, `RECEIPT_FOLLOWED_BY_VOUCHER`, `VOUCHER_FOLLOWED_BY_RECEIPT` |
| `COLLECTION_REQUEST` | `RECEIPT_ONLY` |

`parentBtTemplateResourceId` (tools: `parentTemplate`, a name or id) names the template printed as the second document:
- A `RECEIPT` printed with its invoice names an `INVOICE` template; a `REFUND` printed with its credit note names a `CUSTOMER_CREDIT` template. Left out, it is the organization's default template of that type.
- A `COLLECTION_REQUEST` may name the `DIRECT_CASH_IN_RECEIPT` template used once the request is paid. `null` (CLI `--no-parent`) removes it.
- A receipt printed with its invoice, or a refund printed with its credit note, always names one: `null` on an update is refused (422). Name another template, or leave it out to keep the current one. On a create, `null` is the same as leaving it out: the default template.
- The voucher page of a cash receipt or payment advice is not a template, so those take none.
- A named template that does not exist, or is of another type, is a 422 (upstream alone would quietly print the default instead).
- An update that leaves page order and parent out keeps both.

## Refusals

| Status, `error_type` | When |
|---|---|
| 400 `invalid_request_body` | `templateType` sent on an update: a template's type cannot change. Create one of the other type instead. |
| 400 `unknown_field` | A field the request does not take, `isDefault` on a create among them. |
| 422 `pdf_template_locked` | A locked template (`controlFlag: true`) cannot be updated or deleted. Create a new template from it. |
| 422 `OTHER_TEMPLATE_CANNOT_BE_DEFAULT_WHEN_CUSTOM_TEMPLATE_EXIST` | The organization has a locked template of the type: no other one can be the default. |
| 422 `DUPLICATE_TEMPLATE` | The name is taken (case, and space against `_`, ignored). |
| 422 `ORGANIZATION_TEMPLATE_LIMIT_REACHED` | 100 templates of the type already. |
| 422 `validation_error` | A delete that would leave a type with no template; a bad value in the layout; a style, page order or parent the type does not take. |

## Delete

`delete_pdf_templates` takes up to 100 templates and deletes all or none. Refused (nothing deleted) when any is not found, is locked, is the default of its type, or the batch would remove every template of a type. Clio refuses a default before anything is sent and names the others: make another template the default first (`set_default_pdf_template`). The API itself would hand the default to the most recently created remaining template, which nobody chose. Contacts assigned a deleted template print with the default again. Images uploaded for it (logo, letterhead, payment QR) are not deleted: they stay in the organization's file storage (the result says so in `images`).

## Paging

Search pages with `limit` (default 20, max 1000) and `offset`, a 0-indexed **page** number. The default template of each type is always listed first, whatever the sort.
