### Apply Customer Credit
Source: https://help.jaz.ai/en/articles/9062336-apply-customer-credit

**Q1. Can I apply a draft customer credit note to an invoice?**

- No, customer credit notes must be fully active before they can be applied.

**Q2. Can I apply a customer credit note of a different currency than the invoice?**

- If you would like to apply a customer credit note to an invoice, the customer credit note must be in the same currency that the invoice was created in.
- For example, an invoice that was created in USD can only make use of customer credits that were also credited in USD.

**Q3. Can I partially apply a customer credit note to an Invoice?**

- Yes, you do not have to use the full amount in the customer credit note.
- You can adjust this via the **Amount to Apply**field. Enter an amount smaller than the customer credit note amount to only apply the credit note partially.

**Q4. Can I partially pay an invoice using a customer credit only?**

- Yes, customer credits do not have to cover the entire invoice amount. You can apply as much of a customer credit note as you would like to an invoice.
- The rest of the invoice can be paid with other payment methods.

**Q5. Can I remove an applied customer credit note from an invoice?**

- Yes, you can remove an applied customer credit note on an invoice by updating the applied amount to 0.
  - Change the credit **Amount to Apply**amount to 0 on the **Edit Applied credit**modal. This will remove all applied credit from the invoice.

**Q6. Does applying a customer credit note have an impact on my financial reports?**

- There will be no further impact on your financial reports.
- This is because the credits would have been accounted for during creation, appearing as a credit to **Accounts Receivable**, and a debit to the sales account used on the invoice.
- The offset value date aligns with the later of the transaction date or the credit note date, ensuring accurate reporting across time zones. For example:
  - Transaction Date: 1 Jan 2025
  - Credit Note Date: 5 Jan 2025
  - Offset Value Date: 5 Jan 2025

---

### Delivery Slips
Source: https://help.jaz.ai/en/articles/9062341-delivery-slips

**Q1. What are delivery slips?**

- Delivery slips are an additional PDF document that the user can download and print as delivery proof, consisting of the item details for the particular order.
- There will be a **Received by**and **Delivered by** signature component the user can use to confirm the delivery.**Q2. How can I generate a delivery slip for an invoice?**

- You can find the** Delivery Slip **option on the invoice details.**Q3. What information will a delivery slip contain?**

- After downloading a delivery slip, the delivery slip should look something like this:
- It will contain information about the items sold, the quantity sold if applicable, the invoice information, and the delivery information.
- There is also a footer section that you can use to sign off on the delivery slips.

**Q4. How is a delivery slip different from an invoice receipt PDF?**

- A delivery slip does not require that an invoice has been fully paid off, or that any form of payment has been made for the invoice.
- An invoice receipt shows the invoice payment and balance details, while delivery slips do not.
- It is purely meant to be a source of additional information outlining a list of goods and services supplied, and whether the delivery was received in good condition.

---

### Draft Invoices & Payments
Source: https://help.jaz.ai/en/articles/9062346-draft-invoices-payments

**Q1. Can I save an invoice as a draft?**

- Yes, an invoice can be saved as a draft even if all the mandatory fields are not filled.

**Q2. How can I convert a draft invoice to an active one?**

- Any draft bill can be converted to active only after all the mandatory fields are filled.

**Q3. Can I save payment records as drafts?**

- Yes. Similar to draft invoices, you can save a draft payment.

**Q4. How can I convert draft payment records to active ones?**

- Find the draft payment on an invoice and ensure all the mandatory fields are filled.
- You should then be able to convert it to active.

**Q5. Can I delete a draft invoice?**

- Yes, you can delete a draft invoice. If the invoice had a draft payment linked, it will also be deleted.

**Q6. Can I delete a draft invoice payment?**

- Similar to draft bills, draft invoice payments can also be deleted.

**Q7. Do draft invoices affect my financial reports?**

- No, it does not. Financial reports are only affected once the invoices are active.

**Q8. Do draft invoice payments affect my financial reports?**

- No, it does not. Financial reports are only affected once the payments are active.

**Q9. Can I create a non-base currency draft invoice?**

- Yes, the currency setting on an invoice does not affect the ability to save it as a draft.

**Q10. Can I create a non-base currency draft invoice payment?**

- Yes, you can save an invoice payment as a draft even if it is in non-base currency.

---

### Import Invoices
Source: https://help.jaz.ai/en/articles/9094454-import-invoices

**Q1. Can I import multiple invoices in Jaz?**

- Yes, you can import invoices in two ways:
  - **Line Items:** Rows with the same invoice reference are grouped into one invoice.
  - **Summary Totals:** Each row is treated as a separate invoice.**Q2. Can I update existing invoices using import?**

- No, you can only create new invoices using the import function.

**Q3. What file formats are supported for importing invoices?**

- Only a .xlsx file using our template will be supported for importing invoices.

**Q4. Will importing invoices automatically create active invoices?**

- Yes. After finishing the import process, all the created invoices will be converted to active.

**Q5. Will importing invoices affect any existing invoices in Jaz?**

- No, existing invoices in Jaz will not be affected.

**Q6. How many invoices can I bulk import at one time?**

- Each import supports up to 1,000 rows.

**Q7. Can I review the invoices before importing them?**

- Yes. After importing the bulk invoice template, you will be shown a list of imported invoice records picked up by Jaz from the template.

**Q8. What should I do if there are errors or duplicates in the imported invoices? How can I fix them?**

- Use the Review sheet in the template to view possible errors.
- In Jaz, a review step highlights issues in the file for validation and correction.
- For example, if the error reads "Item/Description is required to import the invoice" for Row 6, then check if the Item/Description field has been filled in.
- After fixing all the errors presented by Jaz, save your template and reimport the template to restart the bulk import process.

**Q9. Can I update an invoice created from the import flow?**

- Yes. After the invoice is created from the import flow, you can find it under the **Invoices > Active tab.Q10. Can I create an invoice payment while importing invoices?**

- Yes, you can import a paid invoice by creating a payment for the invoice in the import template.

**Q11. Can I add multiple items in a single invoice using import?**

- No, you can only add a single line item while importing invoices. If you wish to add multiple items to an invoice, please use the normal invoice creation flow.

---

### Invoice Receipts
Source: https://help.jaz.ai/en/articles/9062339-invoice-receipts

**Q1. What is an invoice receipt?**

