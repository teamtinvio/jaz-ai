### Apply Supplier Credit
Source: https://help.jaz.ai/en/articles/9104226-apply-supplier-credit

**Q1. Can I apply a draft supplier credit note to a bill?**

- No, supplier credit notes must be active before they can be applied.

**Q2. Can I apply a supplier credit note of a different currency than the bill?**

- If you would like to apply a supplier credit note to a bill, the supplier credit note must be in the same currency that the bill was created in.
- For example, a bill that was created in USD can only make use of supplier credits that were also credited in USD.

**Q3. Can I partially apply a supplier credit note to a bill?**

- Yes, you do not have to use the full amount in the supplier credit note.
- You can adjust this via the **Amount to Apply**field. Enter an amount smaller than the supplier credit note amount to only apply the credit note partially.

**Q4. Can I partially pay a bill using a supplier credit only?**

- Yes, supplier credits do not have to cover the entire bill amount. You can apply as much of a supplier credit note as you would like to a bill.
- The rest of the bill can be paid with other payment methods.

**Q5. Can I remove an applied supplier credit note from a bill?**

- Yes, you can remove an applied supplier credit note on a bill by updating the applied amount to 0.
  - Change the **Amount to Apply**amount to 0 on the **Edit Applied Credit**modal. This will remove all applied credit from the bill.

**Q6. Does applying or removing a supplier credit note have an impact on my financial reports?**

- There will be no further impact on your financial reports.
- This is because the credits would have been accounted for during creation, appearing as a debit to Accounts Payable, and a credit to transaction account used on the bill.
- The offset value date aligns with the later of the transaction date or the credit note date, ensuring accurate reporting across time zones. For example:
  - Transaction Date: 1 Jan 2025
  - Credit Note Date: 5 Jan 2025
  - Offset Value Date: 5 Jan 2025

---

### Bill Approval Records
Source: https://help.jaz.ai/en/articles/9115415-bill-approval-records

**Q1. What is a bill approval record?**

