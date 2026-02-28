### Customer Credit Downloads
Source: https://help.jaz.ai/en/articles/9101362-customer-credit-downloads

**Q1. Can I download an active customer credit note PDF?**

- Yes, you can download an active customer credit note PDF from the customer credit note details.
- See below for an example of the downloaded credit note.

**Q2. Can I download the refund advice for a refund?**

- Yes, you can download a refund advice from the customer refund details.
- See below for an example of the downloaded credit note.

**Q3. Can I customize the contents of any PDFs?**

- Yes, there are a couple of ways that this can be done:
  1. Via custom fields - See [Custom Fields](https://help.jaz.ai/en/articles/9066650-custom-fields) for more information.
  1. Adding a logo to your customer credit note - You can do this by setting a unique logo in[PDF Templates](https://help.jaz.ai/en/articles/10729638-pdf-templates#h_fccf644b35). Head over to **Settings > Templates > PDFs > Choose a Template > Header > Upload Logo**.**Q4. Will the downloaded PDF display amounts in the base currency or the currency of the customer credit note?**

- The downloaded PDF will display amounts based on the currency of the customer credit note.

---

### Draft Customer Credits
Source: https://help.jaz.ai/en/articles/9101352-draft-customer-credits

**Q1. Can I save a customer credit note as a draft?**

- Yes, a customer credit note can be saved as a draft even if all the mandatory fields are not filled.

**Q2. How can I convert a draft customer credit note to an active one?**

- Any draft bill can be converted to active only after all the mandatory fields are filled.

**Q3. Can I save a customer credit refund record as a draft?**

- Similar to a customer credit note, a refund can also be saved as a draft against a credit note.

**Q4. How can I convert a draft refund record to an active one?**

- For customer credits, any draft refunds are converted only if the credit note is also converted to active.
- Hence, to record the refund, the customer credit note must be converted to active status.

**Q5. Can I delete a draft customer credit?**

- Yes, you can delete a draft customer credit note. If the note also had a linked draft refund record, it will also be deleted.

**Q6. Do draft customer credits affect my financial reports?**

- No, they do not. Financial reports are only affected once the customer credit notes are active, and a refund has been recorded for it or it has been applied to an invoice.

**Q7. Can I create non-base draft customer credit notes?**

- Yes, you can save a customer credit note as a draft even if it is in non-base currency.

**Q8. Do draft customer credit refunds affect my financial reports?**

- No, draft customer credit refunds do not affect financial reports.

**Q9. Can I create a non-base draft customer credit refund?**

- Yes, you can save a customer credit refund even if it's in non-base currency.

​

---

### Jaz Magic (Customer Credit)
Source: https://help.jaz.ai/en/articles/9101374-jaz-magic-customer-credit

**Q1. Is Jaz Magic currently available for customer credits?**

- Jaz Magic is currently unavailable for customer credit notes.

---

### Transaction Settings (Customer Credit)
Source: https://help.jaz.ai/en/articles/9103121-transaction-settings-customer-credit

**Q1. How does setting a default for customer credits simplify the creation process?**

- By having customer credit note default settings, the different customer credit note settings fields will be filled up automatically based on your preferences every time you create a customer credit note.
- This means that you can save the hassle of having to repeatedly fill in your customer credit note settings as you are creating customer credit notes.

**Q2. Can I customize the default settings for customer credit notes?**

- Yes, you can customize the default settings for a customer credit note. The default settings can be found in each record.

**Q3. Will the default settings apply to all the customer credit notes automatically? Even the ones already created?**

- Default settings will apply to all new customer credit notes during creation automatically. Customer credit notes that have already been created will not be affected.

**Q4. Can I override the default settings for an individual customer credit if needed?**

- Yes, you can adjust the individual customer credit note settings even if customer credit note default settings are applied.

**Q5. Can I change the default settings for customer credits at any time?**

- Yes, simply set up the default customer credit settings again as normal.

**Q6. Can I bulk edit nano classifiers in my Customer Credit?**

- Yes, you can bulk apply or remove classifiers in Customer Credit Settings.

---

### User Roles (Customer Credit)
Source: https://help.jaz.ai/en/articles/9101377-user-roles-customer-credit

**Q1. How do different permission levels in Jaz affect what I can do with customer credits?**

- Admins can:
  - View all customer credit notes
  - Create and manage active customer credit notes
- Preparers can:
  - View all customer credit notes
- Members can:
  - View only the customer credit notes that they have created

---

### Create Customer Credit
Source: https://help.jaz.ai/en/articles/9062379-create-customer-credit

**Q1: Can I import customer credits?**

- Yes, You can now import customer credit notes using the Import Credits option.
  - Importing customer credit notes supports
    - Multiple line items per credit note (grouped by reference)
    - Currency and FX rate type
    - Due date
    - Tax-inclusive type
    - Internal notes

**Q2: Can I import customer credit note refunds?**

- No, refunds are not supported in the customer credit note import. Only credit notes with line items can be imported at this time.

**Q3. How can I add more fields to the customer credit template?**

- While creating a new customer credit note, under **Customer Credit Settings>Advanced**, enter**Custom fields.**
  - If you do not see this option available, it means that you currently do not have any custom fields set up. See [Custom Fields](https://help.jaz.ai/en/articles/9066650-custom-fields) for more information on setting custom fields.

**Q4. How can I edit a customer address for a customer credit?**

- Find the pencil icon above the customer name to edit the address.

**Q5. Why is the customer address not updated after creating the customer credit?**

- The customer address will only be updated for the customer credit note.
- To permanently update the customer address, locate your customer under contacts and update the customer address.
- See [Contacts](https://help.jaz.ai/en/articles/8938009-contacts) for more information.

**Q6. Where can I download a customer credit note?**

- You can download a customer credit note from the notes detail page.
- Refer to  [Customer Credit Downloads](https://help.jaz.ai/en/articles/9101362-customer-credit-downloads) for more information.

**Q7. Can I duplicate a customer credit?**

- Yes, you can duplicate a customer credit.
- Upon duplication, a **New customer credit**creation screen will show, with all fields automatically filled in following the selected credit note.

**Q8. Can I schedule a customer credit?**

- No, Jaz only supports scheduling for invoices, bills, and journal entries.

**Q9. What are the fields being duplicated when you duplicate a customer credit?**

- All the previous information on the customer credit will be duplicated, except for the customer credit note reference.

**Q10. How do I add discounts?**

- To add a discount, ensure that **Discounts**are enabled under **Item Attributes**in the **Customer Credit Settings.**
- You will then be able to add a discount at a line item level.
- When discounts are applied, the Subtotal amount becomes clickable to view the breakdown of the applied discounts.

**Q11. How do I add taxes?**

- To add taxes for a customer credit note, ensure that you have selected a **GST/VAT setting** under**default GST/VAT**, either**GST/VAT Included in Price** or **GST/VAT Excluded in Price**.
- Afterwards, you will be able to select a tax profile at a line item level.
- These taxes will also show up in the customer credit total summary.

**Q12. How do I choose a currency for customer credit?**

- Click on the **currency label** within the customer credit note. You will be brought to the currency settings.
- Select the currency that you would like for the customer credit note to have.

**Q13. Can the currency be automatically determined, or do I need to select it manually?**

- Yes. There are a few ways where the currency can be automatically determined:
  1. Via the contact's default currency setting.
    1. If you have selected a contact for the customer credit note, the currency will be automatically set to the contact's default currency.
  1. Your own customer credit default settings
    1. Under **Default Settings > Accounting,**you can also set a default customer credit note currency there.
  1. Your organization's base currency
    1. If both are not available, the organization's base currency will be used.
- If you would like to choose a currency outside of these options, you can select it from the list of currencies already added to your organization. If not, you can also **add a currency**.**Q14. What is the difference between the customer credit setting, customer credit default setting, and customer-selected currency options?**

- **Customer credit note setting**: Settings that will only be applied to a single customer credit note (the one being created or looked at)
- **Customer credit default setting**: Settings that will automatically be applied by default at the start of the customer credit note creation process for all customer credit notes
- **Customer-selected currency options**: The currency that you have associated the customer contact with, typically the currency that you transact in with this contact.**Q15. How does selecting a currency affect my business transactions?**

- Selecting a currency that is different from your base currency may lead to foreign-exchange gains & losses due to differences in exchange rates when the customer credit note was created and when refunds or application of customer credit notes are done.

**Q16. Can I use different currencies for different customer credits?**

- Yes, different currencies can be set at a customer credit level.

**Q17. Can I change the currency for a customer credit after it has been created?**

- Yes, you can change the currency for a customer credit note after it has been created by editing the currency in **Customer Credit Settings**.**Q18. Are there any additional fees or considerations associated with using different currencies in my customer credits?**

- No, Jaz does not charge a fee for making use of different currencies in your customer credit notes.
- However, do be mindful of any potential foreign exchange gains and losses due to differences in exchange rates between the creation of the customer credit note and when refunds or application of customer credit notes are done.

**Q19. How are currency conversions & exchange rates handled for a customer credit?**

- When choosing a currency under **Customer Credit Settings,**
  - If a custom exchange rate has been set for the currency & time range that the customer credit note was created in, Jaz will make use of this exchange rate.
  - You can also set an exchange rate on a transaction level by clicking on the **pencil icon** to edit the exchange rates.
  - If not, Jaz will use a third-party service to determine a mid-market exchange rate, and use that instead.

**Q20. Is there a way to apply different tax rates to different line items in the same invoice?**

- Yes, each line item can have a different tax profile.
- To apply the same tax profile to all line items in a customer credit note, use the [Customer credit](https://help.jaz.ai/en/articles/8937984-customer-credit-settings) settings.
- To apply the same tax profile across all invoices, set the tax profile at the [transaction](https://help.jaz.ai/en/articles/9103121-transaction-settings-customer-credit) level.

**Q21. Can I preview my Invoice PDF before I send it out?**

- Yes, just tap on the preview icon located on the side bar.

---

### Customer Credit Attachments
Source: https://help.jaz.ai/en/articles/9101350-customer-credit-attachments

**Q1. Can I upload attachments to a customer credit note?**

- You can upload attachments during customer credit note creation
- Alternatively, you can add attachments to an existing customer credit note.

**Q2. Can I preview the uploaded attachment?**

- Yes, you can see a preview of the attachment by clicking on the attachment after uploading.

---

### Customer Credit Line Items
Source: https://help.jaz.ai/en/articles/9101349-customer-credit-line-items

**Q1. How can I save a new item when creating a customer credit note?**

- You can’t save a new item when creating a customer credit note. You need to go to the **Items List** to create a new item. Afterwards, the item will appear when creating a customer credit note. See [Items List](https://help.jaz.ai/en/articles/9094095-items-list) for more information.
- However, you can create a new custom item. Refer to [Items List](https://help.jaz.ai/en/articles/9094095-items-list) for more information.

**Q2. How can I update the GST/VAT profile for a line item?**

- Ensure that a GST/VAT setting has been selected (GST/VAT included in price or GST/VAT excluded in price) via the **Customer Credit Settings.**
- Afterwards, you will be able to select a GST/VAT profile for the line item.
- To update the GST/VAT profile for a line item, choose from one of your organization's existing GST/VAT profiles, or **Add New**to add a new GST/VAT profile.

**Q3. What is a custom item, when would I need to create one for a customer credit note?**

- A custom item is an item that you create at the point of customer credit note creation. The item is not created via the Items List, and does not appear in the drop-down list of items that you can select from.
- You can create one if you think that this item will only be used in the current transaction. Otherwise, we would recommend creating an item in the Items List. See [Items List](https://help.jaz.ai/en/articles/9094095-items-list) for more information on using Items.

**Q4. Is there a restriction on the type of account I can select for an item in a customer credit note?**

- While there are no strict restrictions on the type of account you can select for an item in a customer credit note, Jaz will **warn you** if you have selected an account that is not a**Revenue Account**.**Q5. Why do I not see all the VAT/Tax profiles created in a customer credit note?**

- Some of your previously created VAT/Tax profiles may only be applicable to other business transactions such as bills or supplier credits. As such, you may not be able to select them for your customer credit note.

---

### Customer Credit Settings
Source: https://help.jaz.ai/en/articles/8937984-customer-credit-settings

**Q1. Where can I adjust the settings for a single customer credit note?**

- Click on the **gear icon**on the right side of the screen while creating a customer credit note. A menu should show up.

**Q2. How can I remove GST/VAT, item discount, or item quantity & unit from appearing in the customer credit note?**

- To remove GST/VAT, you can adjust the default GST/VAT settings to **No GST/VAT.**
- To remove item quantity & unit, you can disable both options under **Item Attributes.**

---

### Notes in Customer Credits
Source: https://help.jaz.ai/en/articles/9101351-notes-in-customer-credits

**Q1. How can I add notes for customers on a customer credit note?**

- Click on **Customer Credit > + New Credit**
- Under **Credit Notes** on the bottom of the customer credit note, add a note for your customer.**Q2. How can I add internal notes to a customer credit note?**

- Find the internal notes section in the customer credit settings tab under 'Advanced'.

---

### Delete Customer Credit
Source: https://help.jaz.ai/en/articles/9101360-delete-customer-credit

**Q1. Can I delete a customer credit note?**

- Yes, you can delete a customer credit note.
- **A customer credit note must first be voided before it can be deleted. See [Void Customer credit note](https://help.jaz.ai/en/articles/9101356-void-customer-credit) for more details.**
- **Note**: If a customer credit note is marked as deleted, you will not be able to undo the action or retrieve the deleted record.**Q2. Can I undo a deleted customer credit note?**

- You will not be able to undo a deleted customer credit note.

**Q3. Can I retrieve a deleted customer credit note?**

- You will not be able to retrieve a deleted customer credit note.

**Q4. What happens to any refunds associated with a customer credit note after deletion?**

- When you void a customer credit note before deleting it, any associated refund records will be removed. As such, there will be no further effects when deleting the customer credit note.

**Q5. Will deleting a customer credit note affect my financial reports?**

- Deleting a customer credit note will not have further effects on your financial reports, as voiding the customer credit note beforehand would have already done this.

**Q6. Can I add a note/explanation while deleting a customer credit note?**

- Currently, you may not add additional internal notes while deleting a customer credit note.

---

### Edit Customer Credit
Source: https://help.jaz.ai/en/articles/9101355-edit-customer-credit

**Q1. Can I edit a customer credit note?**

- Yes, you can edit a customer credit note.
- Choose the **edit**option from the 3-dot menu of the desired customer credit note details screen to edit.
- Upon choosing edit, you will see an **Edit Customer Credit Note**page, where you can make changes to your customer credit note headers, line items, attachments,  or settings.

**Q2. Will a customer credit note get regenerated again after editing?**

- Yes, the customer credit note will be automatically updated upon amendment.
- **Tip**: Have an issue where changes are not reflected on the Customer Credit note? Do allow 2 minutes for the system to refresh before attempting to download them again.**Q3. Can I edit a customer credit even if it's in non-base currency?**

- Yes, a customer credit note's currency setting will not affect this.

**Q4. Are there any restrictions on how many times I can edit a customer credit?**

- No, there are no restrictions. You can edit a customer credit note as many times as you need to.

**Q5. What fields can I modify while editing a customer credit?**

- There are no restrictions on the fields that you can modify while editing a customer credit note.

**Q6. What happens to a customer credit refund if the customer credit amount is updated?**

- If you edit any fields that impact the customer credit note amount, any associated refunds will be removed.
- Jaz will show you a warning if you attempt to update the customer credit amount.
- However, if any associated refunds have been reconciled with statement lines, you will not be able to update the customer credit amount. You will see an error message.

**Q7. Can I edit the exchange rate being used on a customer credit note?**

- You can edit the exchange rate being used on an customer credit note even after creation.
  - You can edit the exchange rate via the customer credit note settings.
- However, do note the following:
  - You cannot edit the exchange rate if the associated refunds on the customer credit note have already been reconciled.
  - Editing the exchange rate will remove all associated refunds.
  - Editing the exchange rate is subject to account lock date restrictions, as described in [Lock Dates (COA)](https://help.jaz.ai/en/articles/9577112-lock-dates-coa)

**Q8. What formatting options are available in customer credit?**

The Pretty Case feature allows you to easily format text fields within customer credit transaction line items, ensuring consistency in text presentation according to your company's preferences.

Pretty Case offers four formatting styles:
- **Title Case**: Capitalizes the first letter of each word (e.g., "Office Supplies").
- **Sentence Case**: Capitalizes only the first letter of the first word (e.g., "Office supplies").
- **Lower Case**: Converts all text to lowercase (e.g., "office supplies").
- **Upper Case**: Converts all text to uppercase (e.g., "OFFICE SUPPLIES").

These options make it easy to standardize text formats across customer credit item descriptions, unit fields, and other text-based fields.

**Q9. How to adjust GST/VAT in Customer Credit Notes?**

- Click the GST/VAT amount in the totals section when editing a customer credit note transaction.

**Q10. Which transactions allow GST/VAT adjustments?**

- You can utilize GST/VAT adjustments for the following transactions:
  - [Invoices](https://help.jaz.ai/en/articles/9094439-edit-invoice)
  - Customer Credit Notes
  - [Bills](https://help.jaz.ai/en/articles/9104253-edit-bill)
  - [Supplier Credit Notes](https://help.jaz.ai/en/articles/9115435-edit-supplier-credit)

**Q11. What impact will GST/VAT adjustments have?**

- Adjustments affect the GST/VAT total and transaction total. All amounts in reports are impacted but not recorded in the ledger.

**Q12. Where can I see reports showing GST/VAT adjustments?**

- GST/VAT adjustments are shown in the "GST/VAT Adj. (Source)" and "GST/VAT Adj. (Notes)" columns in:
  - GST/VAT Ledger and related reports
  - Sales/Purchases Summary reports
    - Note: Adjustments are displayed in the item details column. No new adjustment columns are added to the Sales/Purchase Summary report.

**Q13. Can I bulk update or edit Customer Credits?**

- Yes, use Quick Fix to bulk update or edit customer credits. It lets you edit multiple transactions or line items at once from the list view.
- Select records in the list view, then choose Quick Fix from the bulk actions menu. You can update:
  - Credit From
  - Credit To
  - Credited Date
  - Currency
  - PDF Template
  - Tags
  - Custom Fields
  - Notes
​
- Only unlocked fields are editable. Changes are highlighted before saving, and updates are processed only if changes were made. You'll get a success or error message after.

**Q14. Can I bulk update or edit line items in Customer Credits?**

- Yes, use Line Item Quick Fix to update multiple line items at once from the Active or Draft tabs in the Line Items list view.
- Select multiple items, then click Quick Fix from the bulk actions menu. You can update:
  - Description (with classifier support)
  - Quantity, Unit, Price, Discount
  - Account
  - VAT/GST Profile
- Smart locking ensures only unlocked fields are editable, reducing errors.

---

### Saved Search (Customer Credits)
Source: https://help.jaz.ai/en/articles/11324634-saved-search-customer-credits

**Q1: What is Saved Search in Customer Credit?**

- Saved Search lets you store commonly used filters for faster access when working with Customer Credit

**Q2: What filters can I use in a Saved Search (Customer Credit)?**

- Saved Searches support:
  - Numeric ranges (e.g., amount ranges)
  - Date ranges (e.g., specific time periods)
  - Text filters (e.g., reference numbers, contact names)

**Q3: Can I edit or delete a Saved Search (Customer Credit)?**

- Yes. You can edit or delete Saved Searches using the same modal where you created them.

**Q4: Can I apply multiple Saved Searches at once?**

- No. Only one Saved Search can be active at a time. It behaves like a regular filter and cannot be edited inline or combined with other filters.

**Q5: Are there any rules when creating a Saved Search (Customer Credit)?**

- Yes. Filters must pass strict validations—no duplicate rules or invalid combinations are allowed during setup.

---

### View Customer Credit
Source: https://help.jaz.ai/en/articles/9101354-view-customer-credit

**Q1. Where can I view a created customer credit note?**

- A new customer credit note will show up in **Active tab.**
- Click on a note to see its details.

**Q2. Can I search for customer credit notes by customer name or customer credit number?**

- Yes. Under **Customer Credits**, you can enter the customer name or customer credit number in the**Search Bar**.
- Jaz will automatically filter out the relevant customer credit notes for you.

**Q3. Can I print or download a copy of the customer credit note for my records?**

- Yes, you can download a customer credit note. Refer to [Customer Credit Downloads](https://help.jaz.ai/en/articles/9101362-customer-credit-downloads) for more information.

**Q4. Do customer credit notes in Jaz include audit information?**

- Customer credit notes in Jaz include the **Created By**fields to show who was the creator of the customer credit note, and the **Last Updated By**field to show the last editor of the customer credit note.
- Click on **Show More**under **Customer Credit Note Details** to reveal this field.**Q5. Where can I find the exchange rate for a customer credit note with non-base currency?**

- To find the exchange rate for a customer credit note with non-base currency:
  - Hover over the currency ISO to show the exchange rate used for the customer credit note, relative to the base currency.
  - The exchange rate information will show the amount in the base currency, alongside the exchange rate information used.

**Q6. What happens if the exchange rate changes after I have viewed the customer credit note?**

- Any changes in exchange rates on an organizational level will not affect existing customer credit notes that have already been created. Hence, existing customer credit notes will not be affected.
- However, if you change the exchange rate of a currency on an existing customer credit note by editing the customer credit note directly, this will be reflected in the customer credit note the next time you view it.

**Q7. What is the lifecycle of a customer credit note? What different states or stages does it go through?**

| **Status** |**When does this status occur?** |
| --- | --- |
| Draft | When a customer credit note is saved as a draft. |
| Credit available | When a customer credit note still has credit available, either the full or partial credit amount.
This might be from recording refunds, or from applying credits to invoices. |
| Fully Applied | When a customer credit note has no balance credit available. |

---

### Void Customer Credit
Source: https://help.jaz.ai/en/articles/9101356-void-customer-credit

**Q1. Can I void a customer credit note?**

- Yes, you can void a customer credit note.
- Find the void option in the note details. Once done, you can find the voided records under the voided tab.

**Q2. Can I undo voiding a customer credit note?**

- No, voiding a customer credit note is permanent.

**Q3. Will voiding a customer credit note remove it from the application permanently?**

- No, voiding a customer credit note will not do this.
- However, [deleting a customer credit note](https://help.jaz.ai/en/articles/9101360-delete-customer-credit) will remove it from the application permanently.

**Q4. What happens to any refunds associated with a customer credit note after voiding?**

- Voiding a customer credit note will delete all associated refund records

**Q5. Will voiding a customer credit note affect my financial reports?**

- Yes, voiding a customer credit note will affect your financial reports.
- You may see a change in how different parts of your financial reports are calculated, due to the removal of associated refund records.
- You will see changes in the credit amount for your **Accounts Receivable**account, and the debit amount for the sales account used in the customer credit.
- You will also see a removal of the transaction records from the **Ledger**.**Q6. Can I add a note/explanation while voiding a customer credit note?**

- Yes, you can. When voiding a customer credit note, a pop-up box will show up.
- Other than confirming you want to void the customer credit note, you can also add in **internal notes at**this stage for your team to view.
- The void notes will show up on the voided customer credit note as shown below.

**Q7. Can I void multiple transactions?**

- Yes. Voiding multiple transactions applies for the following transaction status
  - Active transactions
  - Balance Due (only for Invoices and Bills)
- Select multiple transactions you want to void by ticking the checkboxes.
- Adding a void note applies to all selected transactions.

---

### Delete Refund (Customer Credit)
Source: https://help.jaz.ai/en/articles/9103709-delete-refund-customer-credit

**Q1. Can I delete a refund record?**

- Yes, you can delete a customer credit refund record.
- After deleting a refund, the refund details and status on the associated customer credit will be automatically updated.
- **Note**: If a refund is marked as deleted, you will not be able to undo the action or retrieve the deleted refund record.**Q2. How do I undo a deleted customer refund record?**

- You will not be able to undo a deleted refund record.

**Q3. How do I retrieve a deleted customer refund record?**

- You will not be able to retrieve a deleted refund record.

**Q4. Will deleting my customer refunds affect my financial reports?**

- Yes, as deleting refunds will affect your organization's financial position. This change will be reflected in different financial reports available on Jaz.
- Specifically, the refund record will be removed from the account that the refund was originally made from, and no longer show in the **General Ledger**.
- The account's balances will also update accordingly, thus reports that depend on the General Ledger and the account will also see updates.

**Q5. Can I add a note/explanation while deleting a customer refund?**

- Jaz currently does not support adding notes/explanations while deleting a refund.
- You will be prompted to delete the payment right away.

**Q6. What happens to a customer credit note if a refund associated with it is deleted?**

- If a refund record associated with the customer credit note is deleted, the status of the customer credit note will change back to **Credit Available.Q7. Can I delete partial refunds or only full customer refunds?**

- You can delete all types of refunds on a customer credit note.

---

### Edit Refund (Customer Credit)
Source: https://help.jaz.ai/en/articles/9103708-edit-refund-customer-credit

**Q1. Can I edit a refund record?**

- Yes, you can edit a refund record.

**Q2. Will the refund receipt regenerate after editing?**

- Yes, the refund receipt will be automatically updated upon amendment.
- **Tip**: Have issues where changes are not reflected on the refund receipt? Do allow 2 minutes for the system to refresh before attempting to download them again.**Q3. Can I edit a customer credit refund even if it's in non-base currency?**

- Yes, a customer credit refund's currency will not affect this.

**Q4. Are there any restrictions on how many times I can edit a customer credit refund?**

- No, there are no restrictions. You can edit a customer credit refund as many times as you need to.

**Q5. What fields can I modify while editing a customer credit refund?**

- There are no restrictions on the fields that you can modify while editing.

---

### Record Refunds (Customer Credit)
Source: https://help.jaz.ai/en/articles/9101367-record-refunds-customer-credit

**Q1. How do I add a new refund method type for a customer refund?**

- You cannot add a new payment method type for refunds.

**Q2. Can I download a receipt for a refund?**

- Yes, you can download the payment advice. Refer to [Customer Credit Downloads](https://help.jaz.ai/en/articles/9101362-customer-credit-downloads) for more information.

**Q3. How do I record a refund for a customer credit?**

- Refunds can only be recorded after a customer credit note is created. Ensure to fill in all the details to save.

**Q4. Can I record a partial refund for a customer credit?**

- Yes, you can. Under the **Customer Refund Amount**, enter an amount that is less than the maximum customer credit note amount.
- This will result in a partial refund, where only part of the customer credit note is refunded.

**Q5. What happens if I receive a refund payment in a different currency than the refund payment I record?**

- If there is a difference between the recorded amount converted to the organization's base currency and the actual cash spent amount converted to the organization's base currency, realized gain-loss will take place. This is further explained in [When does realized FX gain-loss (RGL) happen, and how is it calculated?](#h_28a754c3c3)

**Q6. Where is the payment rate fetched from if the currencies don't match?**

- If the cash spent currency does not match the recorded refund currency, there is a possibility of a realized gain/loss due to the fluctuations in the exchange rates.
- Jaz fetches a custom rate if available on the date of the payment. If not, the rate is fetched from 3rd party services.
- You can also adjust the payment rate if the one fetched by Jaz is not the rate you want to use for the payment.

**Q7. When does realized FX gain-loss (RGL) happen, and how is it calculated?**

- RGL happens when the following conditions are fulfilled:
1. There is a difference between the customer refund amount converted to the organization's base currency, and the cash spent converted to the organization's base currency.
1. The following customer refund/cash spent currency combinations take place:

| **Customer refund currency** |**Cash spent currency (Actual cash paid out to customer)** | **Is there RGL?** |
| --- | --- | --- |
| Organization's base currency (e.g. SGD) | Non-base currency (e.g. USD) | Yes |
| Non-base currency (e.g. USD) | Organization's base currency (e.g. SGD) | Yes |
| Non-base currency (e.g. USD) | Non-base currency (e.g. USD) | Yes |
| Non-base currency (e.g. USD) | Non-base currency (e.g. EUR) | Yes |
| Organization's base currency (e.g. SGD) | Organization's base currency (e.g. SGD) | No |

- RGL is calculated this way for customer refunds:
  - **Realized FX (Gain)/Loss = (Cash spent / Payment rate) - (Customer refund amount / Transaction rate)**
  - Where:
    - Cash spent: The amount spent (paid out) for the recorded customer refund
      - The customer refund amount will be equal to the cash spent amount, if the customer credit note and refund account are in the same currency.
    - Payment rate: The exchange rate for the refund payment (cash spent) (1.00 if the refund payment is in the organization's base currency)
    - Customer refund amount: The amount recorded as refunded for a customer credit note
      - This amount amount may be the entire customer credit note's amount, or a part of it (partial refund).
    - Transaction rate: The exchange rate on the customer credit note (1.00 if the customer credit note is in the base currency)

- FX gains are recorded as **negative expenses**, while losses are recorded as**positive expenses** to the **FX Realized (Gains)/Loss**account.
​
- In other words,
  - **FX gains** are recorded if the customer refund amount in base currency is**greater than** the cash spent in base currency at the exchange rate on payment date.
  - **FX losses**are recorded if the customer refund amount in base currency is **less than** the cash spent in base currency at the exchange rate on payment date.

- Example 1 - The customer refund is recorded in EUR, cash spent in USD and the organization's base currency is in SGD:
  - Cash spent: 65.00 USD
  - Payment rate: 1.00 SGD = 0.74338000 USD
  - Customer refund amount: 55.00 EUR
  - Transaction Rate: 1.00 SGD = 0.68413000 EUR
  - Hence, in this case:
    - **Realized Loss**- **7.04 SGD= (65.00 / 0.74338000) - (55.00 / 0.68413000)**

- Example 2 - The customer refund is recorded in USD, cash spent in SGD and the organization's base currency is in SGD:
  - Cash spent: 70 SGD
  - Payment rate: 1.00 SGD = 1.00 SGD (Since SGD is the base currency)
  - Customer refund amount: 55.00 USD
  - Transaction Rate: 1.00 SGD = 0.74338000 USD
  - Hence, in this case:
    - **Realized Gain - (3.99 SGD) =  (70.00 / 1.00) - (55.00 / 0.74338000)Q8. How will deleting a tax profile impact my refund records?**

- Deleting a tax profile will not have an impact on any refunds that have already been made and recorded.
- However, you will not be able to select the deleted tax profile moving forward when creating new customer credit notes, which may have effects on pre and post-tax calculations.

**Q9. How will making an account inactive impact my refund?**

- Making an account inactive will not have an impact on any refunds that have already been made and recorded.
- However, you will not be able to select the inactive account as a refund account (in the case of cash and bank accounts) moving forward, until the account is active again.

---

### Transaction Fees (Customer Credit Refunds)
Source: https://help.jaz.ai/en/articles/9306137-transaction-fees-customer-credit-refunds

**Q1. Can I record transaction fees for customer credit refunds on Jaz?**

- Yes, you can. When recording a refund for a customer credit note, you will find an option to add transaction fees.
- You can record transaction fees in absolute amounts or as a percentage of the cash received.

**Q2. What can I use the transaction fee option on customer credit refunds for?**

- The transaction fee option might be useful in some scenarios such as:
  - Your payment provider charges you a fee when you receive a refund from your customers.

**Q3. What happens when a transaction fee is recorded?**

- When you record a transaction fee for a customer credit refund, the transaction fee charged is added to the **Cash Received** amount.
- The **Net Cash Received**reflects the actual refunded amount, including fees**.**
- On the customer credit note details, the refund amount shown in the customer credit note's total summary will reflect the **Gross Cash Received**or the cash received after fees.

**Q4. How does recording GST/VAT work for transaction fees?**

- You can include GST/VAT on fees easily by selecting a profile.
- The summary will reflect a breakdown of the fees charged, showing the actual **fees charged**and the **GST/VAT on fees**.**Q5. How are transaction fees reflected on the general ledger?**

- On the general ledger, you should see a record reflecting the transaction fees charged under the expense account (e.g. **Transaction Fees & Charges**) that you have selected when recording a transaction fee.
- If you have indicated **GST/VAT included** in the transaction fees, you should see an additional record for the included GST/VAT under the**Input GST Receivable **account.

---

### View Refund (Customer Credit)
Source: https://help.jaz.ai/en/articles/9103707-view-refund-customer-credit

**Q1. How can I view past refund records for a customer credit note?**

- All the refunds made for a customer credit note can be found in the customer credit note details.

**Q2. How do I know if there is an aggregate RGL displayed on the customer credit note?**

- Aggregate RGL may apply if multiple partial refunds are done on the same customer credit note.

**Q3. Will I be able to see a list of all the refunds or just 1 complete refund on the customer credit?**

- You will be able to see a list of all refunds made with the customer credit.

**Q4. Why is the refund receipt in the same currency as the customer credit?**

- Refund receipts will be recorded and tracked based on the customer credit note.

---