- Invoice receipts allow you to create an invoice and a payment concurrently, saving time**.**
- Create an invoice receipt from the Invoices sub-tab or while reconciling a statement line. For more information on using invoice receipts during bank reconciliations, please see [Bank Reconciliations](https://help.jaz.ai/en/articles/9941720-reconciliations-overview#h_57aef6a790)

**Q2. What options do I have for sending the invoice created from an invoice receipt to my customer?**

- You can:
  - Download the invoice from Jaz, and send the invoice to your customer.
- For more information on invoice downloads, see [Invoice downloads](https://help.jaz.ai/en/articles/9062708-invoice-downloads)

**Q3. How is an invoice receipt different from a regular invoice?**

- An invoice receipt is a short-form template to record a fully paid invoice, meaning that payments have already been made for the invoice. You will be asked to enter a payment alongside the invoice.
- This is different from a regular invoice, where at the point of creation, there may not have been any payments made for the invoice.

**Q4. When and why would I use an invoice receipt instead of a full invoice?**

- If you just need a quick and easy record and reference to an invoice that has already been settled, perhaps say offline, invoice receipts are a quick way to bring this information into Jaz.

**Q5. Can I track payments and view the status of an invoice receipt?**

- Due to the nature of invoice receipts, the invoice that is created from an invoice receipt would be marked with a **Fully Paid**status.
- You can view the created invoice under **Invoices > Active.**
- Open up the invoice created from the invoice receipt, and you will also be able to see any payments associated with the created invoice.

**Q6. How do I send an invoice receipt to a customer?**

- You can download the resulting invoice and payment records created as a PDF, and send that out to a customer.

**Q7. Will using invoice receipts affect my accounting on the platform?**

- No, it will not affect your accounting on Jaz. Invoices and payments created from invoice receipts are treated as normal invoice and payment records.

---

### Quotation
Source: https://help.jaz.ai/en/articles/10214991-quotation

**Q1. How can I create a quotation?**

- Create a new invoice and save it as draft
- Open the draft invoice and download the PDF quotation.

**Q2. Can I email the quotation directly from Jaz?**

- Emailing quotations directly from the app is not yet supported.

---

### Scan Invoices & Bills
Source: https://help.jaz.ai/en/articles/9994213-scan-invoices-bills

**Q1. Is there an easy way to create invoices and drafts instead of uploading attachments to Jaz?**

- Yes! You can use the Jaz iOS or Android app to directly scan your physical invoice or bill documents.
- Enable the 'Jaz Magic' toggle to merge all images into a single PDF file and upload it to create one invoice or bill draft, with details automatically filled from the scanned documents.

**Q2. Once the images are merged, is it possible to delete one?**

- Yes, you can delete any of the images or retake an image to replace the old one.

**Q3. How many images can be merged into a single document?**

- You can merge up to 10 images into a single PDF.

**Q4. I don’t want to merge the images into a single PDF, what do I do?**

- Simply toggle off the 'Jaz Magic' feature after scanning the images, and each image will be uploaded as a separate attachment in the invoice or bill draft.

Q5. Why don't I see a draft invoice or bill created after scanning my documents?

- It typically takes about a minute for the draft to appear in your Jaz mobile or web app.

---

### Scheduled And Recurring Invoices
Source: https://help.jaz.ai/en/articles/9062579-scheduled-and-recurring-invoices

**Q1. How do I set up a scheduled invoice in Jaz?**

- You can setup a scheduled invoice from the scheduler tab.
- Fill in the different details needed for the scheduled invoice.
  - You can adjust the scheduled date and select the frequency of the schedule.
- Alternatively, you can select an existing invoice and make it recurring.

**Q2. Can I choose the start, and end date of a schedule?**

- Yes, you can choose the start date by modifying the **Schedule Date**, and choose the end date by modifying the**End Date** when setting up the schedule details.

**Q3. How can I set the frequency of a schedule?**

- You can set the frequency of a schedule by adjusting the Repeat field and End Date field.
- Currently, Jaz allows frequencies of:
  - Does not repeat (This means that the invoice will only be scheduled to be sent out once.)
  - Daily
  - Weekly
  - Monthly
  - Quarterly
  - Yearly

**Q4. Will the scheduled invoice be automatically created on the scheduled date?**

- Yes, no further action from you is required. Jaz will handle the creation of the invoice on the scheduled date.

**Q5. What happens if I need to make changes to the scheduled invoices before it's created?**

- You can easily make changes to a scheduled invoice by editing it before it runs.
- You will be able to see the previously created invoice details and make any edits that you need.

**Q6. How do payments work with scheduled invoices?**

- You can record full or partial payments when scheduling invoices
- These payments will be scheduled with the invoice, and will also be created on the scheduled date.

**Q7. Can I choose the currency for the scheduled invoices & payments?**

- Yes, you can. Click on the **currency label** within the invoice schedule. You will be brought to the currency settings.
- Select the currency that you would like for the invoice to have.

**Q8. Will I receive a notification whenever an invoice is created from a schedule?**

- Jaz currently does not support notifications whenever an invoice is created from a schedule.

**Q9. Is there a limit to the number of scheduled invoices I can create?**

- There are currently no limits to the number of scheduled invoices you can create on Jaz.

**Q10. Can I create a schedule with start & end dates in the past?**

- Yes, you can create a schedule with start and end dates in the past.
- After creating the schedule, the schedule will immediately run, and all the invoices will be immediately created.
- Note: The date on the invoice will be the scheduled date, rather than the day the schedule was created.

**Q11. What happens if I update the schedule after it has already run several times?**

- Updating a schedule will have no impact on previously created invoices from the schedule.
- Any changes made will only be reflected on new invoices that are created from the schedule.

**Q12. What happens if I update an invoice created from a schedule?**

- Any changes made will be contained in the invoice itself. The original scheduled invoice and its details will not be affected, and will not see any changes.

**Q13. How can I stop a schedule?**

- You can stop a schedule by making the schedule inactive.
- Alternatively, you can also delete the schedule from the same menu.

**Q14. How can I restart a schedule?**

- Make a schedule active to restart it.
- Note: If the end date is earlier than the day of restarting the schedule, you will have to update the end date to the current day or later for the schedule to restart.

**Q15. What does it mean to make a schedule inactive?**

- Making a schedule inactive stops any new invoices from being created based on the schedule frequency.

**Q16. What happens if I make an inactive schedule active?**

- If you make an inactive schedule active, new invoices will start getting created again the next time the scheduled date or frequency is reached.

**Q17. Can I duplicate a schedule?**

- Yes, you can duplicate a schedule.

**Q18. Does creating a scheduled invoice affect any financial reports?**

- No, creating a scheduled invoice will not affect any financial reports.
- Financial reports will only be affected only after an invoice is created and active based on the schedule.

**Q19. What happens if I void an invoice created from a schedule?**

- If the invoice was created from a one-off schedule, the schedule will turn inactive as soon as the invoice is created. As such, there will be no further impact on the schedule even if you void the invoice at this point.
- If the invoice was created from a recurring invoice schedule, the schedule will run as normal the next time the designated scheduled date or frequency is reached. A new invoice will be created from the schedule at that point.

**Q20. Which exchange rate is considered for a future date if there is no custom organization rate set?**

- If there is no custom organization rate set at the point of the invoice being scheduled, Jaz will make use of the invoice-level custom exchange rate if you set one during the invoice schedule creation.
- If not, when the invoice is created, Jaz will make use of the 3rd party market rate on the day of invoice creation (which is the scheduled date).

**Q21. Can I add dynamic information to scheduled subscriptions so each one is different?**

- Yes, you can add dynamic information to scheduled subscriptions using scheduler strings. These strings generate dynamic data based on the transaction date, with values automatically updated relative to the date.
- You can find the available scheduler dynamic strings beside the Item/Description line item header.
- Hover over the string you want to use and click the copy icon to insert it into the invoice template

**Q22. In which fields can I use the scheduler strings in a scheduled Invoice?**

- You can use the scheduler strings in the following fields along with static data -
  - Item/Description
  - Unit
  - Invoice Notes
- When the scheduler runs and generates a bill, the strings will be replaced with dynamic values based on the scheduler string type and the generated invoice's transaction date.

**Q23. Can I track the transactions created by a scheduler?**

- Yes. You can view the sub-tab **Transaction History** when opening a schedule.

---

### Scheduled and Recurring Sales Subscriptions
Source: https://help.jaz.ai/en/articles/11507704-scheduled-and-recurring-sales-subscriptions

**Q1: How do I set up a scheduled Sales Subscription in Jaz?**

- To set up sales subscriptions, go to Scheduler > Sales > New subscription:
  - Fill in the required subscription details.
  - Set the scheduled date.
  - Choose the desired schedule frequency.
  - You can opt to apply proration and/or payments
  - Save the subscription schedule.

**Q2. Can I choose the start, and end date of a schedule?**

- Yes, you can choose the start date by modifying the Schedule Date, and choose the end date by modifying the End Date when setting up the schedule details.
- You can only choose the current date or future dates.

**Q3. How can I set the frequency of a schedule?**

- You can set the frequency of a schedule by adjusting the Repeat field and End Date field.
- Currently, Jaz allows frequencies of:
  - Daily
  - Weekly
  - Monthly
  - Quarterly
  - Yearly
- The End Date can be set manually and is optional.

**Q4. What happens if I need to make changes to the sales subscription?**

- Once a sales subscription is saved, certain fields become non-editable to prevent billing mismatches. These include
  - Chart of Accounts (COA)
  - Tax profiles
  - Currency
- Any changes made will only be reflected on new subscription invoices that are created from the schedule.

**Q5. Can I choose the currency for the scheduled subscriptions & payments?**

- Yes, you can. Click on the currency label within the subscription schedule. You will be brought to the currency settings.
- Select the currency that you would like for the subscription to have.

**Q6. How do payments work with sales subscriptions?**

- Sales subscriptions only support full payment records.
- These payments will be scheduled with the invoice, and will also be created on the scheduled date.

**Q7. Is there a limit to the number of scheduled sales subscriptions I can create?**

- There are currently no limits to the number of scheduled invoices you can create on Jaz.

**Q8. What happens if I update the schedule after it has already run several times?**

- Updating a schedule will have no impact on previously created invoices from the subscription. The change will only apply on the next recurring subscriptions.

**Q9. Can I create a subscription schedule with start and end dates in the past?**

- No, you cannot set start and end dates in the past for a subscription schedule. However, if you need to charge customers for previous dates, you can use the **prorate feature.**This will calculate the appropriate amount for those dates and generate a prorated invoice accordingly.

**Q10: What is Proration in the Subscription Scheduler, and how does it work?**

- Proration adjusts billing to reflect the time a subscription was active, even before the invoice creation date.
- Proration can only handle backdate billing but not create backdated schedules.
- Here’s how it works:
- Fill in the required invoice fields, and the proration feature will appear.
- Proration can only adjust dates prior to the subscription’s creation date.
- The prorated invoice will include:
  1. A line item for the prorated amount (from the start date to the next cycle).
  1. Recurring line items for future billing.
- Proration also applies to subscription cancellations, allowing adjustments during the [cancellation](#h_9235d654ee) process.

**Q11: What happens if I cancel a subscription schedule**

- Subscription cancellations can be processed in two ways:
  - **End of Current Period**
    - If payments are applied to subscription invoices:
      - An active customer credit note is created for the current subscription amount and automatically applied.
    - If payments are not applied:
      - An active customer credit note is created for the current subscription amount.
  - **On a Custom Date**
    - If payments are applied to subscription invoices:
      - A draft customer credit note is created for the prorated amount.
    - If payments are not applied:
      - An active customer credit note is created for the prorated amount.
  - **End of Last Period**
    - The end date is set to the last record date.
    - If the last invoice is unpaid, it is automatically voided.
    - If the last invoice is paid or partially paid, the cancellation fails with an error.
    - No credit notes or proration adjustments are generated.
- Note: Cancelling a subscription does not delete invoices that were already generated by the subscription scheduler.

**Q12. What is the difference between a Scheduled Sales Subscription and Scheduled Invoices?**

- Sales Subscription Scheduler has a proration function for flexible billing management.

**Q13: Can I cancel subscription schedules that have not yet started?**

- Yes, you can. Hover over the schedule, click the three-dot menu, and select “Cancel.” A confirmation dialog will appear to prevent accidental deletion.

**Q14. Can I track the transactions created by a scheduler?**

- Yes. You can view the sub-tab Transaction History when opening a schedule.

---

### Transaction Settings (Invoices)
Source: https://help.jaz.ai/en/articles/9062337-transaction-settings-invoices

**Q1. How does default settings for invoices simplify the invoicing process?**

- By having invoice default settings, the different invoice setting fields will be filled up automatically based on your preferences every time you create an invoice.
- This means that you can save the hassle of having to repeatedly fill in your invoice settings as you are sending out invoices.

**Q2. Can I customize the default settings for invoices?**

- Yes, you can customize the default settings for invoices. The default settings can be found in each invoice.

**Q3. Will the default settings apply to all the invoices automatically? Even the ones already created?**

- Default settings will apply to all new invoices during creation automatically. Invoices that have already been created will not be affected.

**Q4. Can I override the default settings for an individual invoice if needed?**

- Yes, you can adjust the individual invoice settings even if there have been invoice default settings applied.

**Q5. Can I change the default settings for invoices at any time?**

- Yes, simply set up the default invoice settings again as normal.

**Q6. Can I bulk edit nano classifiers in my invoice?**

- Yes, you can bulk apply or remove classifiers in Invoice Settings.

**Q7. How do I edit my invoice reference series?**

- To update your invoice reference series, follow these steps: Go to Transaction Defaults > Details > Adjust the Series Start and Series Offset fields.
  - Note:
    - The Series Offset format is: (Series Start + Next Invoice Count) - Series Offset
    - It must be a positive number

---

### User Roles (Invoices)
Source: https://help.jaz.ai/en/articles/9094453-user-roles-invoices

**Q1. How do different permission levels in Jaz affect what I can do with invoices?**

- Admins can:
  - View all invoices
  - Create and manage active invoices
  - Approve submitted draft invoices

- Preparers can:
  - View all invoices
  - Create and submit draft invoices for approval

- Members can:
  - View only the invoices that they have created
  - Create and submit only their draft invoices for approval

**Q2. Can a preparer approve submitted invoices?**

- No, only users with admin permissions for **Accounts Receivable (AR)** can approve submitted invoices.

---

### Create An Invoice
Source: https://help.jaz.ai/en/articles/9062234-create-an-invoice

**Q1. How can I auto-populate an invoice's due date?**

- Under terms, choose the designated net days in which the invoice is due.
- The due date will be the invoice date + the designated net days, e.g. 7 days after 20 Mar 2024 is 27 Mar 2024, so the invoice will be due on the 27 Mar 2024.

**Q2. How can I add more fields to the invoice template?**

- While creating a new invoice, under **Invoice Settings** >**Advanced**, enter**Custom fields.**
  - If you do not see this option available, it means that you currently do not have any custom fields set up. See [Custom Fields](https://help.jaz.ai/en/articles/9066650-custom-fields) for more information on setting custom fields.

**Q3. How can I edit the customer address for an invoice?**

- Find the pencil icon above the customer name to edit the address.

**Q4. Why is the customer address for the contact not updated after creating the invoice?**

- The customer address will only be updated for the invoice.
- To permanently update the customer address, locate your customer under contacts and update the customer address.
- Refer to [Contacts](https://help.jaz.ai/en/articles/8938009-contacts) for more information.

**Q5. Can I download an invoice PDF?**

- Yes, you can download an Invoice PDF.
- For more information on invoice downloads, see [Invoice downloads](https://intercom.help/jaz-ca1acb882400/en/articles/9062708-invoice-downloads).

**Q6. Can I duplicate an invoice?**

- Yes, you can duplicate an invoice.
- Upon duplication, a **New Invoice**creation screen will show, with the invoice fields automatically filled in following the duplicated invoice.

**Q7. What are the fields being duplicated when you duplicate an invoice?**

- All the data on the selected invoice will be duplicated.

**Q8. Can I preview my Invoice PDF before I send it out?**

- Yes, just tap on the preview icon located on the side bar.

**Q9. Can I add my company logo to the invoice PDF?**

- Yes, you can. Just head to the[PDF Templates](https://help.jaz.ai/en/articles/10729638-pdf-templates#h_fccf644b35) to set a logo for each invoice template you create.

**Q10. How do I add discounts?**

- To add a discount, ensure that **Discounts**are enabled under **Item Attributes**in the **Invoice Settings.**
- You will then be able to add a discount at a line item level.
- When discounts are applied, the Subtotal amount becomes clickable to view the breakdown of the applied discounts.

**Q11. How do I add taxes?**

- To add taxes for an invoice, ensure that you have selected a **GST/VAT setting** under**default GST/VAT**, either**GST/VAT Included in Price** or **GST/VAT Excluded in Price**.
- Afterward, you will be able to select a tax profile at a line item level.
- These taxes will also show up in the invoice total summary.

**Q12. How do I choose a currency for an invoice?**

- Click on the **currency label** within the invoice. You will be brought to the currency settings.
- Select the currency that you would like the invoice to have.

**Q13. Can the currency be automatically determined, or do I need to select it manually?**

- Yes. There are a few ways where the currency can be automatically determined:
  1. Via the contact's default currency setting.
    1. If you have selected a contact for the invoice, the currency will be automatically set to the contact's default currency.
  1. Your invoice default settings
    1. Under **Default Settings > Accounting,**you can also set a default invoice currency there.
  1. Your organization's base currency
    1. If both are not available, the organization's base currency will be used.
- If you would like to choose a currency outside of these options, you can select it from the list of currencies already added to your organization. If not, you can also **add a currency**.**Q14. What is the difference between the invoice setting, invoice default setting, and customer-selected currency options?**

- **Invoice setting**: Settings that will only be applied to a single invoice (the one being created or looked at)
- **Invoice default setting**: Settings that will automatically be applied by default at the start of the invoice creation process for all invoices
- **Customer-selected currency options**: The currency that you have associated the customer contact with, typically the currency that you transact in with this contact.**Q15. How does selecting a currency affect my business transactions?**

- Selecting a non-base currency may lead to foreign-exchange gains & losses due to differences in exchange rates when the transaction was created and when payment was made.

**Q16. Can I use different currencies for different invoices?**

- Yes, currencies can be set at an invoice level.

**Q17. Will the selected currency affect how my customers are charged or how payments are processed?**

- Customers will be charged in the currency selected on the invoice. For example, even if the organization's base currency is set to USD, but the invoice level currency is set to CAD, the customer will still be charged and receive an invoice in CAD.
- For payments received in base currency for an invoice in a non-base currency, there may be foreign-exchange gains & losses incurred. See [When does realized FX gain-loss (RGL) happen, and how is it calculated?](https://help.jaz.ai/en/articles/9062327-record-invoice-payments#h_6ddd4e757d)

**Q18. Can I change the currency of an invoice after it has been created?**

- Yes, you can change the currency for an invoice after it has been created by editing the **Invoice Settings**.**Q19. Are there any additional fees or considerations associated with using different currencies in my invoices?**

- No, Jaz does not charge a fee for making use of different currencies in your invoices.
- However, do be mindful of any potential foreign exchange differences, as mentioned in: [Q16. Will the selected currency affect how my customers are charged or how payments are processed?](#h_bc952ec1c9)

**Q20. How are currency conversions & exchange rates handled for an invoice?**

- When choosing a currency under **Invoice Settings,**
  - If an organization's custom exchange rate has been set for the currency & time range when the invoice was created, Jaz will make use of this exchange rate.
  - You can also set an exchange rate on a transaction level by clicking on the **pencil icon** to edit the exchange rates.
  - If not, Jaz will use a third-party service to determine a mid-market exchange rate, and use that instead.

**Q21. How can I add shipping fees to my invoice?**

- To add shipping fees to your invoices, you can click on the amount next to **Shipping**on your invoice total summary.
- Enter the amount to charge for shipping, as desired.

**Q22. How can I add GST/VAT for shipping fees to my invoice?**

- To add **GST/VAT**for shipping fees to your invoice, select a **GST/VATProfile**when adding shipping fees to your invoice. Refer to [Q20. How can I add shipping fees to my invoice?](#h_09f65610c2) to learn more about adding shipping fees.

**Q23. I just created an active invoice, but I don't see it in my Accounts Receivable. What happened?**

- If a payment has been recorded as received for the invoice on the same date as the invoice date (i.e. payment date = invoice date), the transaction will be recorded on the ledger as a cash transaction.
- The transaction will be recorded as a **credit**into the **Cash on Hand**account, and a **debit** from the account used on the invoice.

---

### Invoice Attachments
Source: https://help.jaz.ai/en/articles/9094433-invoice-attachments

**Q1. How can I upload attachments to an invoice?**

- You can upload attachments during invoice creation.
- Alternatively, you can add attachments to an existing invoice.
  - You can see a preview of the attachment by clicking on the attachment after uploading.

**Q2. Can I view the uploaded attachments to an invoice?**

- Yes, you can see a preview of the attachment by clicking on the attachment after uploading.

**Q3. Will my customers be able to see these attachments when I send them the invoice via email?**

- No, they will not be able to see these attachments. The attachments will only be available to view by users of your organization who have access to the invoices.

**Q4. How can I preview an XLSX, ZIP, EML or RAR file attached to an invoice?**

- You will not be able to view the XLSX, ZIP, or RAR attachments within the JAZ app like you can view an image, instead, the file will be downloaded for you to access it.

---

### Invoice Line Items
Source: https://help.jaz.ai/en/articles/9094432-invoice-line-items

**Q1. How can I save a new item when creating an invoice?**

- You can’t save a new item when creating an invoice. You need to go to **Items List** to create a new item, then the item will appear when creating an invoice. See [Items List](https://help.jaz.ai/en/articles/9094095-items-list) for more information.
- However, you can create a new custom item. Refer to [What is a custom item, when would I need to create one for an invoice?](#h_3f3cdfee7a) for more information.

**Q2. How can I update the GST/VAT profile for a line item?**

- Ensure that a GST/VAT setting has been selected (GST/VAT included in price or GST/VAT excluded in price) via the **Invoice Settings.**
- Afterwards, you will be able to select a GST/VAT profile for the line item.
- To update the GST/VAT profile for a line item, choose from one of your organization's existing GST/VAT profiles, or **Add New**to add a new GST/VAT profile.

**Q3. What is a custom item, when would I need to create one for an invoice?**

- A custom item is an item that you create at the point of invoice creation. The item is not created via the Items List and does not appear in the drop-down list of items that you can select from.
- You can create one if you think that this item will only be used in the current invoice. Otherwise, we would recommend creating an item in the Items List. See [Items List](https://help.jaz.ai/en/articles/9094095-items-list) for more information on using Items.

**Q4. Is there a restriction on the type of account I can select for an item in an invoice?**

- While there are no strict restrictions on the type of account you can select for an item in an invoice, Jaz will **warn you** if you have selected an account that is not a**Revenue Account**.**Q5. Why do I not see all the GST/VAT profiles created in an invoice?**

- Some of your previously created GST/VAT profiles may only apply to other business transactions such as bills or supplier credits. As such, you may not be able to select them for your invoice.

**Q6. Why can't I edit/delete a line item from an existing invoice?**

- If you can't edit/delete a line item, you most likely have an active fixed asset associated with this line item.
  - When editing, you will not be able to edit the account, total amounts and exchange rates used.
- You will have to delete the fixed asset from the fixed asset register, before being able to delete the line item.
- For more information about fixed assets, refer to: [Fixed Assets](https://help.jaz.ai/en/articles/9575775-fixed-assets)
- You will still be able to edit the rest of the information on the line item, such as the description.

**Q7 .Can I view item details across multiple transactions?**

- Yes, you can analyze item-level details across multiple transactions in the invoices dashboard.
- Each row is one line item. Clicking each will open the particular invoice transaction.

---

### Invoice Notes
Source: https://help.jaz.ai/en/articles/9094435-invoice-notes

**Q1. What is the difference between invoice notes and internal notes?**

- Invoice notes are visible on the invoice PDF.
- Internal notes are only visible to your internal team in the invoice settings.

**Q2. Why has the invoice notes section been automatically filled in?**

- When creating an invoice, if you select a contact that has **default invoice notes** filled in, those will automatically be applied to the new invoice.
- For more information about default invoice notes for contacts, refer to [What is the "invoice notes" section for a contact?](https://help.jaz.ai/en/articles/8938009-contacts#h_2505d02ffe)

---

### Invoice Settings
Source: https://help.jaz.ai/en/articles/8936897-invoice-settings

**Q1. Where can I adjust the settings for a single invoice?**

- Click on the **gear icon**on the right side of the screen while creating an invoice. A menu should show up.

**Q2. How to remove GST/VAT, item discount, or item quantity & unit from appearing in the invoice?**

- To remove GST/VAT, you can adjust the default GST/VAT settings to **No GST/VAT.**
- To remove item quantity & unit, you can disable both options under **Item Attributes.**

---

### Delete Invoice
Source: https://help.jaz.ai/en/articles/9094442-delete-invoice

**Q1. Can I delete an invoice?**

- Yes, you can delete an invoice.
- **An invoice must first be voided before it can be deleted. See[Void Invoice](https://help.jaz.ai/en/articles/9094440-void-invoice) for more details.**
- **Note**: If an invoice is marked as deleted, you will not be able to undo the action or retrieve the deleted invoice.**Q2. Can I undo a deletion or retrieve a deleted invoice?**

- No, all deletions are final.

**Q3. What happens to any payments/credit notes associated with an invoice after deletion?**

- Deleting an invoice will not have further effects on payments or credit notes. Any effects on payments or credit notes associated with an invoice would have been applied when the invoice was voided.

**Q4. Will deleting an invoice affect my financial reports?**

- Deleting an invoice will not have further effects on your financial reports, as voiding the invoice beforehand would have already applied any relevant effects.

**Q5. Can I add a note/explanation while deleting an invoice?**

- Currently, you may not add additional internal notes while deleting an invoice.

---

### Edit Invoice
Source: https://help.jaz.ai/en/articles/9094439-edit-invoice

**Q1. Can I edit an invoice?**

- Yes, you can edit an invoice.
- Choose the **edit**option from the 3-dot menu of the desired invoice details screen to edit.
- Upon choosing edit, you will see an **Edit Invoice**page, where you can make changes to your invoice headers, line items, attachments, invoice notes or invoice settings.

**Q2. Will invoices be regenerated again after editing?**

- Yes. Invoices will be automatically updated upon amendment.
- **Tip**: Having issues where changes are not reflected on invoices? Do allow 2 minutes for the system to refresh before attempting to download them again.**Q3. Can I edit an invoice even if it is in non-base currency?**

- Yes, an invoice's currency setting will not affect this.

**Q4. Will the recipient be notified if I edit the invoice?**

- No, the recipient will not be automatically notified if you edit the invoice. You will have to enable sending the invoice by email again to re-notify the recipient.

**Q5. Are there any restrictions on how many times I can edit an invoice?**

- No, there are no restrictions on the number of edits. You can edit an invoice as many times as you need to.

**Q6. What fields can I modify while editing an invoice?**

- There are no restrictions on the fields that you can modify while editing an invoice.

**Q7. What happens to an invoice's payments if the invoice amount is updated?**

- If you edit any information on an invoice that will change the invoice amount, any associated invoice payments will be removed if they are not reconciled.
  - Jaz will show you a warning if you attempt to update the invoice amount.
- Note: If associated payments on an invoice have already been reconciled with statement lines, you will not be able to update the invoice amount. You will see an error message.

**Q8. Can I edit the exchange rate being used on an invoice?**

- You can edit the exchange rate being used on an invoice even after creation.
  - You can edit the exchange rate via the invoice settings.
- However, do note the following:
  - You cannot edit the exchange rate if the associated payments on the invoice have already been reconciled.
  - Editing the exchange rate will remove all associated payments and credit notes.
  - Editing the exchange rate is subject to account lock date restrictions, as described in [Lock Dates (COA)](https://help.jaz.ai/en/articles/9577112-lock-dates-coa)

**Q9. What formatting options are available in invoices?**

The Pretty Case feature allows you to easily format text fields within invoice transaction line items, ensuring consistency in text presentation according to your company's preferences.

Pretty Case offers four formatting styles:
- **Title Case**: Capitalizes the first letter of each word (e.g., "Office Supplies").
- **Sentence Case**: Capitalizes only the first letter of the first word (e.g., "Office supplies").
- **Lower Case**: Converts all text to lowercase (e.g., "office supplies").
- **Upper Case**: Converts all text to uppercase (e.g., "OFFICE SUPPLIES").

These options make it easy to standardize text formats across invoice item descriptions, unit fields, and other text-based fields.

**Q10. How to adjust GST/VAT in Invoices?**

- Click the GST/VAT amount in the totals section when editing an invoice transaction.

**Q11. Which transactions allow GST/VAT adjustments?**

- You can utilize GST/VAT adjustments for the following transactions:
  - Invoices
  - [Customer Credit Notes](https://help.jaz.ai/en/articles/9101355-edit-customer-credit)
  - [Bills](https://help.jaz.ai/en/articles/9104253-edit-bill)
  - [Supplier Credit Notes](https://help.jaz.ai/en/articles/9115435-edit-supplier-credit)

**Q12. What impact will GST/VAT adjustments have?**

- Adjustments affect the GST/VAT total and transaction total. All amounts in reports are impacted but not recorded in the ledger.

**Q13. Where can I see reports showing GST/VAT adjustments?**

- GST/VAT adjustments are shown in the "GST/VAT Adj. (Source)" and "GST/VAT Adj. (Notes)" columns in:
  - GST/VAT Ledger and related reports
  - Sales/Purchases Summary reports
    - Note: Adjustments are displayed in the item details column. No new adjustment columns are added to the Sales/Purchase Summary report.

**Q14. Can I bulk update or edit Invoices?**

- Yes, use Quick Fix to bulk update or edit invoices. It lets you edit multiple transactions or line items at once from the list view.
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

**Q15. Can I bulk update or edit line items in Invoices?**

- Yes, use Line Item Quick Fix to update multiple line items at once from the Active or Draft tabs in the Line Items list view.
- Select multiple items, then click Quick Fix from the bulk actions menu. You can update:
  - Description (with classifier support)
  - Quantity, Unit, Price, Discount
  - Account
  - VAT/GST Profile
- Smart locking ensures only unlocked fields are editable, reducing errors.

---

### Invoice Downloads
Source: https://help.jaz.ai/en/articles/9062708-invoice-downloads

**Q1. Can I download an active invoice PDF?**

- Yes, you can download the active invoice PDF from the invoice details.
- See below for an example of the downloaded file.

**Q2. Can I download a draft invoice estimate PDF?**

- Yes, you can download the estimate PDF from the draft invoice details.
- See below for an example of the downloaded file.

**Q3. Can I download an active invoice delivery slip PDF?**

- Yes, you can find the invoice delivery slip PDF on the invoice details screen.
- See below for an example of the downloaded PDF.

**Q4. Can I download the payment receipt PDF for an active payment?**

- Yes, you can download the payment receipt PDF from the active payment detail screen.
- See below for an example of the downloaded PDF.

**Q5. Can I customize the contents of any PDFs?**

- Yes, there are a couple of ways that this can be done:
  1. Via custom fields - See [Custom Fields](https://help.jaz.ai/en/articles/9066650-custom-fields) for more information.
  1. Adding a logo to your invoice - You can do this by setting a unique logo in[PDF Templates](https://help.jaz.ai/en/articles/10729638-pdf-templates#h_fccf644b35). Head over to **Settings > Templates > PDFs > Choose a Template > Header > Upload Logo.Q6. Will the downloaded PDF display amounts in the base currency or the currency of the invoice?**

- The downloaded PDF will display amounts in invoice currency.

---

### Saved Search (Invoices)
Source: https://help.jaz.ai/en/articles/11324601-saved-search-invoices

**Q1: What is Saved Search in Invoices?**

- Saved Search lets you store commonly used filters for faster access when working with Invoices

**Q2: What filters can I use in a Saved Search (Invoices)?**

- Saved Searches support:
  - Numeric ranges (e.g., amount ranges)
  - Date ranges (e.g., specific time periods)
  - Text filters (e.g., reference numbers, contact names)

**Q3: Can I edit or delete a Saved Search (Invoices)?**

- Yes. You can edit or delete Saved Searches using the same modal where you created them.

**Q4: Can I apply multiple Saved Searches at once?**

- No. Only one Saved Search can be active at a time. It behaves like a regular filter and cannot be edited inline or combined with other filters.

**Q5: Are there any rules when creating a Saved Search (Invoices)?**

- Yes. Filters must pass strict validations—no duplicate rules or invalid combinations are allowed during setup.

---

### View Invoice
Source: https://help.jaz.ai/en/articles/9095253-view-invoice

**Q1. Where can I view a created invoice?**

- A new bill will show up in **Active Invoices.**
- Click on an invoice to see its details.

**Q2. Can I search for invoices by customer name or invoice number?**

- Yes. Under **Invoices**, you can enter the customer name or invoice number in the**Search Bar**. Jaz will automatically filter out the relevant transactions for you.**Q3. Can I print or download a copy of the invoice for my records?**

- Yes, you can download an invoice PDF. Refer to [Invoice Downloads](https://help.jaz.ai/en/articles/9062708-invoice-downloads) for more information.​

**Q4. Is there a way to track the status of the invoice, such as if it's been sent or viewed by the recipient?**

- Jaz does not currently support read receipts for invoices sent out by email.

**Q5. Do invoices in Jaz include audit information?**

- Invoices in Jaz include the **Created By**fields to show who was the creator of the invoice, and the **Last Updated By**field to show the last editor of the invoice.
- Invoices that were previously submitted for approval will also have the **Submitted By**and **Approved By**fields.
- Click on **Show More**under **Invoice Details** to reveal the different fields.**Q6. Where can I find the exchange rate for an invoice with non-base currency?**

- To find the exchange rate for an invoice with non-base currency:
  - Hover on the currency ISO to show the exchange rate used for the invoice, relative to the base currency.
  - The exchange rate information will show the amount in the base currency, alongside the exchange rate information used.

**Q7. What happens if the exchange rate changes after I have viewed the invoice?**

- Any changes in exchange rates on an organizational level will not affect existing invoices that have already been created. Hence, existing invoices will not be affected.
- However, if you change the exchange rate of an existing transaction by editing the transaction directly, this will be reflected in the invoice the next time you view it.

**Q8. What is the lifecycle of an invoice? What different states or stages does it go through?**

| **Status** |**When does this status occur?** |
| --- | --- |
| Draft | When an invoice is saved as a draft. |
| For Approval | When an invoice is submitted for approval. |
| Payment Due | When an invoice is directly saved, converted to active from a draft, or approved. |
| Overdue | When an invoice has not been paid by the due date. |
| Partially Paid | When an invoice has only been partially paid for, either via a payment, or by applying customer credit. |
| Fully Paid | When an invoice has been fully paid off. |

---

### Void Invoice
Source: https://help.jaz.ai/en/articles/9094440-void-invoice

**Q1. Can I void an invoice?**

- Yes, you can void an invoice.
- Find the void option in the invoice details. Once done, you can find the voided records under the voided tab.

**Q2. Can I undo voiding an invoice?**

- No, voiding an invoice is permanent.

**Q3. Will voiding an invoice remove it from the application permanently?**

- No, voiding an invoice will not do this.
- However, [deleting an invoice](https://help.jaz.ai/en/articles/9094442-delete-invoice) will remove it from the application permanently.

**Q4. What happens to any payments/credit notes associated with an invoice after voiding?**

- Voiding an invoice will also delete all associated payment records.
- If you have applied any customer credit notes, the applied credit will be rolled back and unapplied.

**Q5. Will voiding an invoice affect my financial reports?**

- Yes, voiding an invoice will affect your financial reports.
- You may see a change in how different parts of your financial reports are calculated, due to the now voided transaction and removal of associated payments.
- Here's how your financial records and reports may be affected:
  - **Trial Balance -**The debit and credit amounts of your accounts (especially Accounts Receivable) will be adjusted.
  - **Balance Sheet -**The total amounts of accounts previously used in the invoice and related payments may have changed.
  - **Profit & Loss -**The overall net profit amount may change as you might see changes to amounts in operating revenue and expense accounts.
  - **Cashflow -**Opening and Ending cash balances may be affected.
  - **Ledger -**The voided invoice will have its transaction record removed from the ledger.

**Q6. Can I add a note/explanation while voiding an invoice?**

- Yes, you can. When voiding an invoice, a pop-up box will show up.
- Other than confirming you want to void the invoice, you can also add **internal notes**at this stage for your team to view.
- The void notes will show up on the voided invoice as shown below.

**Q7. Can I void multiple transactions?**

- Yes. Voiding multiple transactions applies for the following transaction status
  - Active transactions
  - Balance Due (only for Invoices and Bills)
- Select multiple transactions you want to void by ticking the checkboxes.
- Adding a void note applies to all selected transactions.

---

### Bulk Invoice Payments
Source: https://help.jaz.ai/en/articles/9992843-bulk-invoice-payments

**Q1. Can I record payments for multiple invoices at once?**

- Yes, use the Bulk Payment or Batch Payment features on Jaz to record payments for multiple invoices in 1 go.
- Select the desired balance due invoices to use the bulk or batch payment.

**
Q2: Can I make bulk payments for invoices in different currencies?**

- Yes, you can select and pay invoices in various currencies simultaneously.
- All the payments will be recorded in the selected payment account currency.

**Q3. What is the difference between Bulk Payments and Batch Payments?**

- Bulk and Batch Payments both create a separate payment for each transaction and support partial, split, and cross-currency amounts. They only differ in bank reconciliation:
  - **Bulk Payments:** Each payment appears as a separate cashflow record
  - **Batch Payments:** Payments in the batch are aggregated into a single cashflow record**Q4. Can I partially pay invoices during bulk/batch payments?**

- Yes, you can do partial payments during bulk/batch payments, by updating the invoice payment amount.

**Q5. Payments created from the bulk/batch payment flow are created in which currency?**

- The payment currency will depend on the selected payment account's currency.
- So, irrespective of the selected invoice currencies, all the payment currencies will be the same as the payment account currency.

**Q6. Is there a way to autofill the cash received equivalent to the invoice payment amount during bulk/batch payment?**

- Yes, use the bulk/batch auto-fill feature to calculate the cash equivalent of the invoice payment amounts to the payment amounts in the payment accounts currency.
- Alternatively, you can autofill the cash equivalent for each payment record
- You can also set a custom rate for just a single payment record.

**Q7. Can I add transaction fees while bulk/batch payments?**

- Yes, like the normal payments flow you can add transaction fees during bulk/batch payment creation flow. Refer to [transaction fee](https://help.jaz.ai/en/articles/9306133-transaction-fees-invoice-payments) for more info.

**Q8. Is RGL calculated during bulk/batch payments?**

- Yes, like the normal payments flow if a payment is recorded in non-base currency, RGL can occur. Refer [When does realized FX gain-loss (RGL) happen, and how is it calculated?](https://help.jaz.ai/en/articles/9062327-record-invoice-payments#h_6ddd4e757d)

**Q9. Is there a limit to the number of invoices I can pay at once?**

- Yes, you can only select records on a single page. If the page size is set to 200, you can select up to 200 invoices to create bulk payments. The current maximum page size is 500 records.

**Q10. Can I record overpayments from the invoice bulk/batch payment flow?**

- No, you cannot record overpayments. Jaz will prevent you from entering a payment amount that is greater than the balance due on the invoice.

**Q11. How do I edit a recorded bulk/batch payment?**

- Find the payment record (either from the payments tab / find the invoice against which the payment is recorded) and edit the details as needed.

**Q12. Why are there separate columns for "Payment" and "Cash Received"?**

- The "Payment" column reflects the invoice's original amount due in its designated currency.
- The "Cash Received" column allows you to record the actual amount received, which might differ due to exchange rate fluctuations in multi-currency scenarios.

**Q13. Can I view the total cash received during the bulk/batch payment?**

- Yes, you can view the total cash received during the bulk payment flow. The total cash received will be in the payment account currency.

**Q14. Is bulk payment the same as batch payment?**

- No, bulk payments create 1 payment record for all the selected invoices.
- Batch payments create a single payment for all the selected invoices.

---

### Delete Invoice Payments
Source: https://help.jaz.ai/en/articles/9094448-delete-invoice-payments

**Q1. Can I delete an invoice payment record?**

- Yes, you can delete a bill payment record.
- After deleting a payment, the payment details and status on the associated bill will be automatically updated.
- **Note**: If a payment is marked as deleted, you will not be able to undo the action or retrieve the deleted payment record.
​

**Q2. Will deleting my payments affect my financial reports?**

- Yes, deleting payments will affect your organization's financial position. This change will be reflected in different financial reports available on Jaz.
- Here's how your financial records and reports may be affected:
  - **Trial Balance -**The debit and credit amounts of your accounts will be adjusted. Specifically, the **debit**record from the **Accounts Receivables**account will be removed.
  - **Balance Sheet -**The total amounts of accounts previously used in the invoice and related payments may have changed.
  - **Profit & Loss -**The overall net profit amount may change as you might see changes to amounts in operating revenue and expense accounts.
  - **Cashflow -**Opening and Ending cash balances may be affected.
  - **Ledger -**The deleted payment will have its record removed from the ledger.

**Q3. Can I add a note/explanation while deleting a payment?**

- Jaz currently does not support adding notes/explanations while deleting a payment.
- You will be prompted to delete the payment right away.

**Q4. What happens to an invoice if a payment associated with it is deleted?**

- If a payment associated with the invoice is deleted, the invoice status will change back to **Payment Due**if the invoice is not yet due, or **Overdue**if the invoice has already passed its due date.
- This is because the invoice is now missing payments that would mark it as completely paid.

**Q5. Can I delete partial payments or only full payments?**

- You can delete all types of payments on an invoice.

---

### Edit Invoice Payments
Source: https://help.jaz.ai/en/articles/9094447-edit-invoice-payments

**Q1. Can I edit an invoice payment record?**

- Yes, you can edit an invoice payment record.

**Q2. Will the payment receipt get regenerated again after editing?**

- Yes, the payment receipt will be automatically updated upon amendment of the payment record.
- **Tip**: Having an issue where changes are not reflected on the payment receipt? Do allow 2 minutes for the system to refresh before attempting to download them again.**Q3. Does editing a payment affect financial records? **

- Yes, editing a payment will affect your financial records if the fields affecting the payment amount are updated.
- For example, the payment record on the General Ledger will have the payment amount updated with the new payment amount.
- Hence, other reports that rely on the General Ledger such as Trial Balances or Cashflows will also see updates following this.

**Q4. Can I edit an invoice payment even if it's in non-base currency?**

- Yes, an invoice payment's currency will not affect this.

**Q5. Are there any restrictions on how many times I can edit an invoice payment?**

- No, there are no restrictions. You can edit an invoice payment as many times as you need to.

**Q6. What fields can I modify while editing an invoice payment?**

- There are no restrictions on the fields that you can modify while editing.

---

### Record Invoice Payments
Source: https://help.jaz.ai/en/articles/9062327-record-invoice-payments

**Q1. How can I add a new payment method type?**

- You cannot add a new payment method type for payments.

**Q2. Can I download a payment receipt?**

- Yes, you can download the payment advice. Refer to [Invoice Downloads](https://help.jaz.ai/en/articles/9062708-invoice-downloads) for more information.

**Q3. How do I record a payment for an invoice?**

- To record an invoice payment, there are a few ways you can do so:
  1. During invoice creation
    1. The price must be filled in for at least one line item for this option to be available.
    1. If the invoice was saved as a draft, any associated payments will also be in a draft status.
    1. After saving the invoice , the payment will be active, and show up in the **Sales > Payments > Active** tab.
  1. After invoice creation
    1. You can create an invoice payment after invoice creation from the invoice details.

**Q4. Can I record a partial payment for an invoice?**

- Yes, you can. When recording a payment for an invoice, if the **Invoice Payment Amount**is less than the invoice transaction amount, the invoice would be considered to be partially paid.

**Q5. What happens if I receive a payment in a different currency than the invoice?**

- If there is a difference between the transaction amount converted to base currency and the payment amount converted to base currency, realized gain-loss will take place.  This is further explained in [Q7. When does realized gain-loss (RGL) happen, and how is it calculated?](#h_6ddd4e757d)

**Q6. Where is the payment rate fetched from if the currencies don't match? Can I edit it?**

- If the payment currency does not match the invoice currency, there is a possibility of a realized gain/loss due to the fluctuations in the exchange rates.
- Jaz fetches a custom rate if available on the date of the payment. If not, the rate is fetched from 3rd party services.
- You can also adjust the payment rate if the one fetched by Jaz is not the rate you want to use for the payment.

**Q7. When does realized FX gain-loss (RGL) happen, and how is it calculated?**

- RGL happens when the following conditions are fulfilled:
1. There is a difference between the invoice payment amount converted to the organization's base currency and the cash received converted to the organization's base currency.
1. The following invoice payment/cash received currency combinations take place:

| **Invoice payment currency** |**Cash received currency (Actual cash received from customer/clients)** | **Is there RGL?** |
| --- | --- | --- |
| Organization's base currency (e.g. SGD) | Non-base currency (e.g. USD) | Yes |
| Non-base currency (e.g. USD) | Organization's base currency (e.g. SGD) | Yes |
| Non-base currency (e.g. USD) | Non-base currency (e.g. USD) | Yes |
| Non-base currency (e.g. USD) | Non-base currency (e.g. EUR) | Yes |
| Organization's base currency (e.g. SGD) | Organization's base currency (e.g. SGD) | No |

- RGL is calculated this way for an invoice payment:
  - **Realized FX (Gain)/Loss = (Invoice payment Amount / Transaction Rate) - (Cash received / Payment Rate)**
  - Where:
    - Invoice payment amount: The amount recorded as paid for on an invoice
      - This amount may be the entire invoice amount, or a partial payment for the invoice.
    - Transaction rate: The exchange rate on the invoice (1.00 if the invoice is in the base currency)
    - Cash received: The amount received (cash received) for the recorded invoice payment
      - The invoice payment amount will be equal to the cash received amount if the invoice and payment account are in the same currency.
    - Payment rate: The exchange rate for the payment (1.00 if the payment is in the base currency)

- FX gains are recorded as **negative expenses**, while losses are recorded as**positive expenses** to the **FX Realized (Gains)/Loss**account.

- In other words,
  - **FX gains** are recorded if the invoice payment amount in base currency is**less than** the cash received in base currency at the exchange rate on payment date.
  - **FX losses**are recorded if the invoice payment amount in base currency is **greater than** the cash received in base currency at the exchange rate on payment date.

- Example 1 - The invoice payment is recorded in EUR, payment received in USD and the organization’s base currency is in SGD:
  - Invoice payment amount: 55.00 EUR
  - Transaction Rate: 1.00 SGD = 0.68413 EUR
  - Cash received: 65.00 USD
  - Payment rate: 1.00 SGD = 0.74338 USD
  - Hence, in this case:
    - **Realized Gain**- (**7.04 SGD)= (55.00 / 0.68413) - (65.00 / 0.74338)**

- Example 2 - The invoice payment is recorded in USD, payment received in SGD and the organization’s base currency is in SGD:
  - Invoice payment amount: 55.00 USD
  - Transaction Rate: 1.00 SGD = 0.74338 USD
  - Cash received: 70.00 SGD
  - Payment rate: 1.00 SGD = 1.00 SGD (Since SGD is the base currency)
  - Hence, in this case:
    - **Realized Loss - 3.99 SGD =  (55.00 / 0.74338) - (70.00 / 1.00)Q8. How can I send a payment receipt to my customer?**

- To send a payment receipt, make sure that your customer has a valid email set up in contact settings.
- After doing so, click on the **mail icon**to send a payment receipt to your customer after saving the payment record.

**Q9. What is a Withholding Tax Certificate payment? How is it different from other payments?**

- The withholding tax Certificate payment method refers to a withholding tax payment recorded for an invoice.
- This refers to the tax that needs to be withheld and paid to the government, rather than credited to your organization directly.
- For invoices, payments made via this payment method will always be credited to the **Creditable Withholding Tax**payment account.

**Q10. How will deleting a tax profile impact my payment records?**

- Deleting a tax profile will not have an impact on any payments that have already been made and recorded.
- However, you will not be able to select the deleted tax profile moving forward on invoice creation, which may have effects on pre and post-tax calculations.

**Q11. How will making an account inactive impact my payment records?**

- Making an account inactive will not have an impact on any payments that have already been made and recorded.
- However, you will not be able to select the inactive account as a payment account (in the case of cash and bank accounts) moving forward, until the account is active again.

**Q12. I just received a payment for an active invoice, but I don't see it in my Accounts Receivable. What happened?**

- If a payment has been recorded as received for the invoice on the same date as the invoice date (i.e. payment date = invoice date), the transaction will be recorded on the ledger as a cash transaction.
- The transaction will be recorded as a **credit**into the **Cash on Hand**account, and a **debit** from the account used on the invoice.

---

### Transaction Fees (Invoice payments)
Source: https://help.jaz.ai/en/articles/9306133-transaction-fees-invoice-payments

**Q1. Can I record transaction fees for invoice payments on Jaz?**

- Yes, you can. When recording a payment for an invoice, you will find an option to add transaction fees.
- You can record transaction fees in absolute amounts or as a percentage of the cash received.

**Q2. What can I use the transaction fee option on invoice payments for?**

- The transaction fee option might be useful in some scenarios such as:
  - Your payment provider charges you a fee when you receive funds from your customers.

**Q3. What happens when a transaction fee is recorded?**

- When you record a transaction fee for an invoice payment, the transaction fee charged is deducted from the **Cash Received** amount, giving**Net Cash Received.**
- On the invoice details, the payment amount shown in the invoice total summary will reflect the **Gross Cash Received**or the cash received before fees**.Q4. How does recording GST/VAT work for transaction fees?**

- You can add a VAT/GST included in the fee.
- You just need to select a tax profile and Jaz will calculate the actual fees and the included GST/VAT.

**Q6. How are transaction fees reflected on the general ledger?**

- On the general ledger, you should see a record reflecting the transaction fees charged under the expense account (e.g. **Transaction Fees & Charges**) that you have selected when recording a transaction fee.
- If you have added **GST/VAT included** in the transaction fees, you should see an additional record for the included GST/VAT under the**Input GST Receivable **account.

---

### View Invoice Payments
Source: https://help.jaz.ai/en/articles/9094445-view-invoice-payments

**Q1. Where can I view past payment records of an invoice?**

- All the payments made on a invoice can be found in the invoice details.

**Q2. How do I know if there is an aggregate RGL displayed on the invoice?**

- Aggregate RGL may apply if multiple partial payments are being made on the invoice.

**Q3. Will I be able to see a list of all the payments or just 1 complete payment on the invoice?**

- You will be able to see a list of all payments made with the invoice details.

**Q4. Why is the payment receipt in the same currency as the invoice?**

- Payments will always be recorded and tracked on the invoice currency.

---
