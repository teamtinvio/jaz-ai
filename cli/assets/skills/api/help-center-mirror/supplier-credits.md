### Draft Supplier Credits
Source: https://help.jaz.ai/en/articles/9115439-draft-supplier-credits

**Q1. Can I save a supplier credit note as a draft?**

- Yes, a supplier credit note can be saved as a draft even if all the mandatory fields are not filled.

**Q2. How can I convert a draft supplier credit note to an active one?**

- Any draft supplier credit note can be converted to active only after all the mandatory fields are filled.

**Q3. Can I save a supplier credit refund record as a draft?**

- Similar to a supplier credit note, a refund can also be saved as a draft against a credit note.

**Q4. How can I convert a draft refund record to an active one?**

- For supplier credits, any draft refunds are converted only if the credit note is also converted to active.
- Hence, to record the refund, the supplier credit note must be converted to active status.

**Q5. Can I delete a draft supplier credit?**

- Yes, you can delete a draft supplier credit note. If the note also had a linked draft refund record, it will also be deleted.

**Q6. Do draft supplier credits affect my financial reports?**

- No, they do not. Financial reports are only affected once the supplier credit notes are active, and a refund has been recorded for it or it has been applied to a bill.

**Q7. Can I create a non-base draft supplier credit note?**

- Yes, you can save a supplier credit note as a draft even if it is in non-base currency.

​

**Q8. Do draft supplier credit refunds affect my financial reports?**

- No, draft supplier credit refunds do not affect financial reports. ​

**Q9. Can I create a non-base draft supplier credit refund?**

- Yes, you can save a supplier credit refund even if it's in non-base currency.

---

### Jaz Magic (Supplier Credit)
Source: https://help.jaz.ai/en/articles/9115441-jaz-magic-supplier-credit

**Q1. Is Jaz Magic currently available for supplier credits?**

Jaz Magic is currently unavailable for supplier credit notes.

---

### Supplier Credit Downloads
Source: https://help.jaz.ai/en/articles/9115443-supplier-credit-downloads

**Q1. How can I download an active supplier credit note PDF?**

Supplier credit notes on Jaz are not available for download.

---

### Transaction Settings (Supplier Credit)
Source: https://help.jaz.ai/en/articles/9115440-transaction-settings-supplier-credit

**Q1. How does setting a default for supplier credits simplify the creation process?**

- By having supplier credit note default settings, the different supplier credit note settings fields will be filled up automatically based on your preferences every time you create a supplier credit note.
- This means that you can save the hassle of having to repeatedly fill in your supplier credit note settings as you are creating supplier credit notes.

**Q2. Can I customize the default settings for supplier credit notes?**

- Yes, you can customize the default settings for a supplier credit note. The default settings can be found in each record.

**Q3. Will the default settings apply to all the supplier credit notes automatically? Even the ones already created?**

- Default settings will apply to all new supplier credit notes during creation automatically. Supplier credit notes that have already been created will not be affected.

**Q4. Can I override the default settings for an individual supplier credit if needed?**