- A bill approval record shows the contents of a bill that has been approved.
- It lists out the items that have been approved for purchase, the quantities, prices, and amounts charged for it.
- At the bottom of the bill approval record, you can also find an audit record for the bill approval - indicating who submitted the bill for approval, and who approved the bill.
- Refer: [Can I download an active bill approval record PDF?](https://help.jaz.ai/en/articles/9104237-bill-downloads#h_1b9c44dc7a)

**Q2. How can I download a bill approval record?**

- After a submitted bill is approved, download
- For more information on submitting bills for approval and approving bills, see [Approvals](https://help.jaz.ai/en/articles/8938045-approvals)

---

### Bill Downloads
Source: https://help.jaz.ai/en/articles/9104237-bill-downloads

**Q1. Can I download an active bill PDF?**

- Yes, you can download the active bill PDF from the bill details.
- See below for an example of the downloaded file.

**Q2. Can I download a draft bill estimate PDF?**

- Yes, you can download the estimate PDF from the draft bill details.
- See below for an example of the downloaded file.

**Q3. Can I download an active bill approval record PDF?**

- Yes, you can download an approval record from the active bill details.
- See below for an example of the downloaded file

**Q4. Can I download a bill payment PDF?**

- Yes, you can download payment advice.

**Q5. Can I customize the contents of any PDFs?**

- Yes, there are a couple of ways that this can be done:
  1. Via custom fields - See[Custom Fields](https://help.jaz.ai/en/articles/9066650-custom-fields) for more information.
  1. Adding a logo to your bill - You can do this by setting a unique logo in[PDF Templates](https://help.jaz.ai/en/articles/10729638-pdf-templates#h_fccf644b35). Head over to **Settings > Templates > PDFs > Choose a Template > Header > Upload Logo.Q6. Will the downloaded PDF display amounts in the base currency or the currency of the bill?**

- The downloaded PDF will display amounts in bill currency.

---

### Bill Receipts
Source: https://help.jaz.ai/en/articles/9104231-bill-receipts

**Q1. What is a bill receipt?**

- Bill receipts allow you to create a bill and a payment concurrently, saving time**.**
- Create a bill receipt from the bills sub-tab or while reconciling a statement line. For more information on using invoice receipts during bank reconciliations, please see [Bank Reconciliations](https://help.jaz.ai/en/articles/9941720-reconciliations-overview#h_57aef6a790)

**Q2. How is a bill receipt different from a regular bill?**

- A bill receipt is a short-form template to record a fully paid bill, meaning that payments have already been made for the bill. You will be asked to enter a payment alongside the bill.
- This is different from a regular bill, where at the point of creation, there may not have been any payments made for the bill.

**Q3. When and why would I use a bill receipt instead of a full bill?**

- If you just need a quick and easy record and reference to a bill that has already been settled, perhaps say offline, bill receipts are a quick way to bring this information into Jaz.

**Q4. Can I track payments and view the status of a bill receipt?**

- Due to the nature of bill receipts, the bill that is created from a bill receipt would be marked with a **Fully Paid**status.
- You can view the created bill under **Bills > Active.**
- Open up the bill created from the bill receipt, and you will also be able to see any payments associated with the created bill.

**Q5. Will using bill receipts affect my accounting on the platform?**

- No, it will not affect your accounting on Jaz. Bills and payments created from bill receipts are treated as normal bill and payment records and will have entries created in ledgers and other reports.

---

### Draft Bills & Payments
Source: https://help.jaz.ai/en/articles/9104224-draft-bills-payments

**Q1. Can I save a bill as a draft?**

- Yes, a bill can be saved as a draft even if all the mandatory fields are not filled.

**Q2. How can I convert a draft bill to an active one?**

- Any draft bill can be converted to active only after all the mandatory fields are filled.

**Q3. Can I save bill payment records as drafts?**

- Similar to bill records, bill payments can also be saved as a draft.

**Q4. How can I convert draft payment records to active ones?**

- For bills, any draft payments are converted only if the bill is also converted to active.
- Hence, to record the payment, the bill must be converted to active status.

**Q5. Can I delete a draft bill?**

- Yes, you can delete a draft bill. If the bill had a draft payment linked, it will also be deleted.

**Q6. Can I delete a draft bill payment?**

- Similar to draft bills, draft bill payments can also be deleted.

**Q7. Do draft bills affect my financial reports?**

- No, it does not. Financial reports are only affected once the bills are active.

**Q8. Do draft bill payments affect my financial reports?**

- No, it does not. Financial reports are only affected once the payments are active.

**Q9. Can I create a non-base currency draft bill?**

- Yes, the currency setting on a bill does not affect the ability to save it as a draft.

**Q10. Can I create a non-base currency draft bill payment?**

- Yes, you can save a bill payment as a draft even if it is in non-base currency.

---

### Import Bills
Source: https://help.jaz.ai/en/articles/9104236-import-bills

**Q1. Can I import multiple bills in Jaz?**

- Yes, you can import bills in two ways:
  - **Line Items:**Rows with the same bill reference are grouped into one bill.
  - **Summary Totals:**Each row is treated as a separate bill.

**Q2. Can I update existing bills using import?**

- No, you can only create new bills using the import function.

**Q3. What file formats are supported for importing bills?**

- Only a .xlsx file using our template will be supported for importing bills.

**Q4. Will importing bills automatically create active bills?**

- Yes. After finishing the import process, all the created bills will be converted to active.

**Q5. Will importing bills affect any existing bills in Jaz?**

- No, existing bills in Jaz will not be affected.

**Q6. How many bills can I bulk import at one time?**

- Each import supports up to 1,000 rows.

**Q7. Can I review the bills before importing?**

- Yes. After importing the bulk bill template, you will be shown a list of imported bill records picked up by Jaz from the template.

**Q8. What should I do if there are errors or duplicates in the imported bills? How can I fix them?**

- Use the Review sheet in the template to view possible errors.
- In Jaz, a review step highlights issues in the file for validation and correction.
- For example, if the error reads "Item/Description is required to import the bill" for Row 6, then check if the Item/Description field has been filled in.
- After fixing all the errors presented by Jaz, save your template and reimport the template to restart the bulk import process.

**Q9. Can I update a bill created from the import flow?**

- Yes, you can update a bill created from the import flow.

---

### Purchase Order
Source: https://help.jaz.ai/en/articles/10219637-purchase-order

**Q1. How can I create a purchase order?**

- Create a new invoice and save it as draft.
- Open the draft invoice and download the PDF purchase order.

**
Q2. Can I email the purchase order directly from Jaz?**

- Emailing purchase order directly from the app is not yet supported.

---

### Scheduled And Recurring Bills
Source: https://help.jaz.ai/en/articles/9104238-scheduled-and-recurring-bills

**Q1. How do I set up a scheduled bill in Jaz?**

- You can setup a scheduled bill from the scheduler tab.
- Fill in the different details needed for the scheduled bill.
  - You can adjust the scheduled date and select the frequency of the schedule.
- Alternatively, you can select an existing bill and make it recurring.

**Q2. Can I choose the start, and end date of the schedule?**

- Yes. Choose the start date by modifying the **Schedule Date**, and choose the end date by modifying the**End Date** when setting up the schedule details.

**Q3. How can I set the frequency of a schedule?**

- You can set the frequency of a schedule by adjusting the Repeat field and End Date field.
- Currently, Jaz allows frequencies of:
  - Does not repeat (This means that the invoice will only be scheduled to be sent out once.)
  - Daily
  - Weekly
  - Monthly
  - Quarterly
  - Yearly
- The End Date can be set manually or automatically using the Autofill End Date function.

**Q4. Will the scheduled bill be automatically created on the scheduled date?**

- Yes, no further action from you is required. Jaz will handle the creation of the bill on the scheduled date.

**Q5. What happens if I need to make changes to the scheduled bills before it’s created?**

- You can easily make changes to a scheduled bill by editing it before it runs.
- You will be able to see the previously created bill details and make any edits that you need.

**Q6. How do payments work with scheduled bills?**

- You can add record  full or partial payments when scheduling bills.
- These payments will be scheduled with the bill, and will also be created on the scheduled date.

**Q7. Can I choose the currency for the scheduled bills & payments?**

- Yes, you can. Click on the **currency label** within the bill schedule. You will be brought to the currency settings.
- Select the currency that you would like the bill to have.

**Q8. Will I receive a notification whenever a bill is created from a schedule?**

- Jaz currently does not support notifications whenever a bill is created from a schedule.

**Q9. Is there a limit to the number of scheduled bills I can create?**

- There are currently no limits to the number of scheduled bills you can create on Jaz.

**Q10. Can I create a schedule with start & end dates in the past?**

- Yes, you can create a schedule with start and end dates in the past.
- After creating the schedule, the schedule will immediately run, and the bill will be immediately created.
- Note: The date on the bill will be the scheduled date, rather than the day the schedule was created.

**Q11. What happens if I update the schedule after it has already run several times?**

- Updating a schedule will have no impact on previously created bills from the schedule.
- Any changes made will only be reflected on new bills that are created from the schedule.

**Q12. What happens if I update a bill created from a schedule?**

- Any changes made will be contained in the bill itself. The original scheduled bill and its details will not be affected, and will not see any changes.

**Q13. How can I stop a schedule?**

- You can stop a schedule by making the schedule inactive.
- Alternatively, you can also delete the schedule from the same menu.

**Q14. How can I restart a schedule?**

- To restart a schedule, just make it active**.**
- Note: If the end date is earlier than the day of restarting the schedule, you will have to update the end date to the current day or later for the schedule to restart.

**Q15. What does it mean to make a schedule inactive?**

- Making a schedule inactive stops any new bills from being created based on the schedule.

**Q16. What happens if I make an inactive schedule active?**

- If you make an inactive schedule active, new bills will start being created again the next time the scheduled date or frequency is reached.

**Q17. Can I duplicate a schedule?**

- Yes, you can duplicate a schedule.

**Q18. Does creating a scheduled bill affect any financial reports?**

- No, creating a scheduled bill will not affect any financial reports.
- Financial reports will only be affected only after an active bill is created based on the schedule.

**Q19. What happens if I void a bill created from a schedule?**

- If the bill was created from a one-off schedule, the schedule will turn inactive as soon as the bill is created. As such, there will be no further impact on the schedule even if you void the bill at this point.
- If the bill was created from a recurring bill schedule, the schedule will run as normal the next time the designated scheduled date or frequency is reached. A new bill will be created from the schedule at that point.

**Q20. Which exchange rate is considered for a future date if there is no organization rate set?**

- If there is no custom organization rate set at the point of the bill being scheduled, Jaz will make use of the bill-level custom exchange rate if you set one during bill schedule creation.
- If not, when the bill is created, Jaz will make use of the 3rd party market rate on the day of bill creation (which is the scheduled date).

**Q21. Can I add dynamic information to scheduled bills so each one is different?**

- Yes, you can add dynamic information to scheduled bills using scheduler strings. These strings generate dynamic data based on the transaction date, with values automatically updated relative to the date.
- You can find the available scheduler strings in the information tooltip while creating a new scheduled bill.
- Hover over the string you want to use and click the copy icon to insert it into the invoice template.

**Q22. In which fields can I use the scheduler strings in a scheduled bill?**

- You can use the scheduler strings in the following fields along with static data -
  - Bill Reference
  - Item/Description
  - Unit
- When the scheduler runs and generates a bill, the strings will be replaced with dynamic values based on the scheduler string type and the generated bill's transaction date.

**Q23. Can I track the transactions created by a scheduler?**

- Yes. You can view the sub-tab **Transaction History** when opening a schedule.

---

### Transaction Settings (Bill)
Source: https://help.jaz.ai/en/articles/9104228-transaction-settings-bill

**Q1. How does setting a default for bills simplify the purchasing process?**

- By having bill default settings, the different bill settings fields will be filled up automatically based on your preferences every time you create a bill.
- This means that you can save the hassle of having to repeatedly fill in your bill details.

**Q2. Can I customize the default settings for bills?**

- Yes, you can customize the default settings for bills. The default settings can be found in each bill.

**Q3. Will the default settings apply to all the bills automatically? Even the ones already created?**

- Default settings will apply to all new bills during creation automatically. Bills that have already been created will not be affected.

**Q4. Can I override the default settings for an individual bill if needed?**

- Yes, you can adjust the individual bill settings even if there have been bill default settings applied.

**Q5. Can I change the default settings for bills at any time?**

- Yes, simply set up the default bill settings again as normal.

**Q6. Can I bulk edit nano classifiers in my bills?**

- Yes, you can bulk apply or remove classifiers in Bill Settings.

---

### User Roles (Bills)
Source: https://help.jaz.ai/en/articles/9104235-user-roles-bills

**Q1. How do different permission levels in Jaz affect what I can do with bills?**

- Admins can:
  - View all bills
  - Create and manage active bills
  - Approve submitted draft bills

- Preparers can:
  - View all bills
  - Create and submit draft bills for approval

- Members can:
  - View only the bills that they have created
  - Create and submit only their draft bills for approval

**Q2. Can a preparer approve submitted bills?**

No, only users with admin permissions for **Account Payable (AP)** can approve submitted bills.

---

### Bill Attachments
Source: https://help.jaz.ai/en/articles/9104250-bill-attachments

**Q1. How can I upload attachments to a bill?**

- You can upload attachments during bill creation.
- Alternatively, you can add attachments to an existing bill.

**Q2. Can I preview the uploaded attachment to a bill?**

- Yes, you can see a preview of the attachment by clicking on the attachment after uploading.

**Q3. How can I preview an XLSX, ZIP, EML or RAR file attached to an invoice?**

- You will not be able to view the XLSX, ZIP, or RAR attachments within the app. Instead, the file will be downloaded for you to access.

---

### Bill Line Items
Source: https://help.jaz.ai/en/articles/9104249-bill-line-items

**Q1. How can I save a new item when creating a bill?**

- You can’t save a new item when creating a bill. You need to go to the** Items List** to create a new item, then the item will appear when creating a bill. See[Items List](https://help.jaz.ai/en/articles/9094095-items-list) for more information.
- However, you can create a new custom item. Refer to [Q3. What is a custom item, when would I need to create one for a bill?](#h_4d7ae4a3b3) for more information.

**Q2. How can I update the GST/VAT profile for a line item?**

- Ensure that a GST/VAT setting has been selected (GST/VAT included in price or GST/VAT excluded in price) via the **Bill Settings.**
- Afterwards, you will be able to select a GST/VAT profile for the line item.
- To update the GST/VAT profile for a line item, choose from one of your organization's existing GST/VAT profiles, or **Add New**to add a new GST/VAT profile.

**Q3. What is a custom item, when would I need to create one for a bill?**

- A custom item is an item that you create at the point of bill creation. The item is not created via the Items List and does not appear in the drop-down list of items that you can select from.
- You can create one if you think that this item will only be used in the current bill. Otherwise, we would recommend creating an item in the Items List. See[Items List](https://help.jaz.ai/en/articles/9094095-items-list) for more information on using Items.

**Q4. Is there a restriction on the type of account I can select for an item in a bill?**

- While there are no strict restrictions on the type of account you can select for an item in a bill, Jaz will **warn you** if you have selected an account that is not an**Expense Account or Asset account**.**Q5. Why do I not see all the GST/VAT profiles created in a bill?**

- Some of your previously created GST/VAT profiles may only apply to other business transactions such as invoices or customer credits. As such, you may not be able to select them for your bill.

**Q6. Why can't I edit/delete a line item from an existing bill?**

- If you can't edit/delete a line item, you most likely have an active fixed asset associated with this line item.
  - When editing, you will not be able to edit the account, total amounts and exchange rates used.
- You will have to delete the fixed asset from the fixed asset register, before being able to delete the line item.
- For more information about fixed assets, refer to: **[Fixed Assets](https://help.jaz.ai/en/articles/9575775-fixed-assets)**
- You will still be able to edit the rest of the information on the line item, such as the description.

**Q7. Can I view item details across multiple transactions?**

- Yes, you can analyze item-level details across multiple transactions in the invoices dashboard.
- Each row is one line item. Clicking each will open the particular invoice transaction.

---

### Bill Notes
Source: https://help.jaz.ai/en/articles/9104251-bill-notes

**Q1. How can I add internal notes to a bill?**

- To learn how to add internal notes to a bill, please refer to [Bill Settings.](https://help.jaz.ai/en/articles/9104248-bill-settings)

---

### Bill Settings
Source: https://help.jaz.ai/en/articles/9104248-bill-settings

**Q1. Where can I adjust the settings for a single bill?**

- Click on the **gear icon**on the right side of the screen while creating a bill. A menu should show up.

**Q2. How to remove GST/VAT, item discount or item quantity & unit from appearing in the bill?**

- To remove GST/VAT, you can adjust the default GST/VAT settings to **No GST/VAT.**
- To remove item quantity & unit, you can disable both options under **Item Attributes.Q3. What are bill internal notes?**

- Bill internal notes are notes added for the internal team, which will not be printed on the PDFs.

---

### Create A Bill
Source: https://help.jaz.ai/en/articles/9104247-create-a-bill

**Q1. How can I add more fields to the bill template?**

- While creating a new bill, under **Bill Settings>Advanced**, enter**Custom fields.**
  - If you do not see this option available, it means that you currently do not have any custom fields set up. See [Custom Fields](https://help.jaz.ai/en/articles/9066650-custom-fields) for more information on setting custom fields.

**Q2. How can I edit the supplier address for a bill?**

- You cannot edit a supplier's address through the bill creation workflow.
- If you need to edit a supplier's address, please update their contact information directly.
- Refer to [Contacts](https://help.jaz.ai/en/articles/8938009-contacts) for more help and information.

**Q3. Where can I download a bill?**

- You can download a voucher from the bill details.
- Refer to [Bill Downloads](https://help.jaz.ai/en/articles/9104237-bill-downloads) for more information.

**Q4. Can I duplicate a bill?**

- Yes, you can duplicate a bill.
- Upon duplication, a **New bill**creation screen will show, with the bill fields automatically filled in following the selected bill.

**Q5. What are the fields being duplicated when I duplicate a bill?**

- All the data on the selected bill will be duplicated.

**Q6. How do I add discounts?**

- To add a discount, ensure that **Discounts**are enabled under **Item Attributes**in the **Bill Settings.**
- You will then be able to add a discount at a line item level.
- When discounts are applied, the Subtotal amount becomes clickable to view the breakdown of the applied discounts.

**Q7. How do I add taxes?**

- To add taxes for a bill, ensure that you have selected a **GST/VAT setting** under default**GST/VAT**, either**GST/VAT Included in Price** or **GST/VAT Excluded in Price**.
- Afterwards, you will be able to select a tax profile at a line item level.
- These taxes will also show up in the bill total summary.

**Q8. How do I choose a currency for a bill?**

- Click on the **currency label** within the invoice. You will be brought to the currency settings.
- Select the currency that you would like the invoice to have.

**Q9. Can the currency be automatically determined, or do I need to select it manually?**

- Yes. There are a few ways where the currency can be automatically determined:
  1. Via the contact's default currency setting.
    1. If you have selected a contact for the bill, the currency will be automatically set to the contact's default currency.
  1. Your bill default settings
    1. Under **Default Settings > Accounting,**you can also set a default bill currency there.
  1. Your organization's base currency
    1. If both are not available, the organization's base currency will be used.
- If you would like to choose a currency outside of these options, you can select it from the list of currencies already added to your organization. If not, you can also **add a currency**.**Q10. What is the difference between the bill setting, bill default setting, and supplier-selected currency options?**

- **Bill setting**: Settings that will only be applied to a single bill (the one being created or looked at)
- **Bill default setting**: Settings that will automatically be applied by default at the start of the bill creation process for all bills
- **Supplied-selected currency options**: The currency that you have associated the supplier contact with, typically the currency that you transact in with this supplier.**Q11. How does selecting a currency affect my business transactions?**

- Selecting a non-base currency may lead to foreign-exchange gains & losses due to differences in exchange rates when the transaction was created and when payment was made.

**Q12. Can I use different currencies for different bills?**

- Yes, currencies can be set at a bill level.

**Q13. Will the selected currency on a bill affect how payments are processed?**

- For payments made in base currency for a bill in a non-base currency, there may be foreign-exchange gains & losses incurred. See [When does realized FX gain-loss (RGL) happen, and how is it calculated?](https://help.jaz.ai/en/articles/9104257-record-bill-payments#h_62f0092b92) for more information.

**Q14. Can I change the currency for a bill after it has been created?**

- Yes, you can change the currency for a bill after it has been created by editing the **bill Settings**.**Q15. Are there any additional fees or considerations associated with using different currencies in my bills?**

- No, Jaz does not charge a fee for making use of different currencies in your bills.
- However, do be mindful of any potential foreign exchange differences, as mentioned: in [Q13. Will the selected currency on a bill affect how payments are processed?](#h_e20d478bbe)

**Q16. How are currency conversions & exchange rates handled for a bill?**

- When choosing a currency under **Bill Settings,**
  - If an organization's custom exchange rate has been set for the currency & time range which the bill was created, Jaz will make use of this exchange rate.
  - You can also set an exchange rate on a transaction level by clicking on the **pencil icon** to edit the exchange rates.
  - If not, Jaz will use a third-party service to determine a mid-market exchange rate, and use that instead.

**Q17. I just created an active bill, but I don't see it in my Accounts Payable. What happened?**

- If a payment has been recorded as paid for the bill on the same date as the bill date (i.e. payment date = bill date), the transaction will be recorded on the ledger as a cash transaction.
- The transaction will be recorded as a **debit**from the **Cash on Hand**account, and a **credit**into the account used on the bill.

**Q18. Is there a way to apply different tax rates to different line items in the same bill?**

- Yes, each line item can have a different tax profile.
- To apply the same tax profile to all line items in a bill, use the [Bill settings.](https://help.jaz.ai/en/articles/9104248-bill-settings)
- To apply the same tax profile across all bills, set the tax profile at the [transaction](https://help.jaz.ai/en/articles/9104228-transaction-settings-bill) level.

---

### Delete Bill
Source: https://help.jaz.ai/en/articles/9104256-delete-bill

**Q1. Can I delete a bill?**

- Yes, you can delete a bill.
- **A bill must first be voided before it can be deleted. See[Void bill](https://help.jaz.ai/en/articles/9104254-void-bill) for more details.**
- **Note**: If a bill is marked as deleted, you will not be able to undo the action or retrieve the deleted bill.**Q2. Can I undo a deletion or retrieve a deleted bill?**

- No, all deletions are final.

**Q3. What happens to any payments/credit notes associated with a bill after deletion?**

- Deleting a bill will not have further effects on payments or credit notes. Any effects on payments or credit notes associated with a bill would have been applied when the bill was voided.

**Q4. Will deleting a bill affect my financial reports?**

- Deleting a bill will not have further effects on your financial reports, as voiding the bill beforehand would have already applied any relevant effects.

**Q5. Can I add a note/explanation while deleting a bill?**

Currently, you may not add additional internal notes while deleting a bill.

---

### Edit Bill
Source: https://help.jaz.ai/en/articles/9104253-edit-bill

**Q1. Can I edit a bill?**

- Choose the **edit**option from the 3-dot menu of the desired bill details screen to edit.
- Upon choosing edit, you will see an **Edit Bill**page, where you can make changes to your bill headers, line items, attachments, or bill settings.

**Q2. Will bills be regenerated again after editing?**

- Yes. Bills will be automatically updated upon amendment.
- **Tip**: Have issues where changes are not reflected on bills? Do allow 2 minutes for the system to refresh before attempting to download them again.**Q3. Can I edit a bill even if it's in non-base currency?**

- Yes, a bill's currency setting will not affect this.

**Q4. Are there any restrictions on how many times I can edit a bill?**

- No, there are no restrictions. You can edit a bill as many times as you need to.

**Q5. What fields can I modify while editing a bill?**

- There are no restrictions on the fields that you can modify while editing a bill.

**Q6. What happens to a bill's payments if the bill amount is updated?**

- If you edit any fields that impact the bill amount, any associated bill payments will be removed.
  - Jaz will show you a warning if you attempt to update the bill amount.
- Note: If the associated payments have already been reconciled with statement lines, you will not be able to update the bill amount. You will see an error message.

**Q7. Can I edit the exchange rate being used on a bill?**

- You can edit the exchange rate being used on a bill even after creation.
  - You can edit the exchange rate via the bill settings.
- However, do note the following:
  - You cannot edit the exchange rate if the associated payments on the bill have already been reconciled.
  - Editing the exchange rate will remove all associated payments and credit notes.
  - Editing the exchange rate is subject to account lock date restrictions, as described in [Lock Dates (COA)](https://help.jaz.ai/en/articles/9577112-lock-dates-coa)

**Q8. What formatting options are available in bills?**

The Pretty Case feature allows you to easily format text fields within bill transaction line items, ensuring consistency in text presentation according to your company's preferences.

Pretty Case offers four formatting styles:
- **Title Case**: Capitalizes the first letter of each word (e.g., "Office Supplies").
- **Sentence Case**: Capitalizes only the first letter of the first word (e.g., "Office supplies").
- **Lower Case**: Converts all text to lowercase (e.g., "office supplies").
- **Upper Case**: Converts all text to uppercase (e.g., "OFFICE SUPPLIES").

These options make it easy to standardize text formats across bill item descriptions, unit fields, and other text-based fields.

**Q9. How to adjust GST/VAT in Bills?**

- Click the GST/VAT amount in the totals section when editing a bill transaction.

**Q10. Which transactions allow GST/VAT adjustments?**

- You can utilize GST/VAT adjustments for the following transactions:
  - [Invoices](https://help.jaz.ai/en/articles/9094439-edit-invoice)
  - [Customer Credit Notes](https://help.jaz.ai/en/articles/9101355-edit-customer-credit)
  - Bills
  - [Supplier Credit Notes](https://help.jaz.ai/en/articles/9115435-edit-supplier-credit)

**Q11. What impact will GST/VAT adjustments have?**

- Adjustments affect the GST/VAT total and transaction total. All amounts in reports are impacted but not recorded in the ledger.

**Q12. Where can I see reports showing GST/VAT adjustments?**

- GST/VAT adjustments are shown in the "GST/VAT Adj. (Source)" and "GST/VAT Adj. (Notes)" columns in:
  - GST/VAT Ledger and related reports
  - Sales/Purchases Summary reports
    - Note: Adjustments are displayed in the item details column. No new adjustment columns are added to the Sales/Purchase Summary report.

**Q13. Can I bulk update or edit Bills?**

- Yes, use Quick Fix to bulk update or edit bills. It lets you edit multiple transactions or line items at once from the list view.
- Select records in the list view, then choose Quick Fix from the bulk actions menu. You can update:
  - Contact
  - Bill From / Deliver To
  - Transaction & Due Dates
  - Currency
  - PDF Template
  - Tags
  - Custom Fields
  - Notes
- Only unlocked fields are editable. Changes are highlighted before saving, and updates are processed only if changes were made. You'll get a success or error message after.

**Q14: Can I bulk update or edit line items in Bills?**

- Yes, use Line Item Quick Fix to update multiple line items at once from the Active or Draft tabs in the Line Items list view.
- Select multiple items, then click Quick Fix from the bulk actions menu. You can update:
  - Description (with classifier support)
  - Quantity, Unit, Price, Discount
  - Account
  - VAT/GST Profile
- Smart locking ensures only unlocked fields are editable, reducing errors.

---

### Saved Search (Bills)
Source: https://help.jaz.ai/en/articles/11324613-saved-search-bills

**Q1: What is Saved Search in Bills?**

- Saved Search lets you store commonly used filters for faster access when working with Bills

**Q2: What filters can I use in a Saved Search (Bills)?**

- Saved Searches support:
  - Numeric ranges (e.g., amount ranges)
  - Date ranges (e.g., specific time periods)
  - Text filters (e.g., reference numbers, contact names)

**Q3: Can I edit or delete a Saved Search (Bills)?**

- Yes. You can edit or delete Saved Searches using the same modal where you created them.

**Q4: Can I apply multiple Saved Searches at once?**

- No. Only one Saved Search can be active at a time. It behaves like a regular filter and cannot be edited inline or combined with other filters.

**Q5: Are there any rules when creating a Saved Search (Bills)?**

- Yes. Filters must pass strict validations—no duplicate rules or invalid combinations are allowed during setup.

---

### View Bills
Source: https://help.jaz.ai/en/articles/9104252-view-bills

**Q1. Where can I view a created bill?**

- A new bill will show up in **Active Bills.**
- Click on a bill to see its details.

**Q2. Can I search for bills by supplier name or bill number?**

- Yes. Under **Bills**, you can enter the supplier name or bill number in the**Search Bar**. Jaz will automatically filter out the relevant transactions for you.**Q3. Can I print or download a copy of the bill for my records?**

- Yes, you can download a bill PDF. Refer to [Bill Downloads](https://help.jaz.ai/en/articles/9104237-bill-downloads) for more information.​

**Q4. Do bills in Jaz include audit information?**

- Bills in Jaz include the **Created By**fields to show who was the creator of the bill, and the **Last Updated By**field to show the last editor of the bill.
- Bills that were previously submitted for approval will also have the **Submitted By**and **Approved By**fields.
- Click on **Show More**under **Bill Details** to reveal the field.**Q5. Where can I find the exchange rate for a bill with non-base currency?**

- To find the exchange rate for a bill with non-base currency:
  - Hover on the currency ISO to show the exchange rate used for the bill, relative to the base currency.
  - The exchange rate information will show the amount in the base currency, alongside the exchange rate information used.

**Q6. What happens if the exchange rate changes after I have viewed the bill?**

- Any changes in exchange rates on an organizational level will not affect existing bills that have already been created. Hence, existing bills will not be affected.
- However, if you change the exchange rate of an existing transaction by editing the transaction directly, this will be reflected in the bill the next time you view it.

**Q7. What is the lifecycle of a bill? What different states or stages does it go through?**

| **Status** |**When does this status occur?** |
| --- | --- |
| Draft | When a bill is saved as a draft. |
| For Approval | When a bill is submitted for approval. |
| Payment Due | When a bill is directly saved, converted to active from a draft, or approved. |
| Overdue | When a bill has not been paid by the due date. |
| Partially Paid | When a bill has only been partially paid for, either via a payment, or by applying supplier credit. |
| Fully Paid | When a bill has been fully paid off. |

---

### Void Bill
Source: https://help.jaz.ai/en/articles/9104254-void-bill

**Q1. Can I void a bill?**

- Yes, you can void a bill.
- Find the void option in the bill details. Once done, you can find the voided records under the voided tab.

**Q2. Can I undo voiding a bill?**

- No, voiding a bill is permanent.

**Q3. Will voiding a bill remove it from the application permanently?**

- No, voiding a bill will not do this.
- However,[deleting a bill](https://help.jaz.ai/en/articles/9104256-delete-bill) will remove it from the application permanently.

**Q4. What happens to any payments/credit notes associated with a bill after voiding?**

- Voiding a bill will also delete all associated payment records.
- If you have applied any supplier credit notes, the applied credit will be rolled back and unapplied.

**Q5. Will voiding a bill affect my financial reports?**

- Yes, voiding a bill will affect your financial reports.
- You may see a change in how different parts of your financial reports are calculated, due to the now voided transaction and removal of associated payments.
- Here's how your financial records and reports may be affected:
  - **Trial Balance -**The debit and credit amounts of your accounts (especially Accounts Payable) will be adjusted.
  - **Balance Sheet -**The total amounts of accounts previously used in the bill and related payments may have changed.
  - **Profit & Loss -**The overall net profit amount may change as you might see changes to amounts in operating revenue and expense accounts.
  - **Cashflow -**Opening and Ending cash balances may be affected.
  - **Ledger -**The voided bill will have its transaction record removed from the ledger.

**Q6. Can I add a note/explanation while voiding a bill?**

- Yes, you can. When voiding a bill, a pop-up box will show up.
- Other than confirming you want to void the bill, you can also add in **internal notes**atthis stage for your team to view.
- The void notes will show up on the voided bill as shown below.

**Q7. Can I void multiple transactions?**

- Yes. Voiding multiple transactions applies for the following transaction status
  - Active transactions
  - Balance Due (only for Invoices and Bills)
- Select multiple transactions you want to void by ticking the checkboxes.
- Adding a void note applies to all selected transactions.

---

### Bulk Bill Payments
Source: https://help.jaz.ai/en/articles/9993161-bulk-bill-payments

**Q1. Can I record payments for multiple bills at once?**

- Yes, use the Bulk Payment or Batch Payment features on Jaz to record payments for multiple bills in 1 go.
- Select the desired balance due bills to use the bulk or batch payment.

**Q2: Can I make bulk/batch payments for bills in different currencies?**

- Yes, you can select and pay invoices in various currencies simultaneously.
- All the payments will be recorded in the selected payment account currency.

**Q3. What is the difference between Bulk Payments and Batch Payments?**

- Bulk and Batch Payments both create a separate payment for each transaction and support partial, split, and cross-currency amounts. They only differ in bank reconciliation:
  - **Bulk Payments:** Each payment appears as a separate cashflow record
  - **Batch Payments:** Payments in the batch are aggregated into a single cashflow record**Q4. Can I partially pay bills during bulk/batch payments?**

- Yes, you can do partial payments during bulk/batch payments, by updating the bill payment amount.

**Q5. Payments created from the bulk/batch payment flow are created in which currency?**

- The payment currency will depend on the selected payment account's currency.
- So, irrespective of the selected bill currencies, all the payment currencies will be the same as the payment account currency.

**Q6. Is there a way to autofill the cash received equivalent to the bill payment amount during bulk/batch payment?**

- Yes, use the bulk/batch auto-fill feature to calculate the cash equivalent of the bill payment amounts to the payment amounts in the payment accounts currency.
- Alternatively, you can autofill the cash equivalent for each payment record
- You can also set a custom rate for just a single payment record.

**Q7. Can I add transaction fees while bulk/batch payments?**

- Yes, like the normal payments flow you can add transaction fees during bulk/batch payment creation flow. Refer to [transaction fee](https://help.jaz.ai/en/articles/9306134-transaction-fees-bill-payments) for more info.

**Q8. Is RGL calculated during bulk/batch payments?**

- Yes, like the normal payments flow if a payment is recorded in non-base currency, RGL can occur. Refer [When does realized FX gain-loss (RGL) happen, and how is it calculated?](https://help.jaz.ai/en/articles/9104257-record-bill-payments#h_62f0092b92)

**Q9. Is there a limit to the number of bills I can pay at once?**

- Yes, you can only select records on a single page. If the page size is set to 200, you can select up to 200 bills to create bulk payments. The current maximum page size is 500 records.

**Q10. Can I record overpayments from the bill bulk/batch payment flow?**

- No, you cannot record overpayments. Jaz will prevent you from entering a payment amount that is greater than the balance due on the bill.

**Q11. How do I edit a recorded bulk/batch payment?**

- Find the payment record (either from the payments tab / find the bill against which the payment is recorded) and edit the details as needed.

**Q12. Why are there separate columns for "Payment" and "Cash Received"?**

- The "Payment" column reflects the bill's original amount due in its designated currency.
- The "Cash Received" column allows you to record the actual amount received, which might differ due to exchange rate fluctuations in multi-currency scenarios.

**Q13. Can I view the total cash received during the bulk/batch payment?**

- Yes, you can view the total cash received during the bulk payment flow. The total cash received will be in the payment account currency.

**Q14. Is bulk payment the same as batch payment?**

- No, bulk payments create 1 payment record for all the selected bills.
- Batch payments create a single payment for all the selected bills.

---

### Delete Bill Payment
Source: https://help.jaz.ai/en/articles/9104262-delete-bill-payment

**Q1. Can I delete a bill payment record?**

- Yes, you can delete a bill payment record.
- After deleting a payment, the payment details and status on the associated bill will be automatically updated.
- **Note**: If a payment is marked as deleted, you will not be able to undo the action or retrieve the deleted payment record.**Q2. Will deleting my bill payments affect my financial reports?**

- Yes, as deleting payments will affect your organization's financial position. This change will be reflected in different financial reports available on Jaz.
- Here's how your financial records and reports may be affected:
  - **Trial Balance -**The debit and credit amounts of your accounts will be adjusted. Specifically, the **debit**record from the **Accounts Payable**account will be removed.
  - **Balance Sheet -**The total amounts of accounts previously used in the bill and related payments may have changed.
  - **Profit & Loss -**The overall net profit amount may change as you might see changes to amounts in operating revenue and expense accounts.
  - **Cashflow -**Opening and Ending cash balances may be affected.
  - **Ledger -**The deleted payment will have its record removed from the ledger.

**Q3. Can I add a note/explanation while deleting a bill payment?**

- Jaz currently does not support adding notes/explanations while deleting a payment.
- You will be prompted to delete the payment right away.

**Q4. What happens to a bill if a payment associated with it is deleted?**

- If a payment associated with the bill is deleted, the bill status will change back to **Payment Due**if the bill is not yet due, or **Overdue**if the bill has already passed its due date.
- This is because the bill is now missing payments that would mark it as completely paid.

**Q5. Can I delete partial payments or only full payments?**

- You can delete all types of payments on a bill.

---

### Edit Bill Payments
Source: https://help.jaz.ai/en/articles/9104260-edit-bill-payments

**Q1. Can I edit a bill payment record?**

- Yes, you can edit a bill payment record.

**Q2. Will the payment advice get regenerated again after editing?**

- Yes, the payment advice will be automatically updated upon amendment of the payment record.
- **Tip**: Having an issue where changes are not reflected on payment advice? Do allow 2 minutes for the system to refresh before attempting to download them again.**Q3. Does editing a payment affect financial records? **

- Yes, editing a payment will affect your financial records if the fields affecting the payment amount are updated.
- For example, the payment record on the General Ledger will have the payment amount updated with the new payment amount.
- Hence, other reports that rely on the General Ledger such as Trial Balances or Cashflows will also see updates following this.

**Q4. Can I edit a bill payment even if it's in non-base currency?**

- Yes, a bill payment's currency will not affect this.

**Q5. Are there any restrictions on how many times I can edit a bill payment?**

- No, there are no restrictions. You can edit a bill payment as many times as you need to.

**Q6. What fields can I modify while editing a bill payment?**

- There are no restrictions on the fields that you can modify while editing.

---

### Record Bill Payments
Source: https://help.jaz.ai/en/articles/9104257-record-bill-payments

**Q1. How can I add a new payment method type?**

- You cannot add a new payment method type for payments.

**Q2. Can I download the payment advice?**

- Yes, you can download the payment advice. Refer to [Bill Downloads](https://help.jaz.ai/en/articles/9104237-bill-downloads) for more information.

**Q3. How do I record a payment for a bill?**

- To record a bill payment, there are a few ways you can do so:
  1. During bill creation
    1. Price must be filled in for at least one line item for this option to be available.
    1. If the bill was saved as a draft, any associated payments will also be in a draft status.
    1. After saving the bill, the payment will be active, and show up in the **Purchases > Payments > Active** tab.
  1. After bill creation
    1. You can choose to create a partial/full payment for a bill by changing the bill payment amount.
  1. Depending on whether the payment is partial/full the bill status will be updated.

**Q4. Can I record a partial payment for a bill?**

- Yes, you can. When recording a payment for a bill, if the **Bill Payment Amount**is less than the bill transaction amount, then the bill would be considered to be partially paid.

**Q5. What happens if I pay in a different currency than the bill?**

- If there is a difference between the bill payment amount converted to the organization's base currency and the cash spent amount converted to the organization's base currency, realized gain-loss will take place.  This is further explained in [When does realized FX gain-loss (RGL) happen, and how is it calculated?](#h_62f0092b92)

**Q6. Where is the payment rate fetched from if the currencies don't match?**

- If the payment currency does not match the bill currency, there is a possibility of a realized gain/loss due to the fluctuations in the exchange rates.
- Jaz fetches a custom rate if available on the date of the payment. If not, the rate is fetched from 3rd party services.
- You can also adjust the payment rate if the one fetched by Jaz is not the rate you want to use for the payment.

**Q7. When does realized FX gain-loss (RGL) happen, and how is it calculated?**

- RGL happens when the following conditions are fulfilled:
1. There is a difference between the bill payment amount converted to the organization's base currency, and the cash spent converted to the organization's base currency.
1. The following bill payment/cash spent currency combinations take place:

| **Bill payment currency** |**Cash spent currency (Actual cash paid out to supplier)** | **Is there RGL?** |
| --- | --- | --- |
| Organization's base currency (e.g. SGD) | Non-base currency (e.g. USD) | Yes |
| Non-base currency (e.g. USD) | Organization's base currency (e.g. SGD) | Yes |
| Non-base currency (e.g. USD) | Non-base currency (e.g. USD) | Yes |
| Non-base currency (e.g. USD) | Non-base currency (e.g. EUR) | Yes |
| Organization's base currency (e.g. SGD) | Organization's base currency (e.g. SGD) | No |

- RGL is calculated this way for bills:
  - **Realized FX (Gain)/Loss = (Cash spent / Payment rate) - (Bill payment amount / Transaction rate)**
  - Where:
    - Cash spent: The amount spent (paid out) for the recorded bill payment
      - The bill payment amount will be equal to the cash spent amount, if the bill and payment account are in the same currency.
    - Payment rate: The exchange rate for the bill payment (cash spent) (1.00 if the cash spent is in the organization's base currency)
    - Bill payment amount: The amount recorded as paid for on a bill
      - This amount may be the entire bill amount, or a partial payment for the bill.
    - Transaction rate: The exchange rate on the bill (1.00 if the bill is in the base currency)
​
- FX gains are recorded as **negative expenses**, while losses are recorded as**positive expenses** to the **FX Realized (Gains)/Loss**account.
​
- In other words,
  - **FX gains** are recorded if the bill payment amount in base currency is**greater than** the cash spent in base currency at the exchange rate on payment date.
  - **FX losses**are recorded if the bill payment amount in base currency is **less than** the cash spent in base currency at the exchange rate on payment date.

- Example 1 - The bill payment is recorded in EUR, cash spent in USD and the organization's base currency is in SGD:
  - Cash spent: 65.00 USD
  - Payment rate: 1.00 SGD = 0.74338000 USD
  - Bill payment amount: 55.00 EUR
  - Transaction rate: 1.00 SGD = 0.68413000 EUR
  - Hence, in this case:
    - **Realized Loss**- **7.04 SGD= (65.00 / 0.74338000) - (55.00 / 0.68413000)**

- Example 2 - The bill payment is recorded in USD, cash spent in SGD and the organization's base currency is in SGD:
  - Cash spent: 70 SGD
  - Payment rate: 1.00 SGD = 1.00 SGD (Since SGD is the base currency)
  - Bill payment amount: 55.00 USD
  - Transaction Rate: 1.00 SGD = 0.74338000 USD
  - Hence, in this case:
    - **Realized Gain - (3.99 SGD) =  (70.00 / 1.00) - (55.00 / 0.74338000)Q8. What is a Withholding Tax Certificate payment? How is it different from other payments?**

- The Withholding Tax Certificate payment method refers to a withholding tax payment recorded for a bill.
- This refers to the tax that needs to be withheld and paid to the government.
- For bills, payments made via this payment method will always be credited to the **Withholding Tax Payable**payment account.

**Q9. How will deleting a tax profile impact my payment records?**

- Deleting a tax profile will not have impacts on any payments that have already been made and recorded.
- However, you will not be able to select the deleted tax profile moving forward on bill creation, which may have effects on pre and post tax calculations.

**Q10. How will making an account inactive impact my payment records?**

- Making an account inactive will not have impacts on any payments that have already been made and recorded.
- However, you will not be able to select the inactive account as a payment account (in the case of cash and bank accounts) moving forward, until the account is active again.

**Q11. I just made a payment for an active bill, but I don't see the transaction in my Accounts Payable. What happened?**

- If a payment has been recorded as paid for the bill on the same date as the bill date (i.e. payment date = bill date), the transaction will be recorded on the ledger as a cash transaction.
- The transaction will be recorded as a **debit**from the **Cash on Hand**account, and a **credit** to the account used on the bill.

---

### Transaction Fees (Bill payments)
Source: https://help.jaz.ai/en/articles/9306134-transaction-fees-bill-payments

**Q1. Can I record transaction fees for bill payments on Jaz?**

- Yes, you can. When recording a payment for a bill, you will find an option to add transaction fees.
- You can record transaction fees in absolute amounts or as a percentage of the cash spent.

**Q2. What can I use the transaction fee option on bill payments for?**

- The transaction fee option might be useful in some scenarios such as:
  - Your payment provider charges you a fee when you make a payment to your suppliers.

**Q3. What happens when a transaction fee is recorded?**

- When you record a transaction fee for a bill payment, the transaction fee charged is added to the amount under **Cash Spent**.
- The **Net Cash Spent**reflects the actual spent amount, including fees**.**
- On the bill details, the payment amount shown in the bill total summary will reflect the **Gross Cash Spent**or the cash spent before fees.

**Q4. How does recording GST/VAT work for transaction fees?**

- You can include GST/VAT on fees easily by selecting a profile.
- The summary will reflect a breakdown of the fees charged, showing the actual **fees charged**and the **GST/VAT on fees**.**Q5. How are transaction fees reflected on the general ledger?**

- On the general ledger, you should see a record reflecting the transaction fees charged under the expense account (e.g. **Transaction Fees & Charges**) that you have selected when recording a transaction fee.
- If you have indicated **GST/VAT included** in the transaction fees, you should see an additional record for the included GST/VAT under the**Input GST Receivable **account.

---

### View Bill Payments
Source: https://help.jaz.ai/en/articles/9104259-view-bill-payments

**Q1. Where can I view past payment records of a bill?**

- All the payments made on a bill can be found in the bill details.

**Q2. How do I know if there is an aggregate RGL displayed on the bill?**

- Aggregate RGL will apply if multiple partial payments are made on the bill, and at least one of the payments was made in the base currency for a bill recorded in non-base currency.

**Q3. Will I be able to see a list of all the payments or just 1 complete payment on the bill?**

- You will be able to see a list of all the payments made on the bill.

---