- Yes, you can adjust the individual supplier credit note settings even if supplier credit note default settings are applied. Refer to [Supplier Credit settings](https://help.jaz.ai/en/articles/9115428-supplier-credit-settings) for more information.

**Q5. Can I change the default settings for supplier credits at any time?**

- Yes, simply set up the default supplier credit settings again as normal.

**Q6. Can I bulk edit nano classifiers in my Supplier Credit?**

- Yes, you can bulk apply or remove classifiers in Supplier Credit Settings.

---

### User Roles (Supplier Credit)
Source: https://help.jaz.ai/en/articles/9115442-user-roles-supplier-credit

**Q1. How do different permission levels in Jaz affect what I can do with supplier credits?**

- Admins can:
  - View all supplier credit notes.
  - Create and manage active supplier credit notes.
- Preparers can:
  - View all supplier credit notes.
  - Create and manage all draft supplier credit notes.
- Members can:
  - View only the supplier credit notes that they have created.
  - Create and manage draft supplier credit notes created by them.

---

### Create Supplier Credits
Source: https://help.jaz.ai/en/articles/9115427-create-supplier-credits

**Q1: Can I import supplier credits?**

- Yes, You can now import supplier credit notes using the Import Credits option.
- Importing supplier credit notes supports
  - Multiple line items per credit note (grouped by reference)
  - Currency and FX rate type
  - Due date
  - Tax-inclusive type
  - Internal notes

**Q2: Can I import supplier credit note refunds?**

- No, refunds are not supported in the supplier credit note import. Only credit notes with line items can be imported at this time.

**Q3. How can I add more fields to the supplier credit template?**

- While creating a new supplier credit note, under **Supplier Credit Settings>Advanced**, enter**Custom fields.**
  - If you do not see this option available, it means that you currently do not have any custom fields set up. See [Custom Fields](https://help.jaz.ai/en/articles/9066650-custom-fields) for more information on setting custom fields.

**Q4. How can I edit a supplier address for a supplier credit?**

- You cannot edit a supplier's address through the supplier credit creation workflow.
- If you need to edit a supplier's address, please update their contact information directly.
- Refer to [Contacts](https://help.jaz.ai/en/articles/8938009-contacts) for more help and information.

**Q5. Where can I download a supplier credit note?**

- Downloads are not available for supplier credit notes.

**Q6. Can I duplicate a supplier credit?**

- Yes, you can duplicate a supplier credit.
- Upon duplication, a **New supplier credit**creation screen will show, with all fields automatically filled in following the selected credit note.

**Q7. Can I schedule a supplier credit?**

- No, Jaz only supports scheduling for invoices, bills, and journal entries.

**Q8. What are the fields being duplicated when you duplicate a supplier credit?**

- All the previous information on the supplier credit will be duplicated, except for the supplier creddit note reference.

**Q9. How do I add discounts?**

- To add a discount, ensure that **Discounts**are enabled under **Item Attributes**in the **Supplier Credit Settings.**
- You will then be able to add a discount at a line item level.
- When discounts are applied, the Subtotal amount becomes clickable to view the breakdown of the applied discounts.

**Q10. How do I add taxes?**

- To add taxes for a supplier credit note, ensure that you have selected a **GST/VAT setting** under default**GST/VAT**, either**GST/VAT Included in Price** or **GST/VAT Excluded in Price**.
- Afterwards, you will be able to select a tax profile at a line item level.
- These taxes will also show up in the supplier credit total summary.

**Q11. How do I choose a currency for a supplier credit?**

- Click on the **currency label** within the supplier credit note. You will be brought to the currency settings.
- Select the currency that you would like the supplier credit note to have.

**Q12. Can the currency be automatically determined, or do I need to select it manually?**

- Yes. There are a few ways where the currency can be automatically determined:
  1. Via the contact's default currency setting.
    1. If you have selected a contact for the supplier credit note, the currency will be automatically set to the contact's default currency.
  1. Your supplier credit default settings
    1. Under **Default Settings > Accounting,**you can also set a default supplier credit note currency there.
  1. Your organization's base currency
    1. If both are not available, the organization's base currency will be used.
- If you would like to choose a currency outside of these options, you can select it from the list of currencies already added to your organization. If not, you can also **add a currency**.**Q13. What is the difference between the supplier credit setting, supplier credit default setting, and supplier-selected currency options?**

- **Supplier credit note setting**: Settings that will only be applied to a single supplier credit note (the one being created or looked at)
- **Supplier credit default setting**: Settings that will automatically be applied by default at the start of the supplier credit note creation process for all supplier credit notes
- **Supplier-selected currency options**: The currency that you have associated the supplier contact with, typically the currency that you transact in with this contact.**Q14. How does selecting a currency affect my business transactions?**

- Selecting a currency that is different from your base currency may lead to foreign-exchange gains & losses due to differences in exchange rates when the supplier credit note was created and when refunds or application of supplier credit notes are done.

**Q15. Can I use different currencies for different supplier credits?**

- Yes, different currencies can be set at a supplier credit note level.

**Q16. Can I change the currency for a supplier credit after it has been created?**

- Yes, you can change the currency for a supplier credit note after it has been created by editing the currency in **Supplier Credit Settings**.**Q17. Are there any additional fees or considerations associated with using different currencies in my supplier credits?**

- No, Jaz does not charge a fee for making use of different currencies in your supplier credit notes.
- However, do be mindful of any potential foreign exchange gains and losses due to differences in exchange rates between the creation of the supplier credit note and when refunds or application of supplier credit notes are done.

**Q18. How are currency conversions & exchange rates handled for a supplier credit note?**

When choosing a currency under **Supplier Credit Settings,**
- If an organization's custom exchange rate has been set for the currency & time range that the supplier credit note was created in, Jaz will make use of this exchange rate.
- You can also set an exchange rate on a transaction level.
- If not, Jaz will use a third-party service to determine a mid-market exchange rate, and use that instead.

**Q19. Can I add withholding to my supplier credit?**

- Yes. Just select the applicable withholding code you want to use and this will calculate the total amount with withholding tax applied.
​

---

### Supplier Credit Attachments
Source: https://help.jaz.ai/en/articles/9115432-supplier-credit-attachments

**Q1. Can I upload attachments to a supplier credit note?**

- You can upload attachments during supplier credit note creation
- Alternatively, you can add attachments to an existing customer credit note.

**Q2. Can I preview the uploaded attachment?**

- Yes, you can see a preview of the attachment by clicking on the it after uploading.

---

### Supplier Credit Line Items
Source: https://help.jaz.ai/en/articles/9115429-supplier-credit-line-items

**Q1. How can I save a new item when creating a supplier credit note?**

- You can’t save a new item when creating a supplier credit note. You need to go to Items List to create a new item. Afterwards, the item will appear when creating a supplier credit note. See[Items List](https://help.jaz.ai/en/articles/9094095-items-list) for more information.
- However, you can create a new custom item. Refer to [Items List](https://help.jaz.ai/en/articles/9094095-items-list)for more information.

**Q2. How can I update the GST/VAT profile for a line item?**

- Ensure that a GST/VAT setting has been selected (GST/VAT included in price or GST/VAT excluded in price) via the **Supplier Credit Settings.**
- Afterwards, you will be able to select a GST/VAT profile for the line item.
- To update the GST/VAT profile for a line item, choose from one of your organization's existing GST/VAT profiles, or **Add New**to add a new GST/VAT profile.

​

**Q3. What is a custom item, when would I need to create one for a supplier credit note?**

- A custom item is an item that you create at the point of supplier credit note creation. The item is not created via the Items List and does not appear in the drop-down list of items that you can select from.
- You can create one if you think that this item will only be used in the current transaction. Otherwise, we would recommend creating an item in the Items List. See[Items List](https://intercom.help/jaz-ca1acb882400/en/articles/9094095-items-list) for more information on using Items.

**Q4. Is there a restriction on the type of account I can select for an item in a supplier credit note?**

- While there are no strict restrictions on the type of account you can select for an item in a supplier credit note, Jaz will **warn you** if you have selected an account that is not an**Expense **or**Asset Account**.**Q5. Why do I not see all the VAT/GST profiles created in a supplier credit note?**

- Some of your previously created VAT/Tax profiles may only apply to other business transactions such as invoices or customer credits. As such, you may not be able to select them for your supplier credit note.

---

### Supplier Credit Settings
Source: https://help.jaz.ai/en/articles/9115428-supplier-credit-settings

**Q1. Where can I adjust the settings for a single supplier credit note?**

- Click on the **gear icon**on the right side of the screen while creating a supplier credit note. A menu should show up.

**Q2. How can I remove GST/VAT, item discount, or item quantity & unit from appearing in the supplier credit note?**

- To remove GST/VAT, you can adjust the default GST/VAT settings to **No GST/VAT.**
- To remove item quantity & unit, you can disable both options under **Item Attributes.**

---

### Delete Refund (Supplier Credit)
Source: https://help.jaz.ai/en/articles/9115448-delete-refund-supplier-credit

**Q1. Can I delete a refund record?**

- Yes, you can delete a supplier credit refund record.
- After deleting a refund, the refund details and status on the associated supplier credit note will be automatically updated.
- **Note**: If a refund is marked as deleted, you will not be able to undo the action or retrieve the deleted refund record.**Q2. How do I undo a deleted refund record?**

- You will not be able to undo a deleted refund record.

**Q3. How do I retrieve a deleted refund record?**

- You will not be able to retrieve a deleted refund record.

**Q4. Will deleting my supplier refunds affect my financial reports?**

- Yes, as deleting refunds will affect your organization's financial position. This change will be reflected in different financial reports available on Jaz.
- Specifically, the refund record will be removed from the account that the refund was originally made to, and no longer show in the **General Ledger**.
- The account's balances will also update accordingly, thus reports that depend on the General Ledger and the account will also see updates.

**Q5. Can I add a note/explanation while deleting a refund?**

- Jaz currently does not support adding notes/explanations while deleting a refund.
- You will be prompted to delete the payment right away.

**Q6. What happens to a supplier credit note if a refund associated with it is deleted?**

- If a refund record associated with the supplier credit note is deleted, the status of the supplier credit note will change back to **Credit Available.Q7. Can I delete partial refunds or only full refunds?**

- You can delete all types of refunds on a supplier credit note.

---

### Edit Refund (Supplier Credit)
Source: https://help.jaz.ai/en/articles/9115447-edit-refund-supplier-credit

**Q1. Can I edit a refund record?**

- Yes, you can edit a refund record.

**Q2. Can I edit a supplier credit refund even if it's in non-base currency?**

- Yes, a supplier credit refund's currency will not affect this.

**Q3. Are there any restrictions on how many times I can edit a supplier credit refund?**

- No, there are no restrictions. You can edit a supplier credit refund as many times as you need to.

**Q4. What fields can I modify while editing a supplier credit note?**

- There are no restrictions on the fields that you can modify while editing.

---

### Record Refunds (Supplier Credit)
Source: https://help.jaz.ai/en/articles/9115444-record-refunds-supplier-credit

**Q1. How do I add a new refund method type for a refund?**

- You cannot add a new payment method type for refunds.

**Q2. Can I download a PDF for a supplier refund?**

- Jaz does not support downloads for supplier refunds.

**Q3. How do I record a refund for a supplier credit?**

- Refunds can only be recorded after a supplier credit note is created. Ensure to fill in all the details to save.

**Q4. Can I record a partial refund for a supplier credit?**

- Yes, you can. Under the **Supplier Refund Amount**, enter an amount that is less than the maximum supplier credit note amount.
- This will result in a partial refund, where only part of the supplier credit note is refunded.

**Q5. What happens if I make a refund payment in a different currency than the refund payment I record?**

- If there is a difference between the recorded amount converted to base currency and the actual cash received amount converted to base currency, realized gain-loss will take place. This is further explained in [Q7. When does realized FX gain-loss (RGL) happen, and how is it calculated?](#h_0dbc1a82cd)

**Q6. Where is the payment rate fetched from if the currencies don't match?**

- If the cash received currency does not match the recorded refund currency, there is a possibility of a realized gain/loss due to the fluctuations in the exchange rates.
- Jaz fetches a custom rate if available on the date of the payment. If not, the rate is fetched from 3rd party services.
- You can also adjust the payment rate if the one fetched by Jaz is not the rate you want to use for the payment.

**Q7. When does realized FX gain-loss (RGL) happen, and how is it calculated?**

- RGL happens when the following conditions are fulfilled:
1. There is a difference between the supplier refund amount converted to the organization's base currency, and the cash received converted to the organization's base currency.
1. The following recorded supplier refund/cash received currency combinations take place:

| **Supplier refund currency** |**Cash received currency (Actual cash received from supplier)** | **Is there RGL?** |
| --- | --- | --- |
| Organization's base currency (e.g. SGD) | Non-base currency (e.g. USD) | Yes |
| Non-base currency (e.g. USD) | Organization's base currency (e.g. SGD) | Yes |
| Non-base currency (e.g. USD) | Non-base currency (e.g. USD) | Yes |
| Non-base currency (e.g. USD) | Non-base currency (e.g. EUR) | Yes |
| Organization's base currency (e.g. SGD) | Organization's base currency (e.g. SGD) | No |

- RGL is calculated this way for customer credit notes:
  - **Realized FX (Gain)/Loss = (Supplier refund amount / Transaction rate) - (Cash received amount / Payment rate)**
  - Where:
    - Supplier refund amount: The amount recorded as refunded for a supplier credit note
      - This amount amount may be the entire supplier credit note's amount, or a part of it (partial refund).
    - Transaction rate: The exchange rate on the supplier credit note (1.00 if the supplier credit note is in the base currency)
    - Cash received: The amount received (paid in) for the recorded supplier refund.
      - The supplier refund refund amount will be equal to the cash received amount if the supplier credit note and refund account are in the same currency.
    - Payment rate: The exchange rate for the refund payment (1.00 if the refund payment is in the base currency)

- FX gains are recorded as **negative expenses**, while losses are recorded as**positive expenses** to the **FX Realized (Gains)/Loss**account.

- In other words,
  - **FX gains** are recorded if the supplier refund amount in base currency is**less than** the cash received in base currency at the exchange rate on payment date.
  - **FX losses**are recorded if the supplier refund amount in base currency is **greater than** the cash received in base currency at the exchange rate on payment date.

- Example 1 - The supplier refund is recorded in EUR, cash received in USD and the organization's base currency is in SGD:
  - Supplier refund amount: 55.00 EUR
  - Transaction Rate: 1.00 SGD = 0.68413 EUR
  - Cash received: 65.00 USD
  - Payment rate: 1.00 SGD = 0.74338 USD
  - Hence, in this case:
    - **Realized Gain**- (**7.04 SGD)= (55.00 / 0.68413) - (65.00 / 0.74338)**

- Example 2 - The supplier refund is recorded in USD, cash received in SGD and the organization's base currency is in SGD:
  - Supplier refund amount: 55.00 USD
  - Transaction Rate: 1.00 SGD = 0.74338 USD
  - Cash received: 70.00 SGD
  - Payment rate: 1.00 SGD = 1.00 SGD (Since SGD is the base currency)
  - Hence, in this case:
    - **Realized Loss - 3.99 SGD = (55.00 / 0.74338) - (70.00 / 1.00)Q8. How will deleting a tax profile impact my refund records?**

- Deleting a tax profile will not have an impact on any refunds that have already been made and recorded.
- However, you will not be able to select the deleted tax profile moving forward when creating new supplier credit notes, which may have effects on pre and post-tax calculations.

**Q9. How will making an account inactive impact my refund records?**

- Making an account inactive will not have an impact on any refunds that have already been made and recorded.
- However, you will not be able to select the inactive account as a refund account (in the case of cash and bank accounts) moving forward, until the account is active again.

---

### Transaction Fees (Supplier Credit Refunds)
Source: https://help.jaz.ai/en/articles/9306138-transaction-fees-supplier-credit-refunds

**Q1. Can I record transaction fees for supplier credit refunds on Jaz?**

- Yes, you can. When recording a refund for a supplier credit note, you will find an option to add transaction fees.
- You can record transaction fees in absolute amounts or as a percentage of the cash received.

**Q2. What can I use the transaction fee option on supplier credit refunds for?**

- The transaction fee option might be useful in some scenarios such as:
  - Your payment provider charges you a fee when you make a payment to your suppliers.

**Q3. What happens when a transaction fee is recorded?**

- When you record a transaction fee for a supplier credit refund, the transaction fee charged is deducted from the amount under **Cash Spent**.
- The **Net Cash Spent**reflects the actual refunded amount, excluding fees**.**
- On the supplier credit note details, the refund amount shown in the customer credit note's total summary will reflect the **Gross Cash Spent**or the cash spent before fees.

**Q4. How does recording GST/VAT work for transaction fees?**

- You can include GST/VAT on fees easily by selecting a profile.
- The summary will reflect a breakdown of the fees charged, showing the actual **fees charged**and the **GST/VAT on fees**.**Q5. How are transaction fees reflected on the general ledger?**

- On the general ledger, you should see a record reflecting the transaction fees charged under the expense account (for e.g. **Transaction Fees & Charges**) that you have selected when recording a transaction fee.
- If you have indicated **GST/VAT included** in the transaction fees, you should see an additional record for the included GST/VAT under the**Input GST Receivable **account.

---

### View Refunds (Supplier Credit)
Source: https://help.jaz.ai/en/articles/9115445-view-refunds-supplier-credit

**Q1. How can I view past refund records for a supplier credit note?**

- All the refunds made for a supplier credit note can be found in the supplier credit note details.

**Q2. How do I know if there is an aggregate RGL displayed on the customer credit note?**

- Aggregate RGL may apply if multiple partial refunds are done on the same supplier credit note.

**Q3. Will I be able to see a list of all the refunds or just 1 complete refund on the supplier credit?**

- You will be able to see a list of all refunds being made with the supplier credit.

---

### Delete Supplier Credit
Source: https://help.jaz.ai/en/articles/9115437-delete-supplier-credit

**Q1. Can I delete a supplier credit note?**

- Yes, you can delete a supplier credit note.
- **Asupplier credit note must first be voided before it can be deleted. See [Void supplier credit note](https://help.jaz.ai/en/articles/9115436-void-supplier-credit) for more details.**
- **Note**: If a supplier credit note is marked as deleted, you will not be able to undo the action or retrieve the deleted record.**Q2. How do I undo a deleted supplier credit note?**

- You will not be able to undo a deleted supplier credit note.

**Q3. How do I retrieve a deleted supplier credit note?**

- You will not be able to retrieve a deleted supplier credit note.

**Q4. What happens to any refunds associated with a supplier credit note after deleting?**

- When you void a supplier credit note before deleting it, it would have already removed any associated refund records. As such, there will be no further effects when deleting the supplier credit note.

**Q5. Will deleting a supplier credit note affect my financial reports?**

- Deleting a supplier credit note will not have further effects on your financial reports, as voiding the supplier credit note beforehand would have already done this.

**Q6. Can I add a note/explanation while deleting a supplier credit note?**

- Currently, you may not add additional internal notes while deleting a supplier credit note.

---

### Edit Supplier Credit
Source: https://help.jaz.ai/en/articles/9115435-edit-supplier-credit

**Q1. Can I edit a supplier credit note?**

- Yes, you can edit a supplier credit note.
- Choose the **edit**option from the 3-dot menu of the desired supplier credit note details screen to edit.
- Upon choosing edit, you will see an **Edit Supplier Credit Note**page, where you can make changes to your supplier credit note headers, line items, attachments, or settings.

**Q2. Will a supplier credit note get regenerated again after editing?**

- Yes, the supplier credit note will be automatically updated upon amendment.
- **Tip**: Having an issue where changes are not reflected on the Supplier Credit note? Do allow 2 minutes for the system to refresh before attempting to download them again.**Q3. Can I edit a supplier credit even if its in non-base currency?**

- Yes, a supplier credit note's currency setting will not affect this.

**Q4. Are there any restrictions on how many times I can edit a supplier credit?**

- No, there are no restrictions. You can edit a supplier credit note as many times as you need to.

**Q5. What fields can I modify while editing a supplier credit?**

- There are no restrictions on the fields that you can modify while editing a supplier credit note.

**Q6. What happens to a supplier credit refund if the supplier credit amount is updated?**

- If you edit any fields that impact the supplier credit note amount, any associated refunds will be removed.
- Jaz will show you a warning if you attempt to update the supplier credit amount.
- However, if any associated refunds have been reconciled with statement lines, you will not be able to update the supplier credit amount. You will see an error message.

**Q7. Can I edit the exchange rate being used on a supplier credit note?**

- You can edit the exchange rate being used on an supplier credit note even after creation.
  - You can edit the exchange rate via the supplier credit note settings.
- However, do note the following:
  - You cannot edit the exchange rate if the associated refunds on the supplier credit note have already been reconciled.
  - Editing the exchange rate will remove all associated refunds.
  - Editing the exchange rate is subject to account lock date restrictions, as described in [Lock Dates (COA)](https://help.jaz.ai/en/articles/9577112-lock-dates-coa)

**Q8. What formatting options are available in supplier credits?**

The Pretty Case feature allows you to easily format text fields within supplier credit transaction line items, ensuring consistency in text presentation according to your company's preferences.

Pretty Case offers four formatting styles:
- **Title Case**: Capitalizes the first letter of each word (e.g., "Office Supplies").
- **Sentence Case**: Capitalizes only the first letter of the first word (e.g., "Office supplies").
- **Lower Case**: Converts all text to lowercase (e.g., "office supplies").
- **Upper Case**: Converts all text to uppercase (e.g., "OFFICE SUPPLIES").

These options make it easy to standardize text formats across supplier credit item descriptions, unit fields, and other text-based fields.

**Q9. How to adjust GST/VAT in Supplier Credit Notes?**

- Click the GST/VAT amount in the totals section when editing a supplier credit note transaction.

**Q10. Which transactions allow GST/VAT adjustments?**

- You can utilize GST/VAT adjustments for the following transactions:
  - [Invoices](https://help.jaz.ai/en/articles/9094439-edit-invoice)
  - [Customer Credit Notes](https://help.jaz.ai/en/articles/9101355-edit-customer-credit)
  - [Bills](https://help.jaz.ai/en/articles/9104253-edit-bill)
  - Supplier Credit Notes

**Q11. What impact will GST/VAT adjustments have?**

- Adjustments affect the GST/VAT total and transaction total. All amounts in reports are impacted but not recorded in the ledger.

**Q12. Where can I see reports showing GST/VAT adjustments?**

- GST/VAT adjustments are shown in the "GST/VAT Adj. (Source)" and "GST/VAT Adj. (Notes)" columns in:
  - GST/VAT Ledger and related reports
  - Sales/Purchases Summary reports
    - Note: Adjustments are displayed in the item details column. No new adjustment columns are added to the Sales/Purchase Summary report.

**Q13. Can I bulk update or edit Supplier Credits?**

- Yes, use Quick Fix to bulk update or edit supplier credits. It lets you edit multiple transactions or line items at once from the list view.
- Select records in the list view, then choose Quick Fix from the bulk actions menu. You can update:
  - Supplier
  - Credited Date
  - Currency
  - Custom Fields
  - Tracking Tags
​
- Only unlocked fields are editable. Changes are highlighted before saving, and updates are processed only if changes were made. You'll get a success or error message after.

**Q14. Can I bulk update or edit line items in Supplier Credits?**

- Yes, use Line Item Quick Fix to update multiple line items at once from the Active or Draft tabs in the Line Items list view.
- Select multiple items, then click Quick Fix from the bulk actions menu. You can update:
  - Description (with classifier support)
  - Quantity, Unit, Price, Discount
  - Account
  - VAT/GST Profile
- Smart locking ensures only unlocked fields are editable, reducing errors.

---

### Saved Search (Supplier Credit)
Source: https://help.jaz.ai/en/articles/11324642-saved-search-supplier-credit

**Q1: What is Saved Search in Supplier Credit?**

- Saved Search lets you store commonly used filters for faster access when working with Supplier Credit

**Q2: What filters can I use in a Saved Search (Supplier Credit)?**

- Saved Searches support:
  - Numeric ranges (e.g., amount ranges)
  - Date ranges (e.g., specific time periods)
  - Text filters (e.g., reference numbers, contact names)

**Q3: Can I edit or delete a Saved Search (Supplier Credit)?**

- Yes. You can edit or delete Saved Searches using the same modal where you created them.

**Q4: Can I apply multiple Saved Searches at once?**

- No. Only one Saved Search can be active at a time. It behaves like a regular filter and cannot be edited inline or combined with other filters.

**Q5: Are there any rules when creating a Saved Search (Supplier Credit)?**

- Yes. Filters must pass strict validations—no duplicate rules or invalid combinations are allowed during setup.

---

### View Supplier Credit
Source: https://help.jaz.ai/en/articles/9115434-view-supplier-credit

**Q1. Where can I view a created supplier credit note?**

- A new customer credit note will show up in **Active tab.**
- Click on a note to see its details.

**Q2. Can I search for supplier credit notes by supplier name or customer credit number?**

- Yes. Under **Supplier Credits**, you can enter the supplier name or supplier credit number in the**Search Bar**.
- Jaz will automatically filter out the relevant supplier credit notes for you.

**Q3. Can I print or download a copy of the supplier credit note for my records?**

Supplier credit notes created in Jaz are not available for download.

**Q4. Do supplier credit notes in Jaz include audit information?**

- Supplier credit notes in Jaz include the **Created By**fields to show who was the creator of the supplier credit note, and the **Last Updated By**field to show the last editor of the supplier credit note.
- Click on **Show More**under **Supplier Credit Note Details** to reveal this field.**Q5. Where can I find the exchange rate for a supplier credit note with non-base currency?**

- To find the exchange rate for a supplier credit note with non-base currency:
  - Hover over the currency ISO to show the exchange rate used for the supplier credit note, relative to the base currency.
  - The exchange rate information will show the amount in the base currency, alongside the exchange rate information used

**Q6. What happens if the exchange rate changes after I have viewed the supplier credit note?**

- Any changes in exchange rates on an organizational level will not affect existing supplier credit notes that have already been created. Hence, existing supplier credit notes will not be affected.
- However, if you change the exchange rate of a currency on an existing supplier credit note by editing the supplier credit note directly, this will be reflected in the supplier credit note the next time you view it.

**Q7. What is the lifecycle of a supplier credit note? What different status or stages does it go through?**

| **Status** |**When does this status occur?** |
| --- | --- |
| Draft | When a supplier credit note is saved as a draft. |
| Credit available | When a supplier credit note still has credit available, either the full or partial credit amount.
This might be from recording refunds, or from applying credits to invoices. |
| Fully Applied | When a supplier credit note has no balance credit available |

---

### Void Supplier Credit
Source: https://help.jaz.ai/en/articles/9115436-void-supplier-credit

**Q1. Can I void a supplier credit note?**

- Yes, you can void a supplier credit note.
- Find the void option in the note details. Once done, you can find the voided records under the voided tab.

**Q2. Can I undo voiding a supplier credit note?**

- No, voiding a supplier credit note is permanent.

**Q3. Will voiding a supplier credit note remove it from the application permanently?**

- No, voiding a supplier credit note will not do this.
- However, [deleting a supplier credit note](https://help.jaz.ai/en/articles/9115448-delete-refund-supplier-credit) will remove it from the application permanently.

**Q4. What happens to any refunds associated with a supplier credit note after voiding?**

- Voiding a supplier credit note will delete all associated refunds records.

**Q5. Will voiding a supplier credit note affect my financial reports?**

- Yes, voiding a supplier credit note will affect your financial reports.
- You may see a change in how different parts of your financial reports are calculated, due to the removal of associated refund records.
- You may see changes in the debit amount for your **Accounts Payable**account, and the credit amount for expense account used in the supplier credit.
- You may also see a removal of the transaction records from the **Ledger**.**Q6. Can I add a note/explanation while voiding a supplier credit note?**

- Yes, you can. When voiding a supplier credit note, a pop-up box will show up.
- Other than confirming you want to void the supplier credit note, you can also add in **internal notes at**this stage for your team to view.\
- The void notes will show up on the voided supplier credit note as shown below:

**Q7. Can I void multiple transactions?**

- Yes. Voiding multiple transactions applies for the following transaction status
  - Active transactions
  - Balance Due (only for Invoices and Bills)
- Select multiple transactions you want to void by ticking the checkboxes.
- Adding a void note applies to all selected transactions.

---
