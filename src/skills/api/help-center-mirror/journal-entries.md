### Capsule Recipes
Source: https://help.jaz.ai/en/articles/15372399-capsule-recipes

**Q1. What is a Capsule Recipe?**

- A Capsule Recipe turns a transaction into a complete schedule of future journal entries. Jaz calculates the amounts, dates, and debits/credits automatically and posts each entry on its scheduled date.
- All entries are grouped under one capsule, so the original transaction and every scheduled entry stay connected in one place.
- This is useful for accounting events that span multiple periods. For example, a 12-month prepaid rent paid in full today but expense is spread and recognized monthly.

**Q2. How do I create a Capsule Recipe?**

- Start creating or editing a supported transaction (Invoice, Bill, Journal, or Direct Cash In).
- Click on the capsule icon for each transaction
  - Invoice/Bill
​

  - Journal
​

  - Direct Cash In
​

- Choose to attach a recipe instead of a plain capsule.
- Select a recipe.
- Fill in the required fields. Amount and currency are pre-filled from the transaction.
- Review the live preview. Every scheduled entry, date, and total is shown before anything posts.
- Save the transaction to create the recipe transactions.
  - Note: After saving, the Background Activity panel shows progress as Jaz builds the schedule. Each entry then posts automatically on its date.
- Your capsule will now be saved and accessible in **Data Reports** →**Capsule**.**Q3. What is a blueprint preview?**

- The preview is a live summary of the full schedule. It shows every scheduled entry, its date, and the totals before you save. Nothing posts until you save the transaction.
- Use the preview to verify the schedule is correct, including any rounding notes.

**Q4. What are the available Capsule Recipes?**

| **Capsule Recipe** |**Available In** |
| --- | --- |
| Loan Amortization | Journal, Direct Cash In |
| Prepaid Amortization | Bills |
| Deferred Revenue | Invoices |
| IFRS 16 Lease | Journal |
| Accrual & Reversal | Journal |

**Q5. How does Loan Amortization recipe work?**

- Loan Amortization schedules a monthly journal for principal and interest until a fixed-rate loan is fully repaid. It uses the effective-interest method, so interest is higher in early periods and decreases over time.
- Use this recipe when the organization has taken a fixed-rate loan and wants the full repayment schedule booked automatically.
- Available in Journal and Direct Cash In transactions.
- Each monthly entry:

| **Line** |**Dr / Cr** | **Account** |
| --- | --- | --- |
| Principal | Dr | Loan Liability |
| Interest | Dr | Interest Expense |
| Cash | Cr | Cash / Bank |

- Note: The principal and interest split changes every month; the cash total stays the same. The final month closes the remaining balance to exactly zero.
- Fields:
  - Required
    - Annual Rate (%)
    - Term (months)
    - First Payment Date
    - Loan Liability Account
    - Interest Expense Account
    - Cash / Bank Account
  - Optional
    - Loan Reference
  - Auto-filled
    - Principal and Currency

**Q6. How does Prepaid Amortization recipe work?**

- Prepaid Amortization spreads a prepaid expense across future periods. It splits the amount equally by default and switches to day-based pro-rata when coverage dates are supplied.
- Use this recipe when the organization paid for something in advance (annual insurance, prepaid rent) and the cost should be recognized gradually.
- Available in Bills only.
- Each period entry:

| **Dr / Cr** |**Account** |
| --- | --- |
| Dr | Expense |
| Cr | Prepaid Asset |

- Fields:
  - Required
    - Periods (2 or more)
    - Frequency (monthly or quarterly)
    - First Amortization Date
    - Prepaid Asset Account
    - Expense Account
  - Optional
    - Coverage Start Date
    - Coverage End Date (both required to enable pro-rata)
    - Source Reference
  - Auto-filled
    - Total amount
    - Currency

**Q7. How does Deferred Revenue recipe work?**

- Deferred Revenue releases upfront-billed revenue into the periods in which it is earned. It supports straight-line or day-based pro-rata splitting, similar to Prepaid Amortization.
- Use this recipe when the organization billed a service in advance (annual subscription) and revenue should be recognized period by period.
- Available in Invoices only.
- Each period entry:

| **Dr / Cr** |**Account** |
| --- | --- |
| Dr | Deferred Revenue |
| Cr | Revenue |

- Fields:
  - Required
    - Periods (1 or more)
    - Frequency (monthly or quarterly)
    - First Recognition Date
    - Deferred Revenue Account
    - Revenue Account
  - Optional
    - Coverage Start Date
    - Coverage End Date (both required to enable pro-rata)
    - Source Reference
  - Auto-filled
    - Total amount
    - Currency
- Note: Deferred Revenue assumes a single performance obligation. For contracts with multiple distinct obligations, set up a separate recipe per obligation.

**Q8. How does IFRS 16 Lease work?**

- IFRS 16 Lease handles the full life of a lease across four accounting stages: initial recognition, monthly payments, monthly **Right-of-Use (ROU)** depreciation, and the annual reclassification of the upcoming 12 months of liability from non-current to current.
- Use this recipe when the organization leases an asset (vehicle, equipment, property) and needs full IFRS 16 lease accounting over the term.
- Available in Journal transactions only.
- Accounting stages:

| **Stage** |**Entry** |
| --- | --- |
| Recognition (once, at start) | Dr ROU Asset; Cr Lease Liability (current and non-current) |
| Payment (each period) | Dr Lease Liability (principal); Dr Interest Expense; Cr Cash |
| Depreciation (each period) | Dr Depreciation Expense; Cr Accumulated Depreciation |
| Annual Reclass | Dr Lease Liability non-current; Cr Lease Liability current |

- Fields:
  - Required
    - Lease Term (months)
    - Discount Rate (%)
    - ROU Asset Account
    - ROU Accumulated Depreciation Account
    - Current Lease Liability Account
    - Non-Current Lease Liability Account
    - Interest Account
    - Depreciation Account
    - Cash / Bank Account
  - Optional
    - Payment Timing (arrears or advance; default is arrears)
    - Lease Reference
  - Auto-filled
    - Monthly payment
    - Commencement date
    - Currency

**Q9. How does Accrual & Reversal work?**

- Accrual & Reversal records an estimated cost at period-end and automatically reverses it on the first day of the next period, so the real invoice is not double-counted when it arrives.
- Use this recipe when the organization needs month-end accruals for costs that are known but unbilled (utilities, services).
- Available in Journal transactions only.
- Per period:

| **Step** |**Entry** |
| --- | --- |
| Accrual (period-end) | Dr Expense; Cr Accrued Liability |
| Reversal (day 1 of next period) | Dr Accrued Liability; Cr Expense |

- Fields:
  - Required
    - Periods
    - Accrual Frequency (monthly or quarterly)
    - Expense Account
    - Accrued Liability Account
  - Optional
    - Amount Per Period (%)
    - Estimation Basis
    - Source Reference
  - Auto-filled
    - First Accrual Date
    - Total amount
    - Currency

**Q10. What is the difference between straight-line and pro-rata?**

- Straight-line splits the total amount equally across all periods. Pro-rata splits it based on the actual number of days in each period.
- Pro-rata applies to Prepaid Amortization and Deferred Revenue only, and activates when both a Coverage Start Date and Coverage End Date are supplied. Leave the coverage dates blank for an equal split.

**Q11. What happens when the amount does not divide evenly?**

- Jaz gives each regular period a clean rounded amount and lets the final period absorb the small remainder, so the schedule always sums to exactly the original total. The preview shows a note whenever this applies (for example, "Final period absorbs SGD 0.01 rounding").
- This applies to Prepaid Amortization, Deferred Revenue, and IFRS 16 Right-of-Use (ROU) depreciation.

**Q12. Can I customize the labels and descriptions a recipe generates?**

- Yes. The optional **Customize Recipe** step lets you edit:
  - The capsule title and description
  - The posts label on each scheduled entry
  - The per-line descriptions in the journal (Loan Amortization and IFRS 16 Lease)
  - The schedule reference shown in the Schedules tab
  - Leave fields blank
- You can insert auto-filling placeholders (such as the reference, amount, or period number), remove optional text entirely, or reset everything to the default wording.

**Q13. Can I edit or undo a recipe after saving?**

- The blueprint preview is the place to verify the schedule before committing. Once saved, there is no in-app edit or undo option for a posted capsule. If a correction is needed after posting, contact support.

**Q14. Can I delete a capsule created by a recipe?**

- Yes, but the capsule must be empty before it can be deleted. To do this, go to **Reports** →**Capsules** → open the **capsule** →**void or deactivate all transactions **inside it first.
- Once empty, the Delete option becomes available.
- If you want to keep the transactions, you can move them to another capsule before deleting.

**Q15. What happens if the recipe build fails?**

- If something goes wrong during the build, Jaz automatically rolls back any entries already created. The books are never left partially updated. Correct the inputs and run the recipe again.

**Q16. Why does the IFRS 16 Lease recipe require two liability accounts?**

- Under IFRS 16, a lease liability must be split into two portions: the amount due within the next 12 months (current) and the amount due beyond that (non-current). Jaz books both at the start of the lease and moves the upcoming 12 months from non-current to current once a year. This is the Annual Reclass stage.
- Both accounts are required regardless of lease length to keep the split consistent.

**Q17. Can a recipe run across multiple currencies?**

- No. Each recipe runs in a single currency, taken automatically from the base transaction. For a multi-currency arrangement, set up separate recipes per currency.

---

### Journals
Source: https://help.jaz.ai/en/articles/8937999-journals

**Q1. How can I add GST to a journal?**

- Yes, irrespective of the journal currency you can control if the journal will have tax using the "GST Settings" -
  - **No GST** - The "Tax Profile" field will be hidden in the journal entry lines.
  - **Included in Amount** - Tax will be factored into your journal line entry amount, and you can choose a tax profile in the journal entry line for calculation.
  - **Excluded in Amount****- Tax will not be included in the journal line entry amount but will be applied separately. You can choose a tax profile for calculation.

**Q2. Which accounts do not have tax profiles applicable?**

- Bank Accounts
- Cash
- Current Assets
- Shareholders Equity
- Operating Expense
- Current Liabilities

**Q3. Will the internal notes added in a journal reflect on the journal PDF?**

- You can add some internal notes to your journal. These notes will be printed on the journal PDF.

**Q4. Is there a limit to how many journal entry lines I can add to a journal?**

- No, there is no limit to the number of journal entry lines you can add.

**Q5. What is the minimum number of journal entry lines required to create a journal?**

- A minimum of 2 journal entry lines are required to create a journal with equal debit & credit amounts.
- In Jaz, you cannot delete the journal entry lines when only 2 are remaining.

**Q6. Can I arrange (sort) my journal entry lines?**

You can arrange (sort) your journal entries by:
- Account Code: Smallest to Largest or Largest to Smallest.
- Debits/Credits: Smallest to Largest or Largest to Smallest.

**Note:** This also applies to [Scheduled Journals](https://help.jaz.ai/en/articles/9138832-scheduled-journals).**Q7. What are the different types of Journals in Jaz?**

- Manual Journals - A journal record of non-payment accounts.
- Cash Journals - A journal record with at least 1 journal entry line having a bank account
- Transfer Journals -**A Transfer Trial Balance journal record.**Refer to [Transfer Trial Balance](https://help.jaz.ai/en/articles/9094240-transfer-trial-balance) for more information.**Q8. What is the life cycle of a Journal in Jaz? **

- The following life cycle applies to -
  - Manual Journal
  - Cash Journal

| **Status** |**Happens when** | **Impact on Financial Statements** |**Applies to Journal Type** |
| --- | --- | --- | --- |
| Draft | All the required information is added & saved, but it needs to be reviewed once before turning to active. | Not recorded in the ledger. | Manual JournalsCash Journals |
| Recorded | The draft journal is converted to active. | Recorded in the ledger. | Manual JournalsCash JournalsTransfer Journals |
| Voided | The active journal is voided | The record from the ledger is deleted. | Manual JournalsCash JournalsTransfer Journals |

**Q9. How can I set an exchange rate for a non-base payment account used in a base journal?**

- Click on the debit/credit cell of the journal line to open the "Convert Amount" modal.
- Enter the debit/credit amount in the non-base payment currency.
- An exchange rate if set at the organization level is present will be fetched used OR the current rate from ECB will be fetched.
  - You can update the rate if required.
- Jaz will automatically convert the debit/credit amount into the organization's base currency using the exchange rate.

**Q10. How can I download the journal voucher?**

- Open the journal details modal and click on the PDF icon to download the journal voucher.

**Q11. Is any audit information captured for journals? If yes, what is captured?**

- Yes, Jaz captures the following audit fields:
  - **Created By** - shows the author of the journal
  - **Last Updated By**- shows the user who last updated the journal entry

**Q12. Can I bulk import journals in Jaz?**

- Yes, bulk importing journals is easy. For more information, refer to: [Import Journals](https://help.jaz.ai/en/articles/9115784-import-journals)

**Q13. Why can I record only 2 lines in a cash journal?**

- A cash journal is a record of cash transfers between 2 payment accounts of cash/bank account types. Hence, on Jaz by default, the cash journal template is customized to make the cash journal creation easy and quick.

**Q14. Can I record cash transfers between bank accounts of different currencies?**

- Yes, just select the bank account you're transferring the cash from and the bank account you're transferring it to along with the amounts in the respective bank account's currencies.
- For a foreign currency bank account you can set an exchange rate otherwise Jaz fetches the latest rate from 3rd party or uses any custom rate set by you at the organization level.

**Q15. What is the 'Transfer Rate' in cash journals?**

- The transfer rate in the cash journal indicates the rate at which the cash-in and cash-out amounts are exchanged.
- For example, if the Cash-out amount is 100 SGD and the Cash-in amount is 150 EUR, the Transfer rate is calculated as 1 SGD = 150/100 EUR
- Final Transfer rate: 1 SGD = 1.5 EUR

**Q16. How are the cash-in/cash-out amounts converted to base currency in cash journals since Jaz does not ask for any exchange rates?**

- The rules for the FX rate conversions for cash journals are simple in Jaz -
  - If either cash-in/cash-out amount is in the organization's base currency it is kept as-is and is used to derive the FX rate for the other amount if required.
  - If both cash-in & cash-out amounts are in non-base currency, Jaz fetches the FX rate for the cash-out amount and converts it to base currency which is then used to derive the FX rate for the cash-in amount and used to convert to the base currency.
- Let's take a few examples to understand this further. Assume your organization's base currency is SGD
  -

Scenario I

    - Cash-out amount = 100 USD
    - Cash-in amount = 150 EUR
      - Jaz will fetch the FX rate to convert USD to SGD either from your custom org rate list or from 3rd party. Let's assume the org custom exchange rate is 1USD = 1.34SGD
      - **Cash-out** amount in SGD = 100*1.34 SGD =**134 SGD**
      - Now, to convert the Cash-in amount to SGD, Jaz will derive the FX rate from the converted cash-out amount above.
      - FX rate for cash-in = Cash-out amount in SGD/Cash-in amount in non-base currency
        - 134/150 = 0.8933
      - If you were to now convert the **Cash-in** amount of 150 EUR to SGD per the above FX rate it would be = 150*0.8933 =**134 SGD**
      - Cash-out = Cash-in = 134 SGD
  -

**Scenario II**

    - Cash-out amount = 100 SGD
    - Cash-in amount = 150 EUR
      - Since the cash-out amount is already in base currency, there is no need to fetch FX rates.
      - Jaz will directly calculate the FX rate for the cash-in amount from the cash-out amount
      - FX rate for cash-in amount = 100/150 = 0.6667
      - Converting the cash-in amount to base currency will match the cash-out amount in base currency.
      - Cash-out = Cash-in = 100 SGD
  -

**Scenario III**

    - Cash-out amount = 100 EUR
    - Cash-in amount = 150 SGD
      - Jaz will directly calculate the FX rate for the cash-out amount from the cash-in amount
        - FX rate for cash-out amount = 150/100 = 1.5
      - Converting the cash-out amount to base currency will match the cash-in amount in base currency.
      - Cash-out = Cash-in = 150 SGD

**Q17. Where can I find the FX rates for cash transfer journals?**

- Once you have saved the cash transfer journal, open the journal record and find the FX icon against the amounts in the debits/credits column to get the used rates.

**Q18. Can I still use payment accounts in journals?**

- Yes! You can still use any account from your chart of accounts list to create a journal entry.

**Q19. Can I create a Journal in non-base currency?**

- Yes! A journal entry can be created in a non-base currency as well.
- Click on the currency displayed in the Debit/Credit column headers to update the currency & set the exchange rate if required.
- By default, Jaz uses an exchange rate set at the organization level. If there is none, a third-party rate is applied. You can adjust the rate by clicking the pencil icon.

**Q20. Why can't I select multi-currency bank accounts in a non-base journal?**

- In a non-base journal, you can only select bank accounts that match the journal's currency. This is because, Jaz converts the non-base journal amounts to base currency using the exchange rate set at the journal level.
- Hence, Jaz restricts selection of the accounts which do not match the Journal currency.
- If you would like to create a journal with multi-currency bank accounts, please set the journal currency to the base currency or use of "[Cash Transfer](#h_98c01907a8)" journals.

**Q21. Why can't I see all the accounts in a non-base journal?**

- System Generate Accounts are not available in a non-base journals.
- If you wish to create entries in these accounts you can create a journal in base currency.

**Q22. Where can I find the used FX rate for a non-base journal?**

- To find the exchange rate for a Journal with non-base currency:
  - Hover on the currency ISO to show the exchange rate used for the journal, relative to the base currency.
  - The exchange rate information will show the amount in the base currency, alongside the exchange rate information used.

**Q23. Where can I access the customization settings for auto-generated journal reference formatting?**

- Head over to Journals > New Journal > Click the gear icon in the Journal Reference field.

**Q24. What is the default format for the auto-generated journal references?**

- The default format is J-{counter} (e.g., J-01, J-02, J-03, etc.). It does not include any date elements.
​
Note: Auto-generated journal references are only for manual journals.

**Q25. Can I customize the format of the auto-generated journal references?**

- Yes, you can configure the prefix, separator, series start, and offset to suit your needs.

---

### Manage Journals
Source: https://help.jaz.ai/en/articles/9104885-manage-journals

**Q1. Can I edit/duplicate/void a journal?**

- Yes, you can edit/duplicate/void a journal.
- The options can be found in the 3 dot menu.

**Q2. Which journal types can I edit?**

Jaz allows editing for the following journal types:
- Manual Journals
- Cash Journals

The following journal type cannot be edited:
- Transfer Journals

**Q3. Which journal types can I duplicate?**

Jaz allows duplication for the following journal types:
- Manual Journals
- Cash Journals
- Transfer Journals

**Q4. What happens if I add/remove a payment account from a journal?**

- If the journal was manual, adding a payment account will classify it as a **Cash Journal.**
- If it was a cash journal, removing a payment account will classify it as a **Manual Journal.Q5. Can I duplicate a voided journal?**

- You can duplicate a voided Transfer journal.
- You cannot duplicate a voided Cash and Manual journal.

---

### Scheduled Journals
Source: https://help.jaz.ai/en/articles/9138832-scheduled-journals

**Q1. How do I set up a scheduled journal in Jaz?**

- Click on **Scheduler > Journals**to access the **Scheduled Journals**page.
- Click on **New Schedule**to schedule a journal.
- Fill in the different details needed for the scheduled journal.

**Q2. What types of scheduled journals can I create?**

- You can create scheduled manual & cash journals.
- Scheduled Manual Journals are created when you do not select any bank/cash accounts in the journal entries
- Scheduled Cash journals are created when you select at least 1 bank/cash account in the journal entries.

**Q3. Can I choose the start, and end date of the schedule?**

- Yes. You can choose the start date by modifying the **Schedule Date**, and choose the end date by modifying the**End Date** when setting up the schedule details.

**Q4. How can I set the frequency of a schedule?**

- You can set the frequency of a schedule by adjusting the Repeat field and End Date field.
- Currently, Jaz allows frequencies of:
  - Does not repeat (This means that the invoice will only be scheduled to be sent out once.)
  - Daily
  - Weekly
  - Monthly
  - Quarterly
  - Yearly
- The End Date can be set manually or automatically using the Autofill End Date function.

**Q5. Will the scheduled journal be automatically created on the scheduled date?**

- Yes, no further action from you is required. Jaz will handle the creation of the scheduled journal on the scheduled date.

**Q6. What happens if I need to make changes to the scheduled journals before it's created?**

- If you need to make changes to the scheduled journals before its created, you can edit it by clicking on the journal that you'd like to modify.
- You will be able to see the previously created journal details and make any edits that you need.

**Q7. Can I include all the necessary details in the scheduled journal, like accounts, debit & credit & amounts?**

- Yes, you can fill up the different details just like when creating a normal journal.

**Q8. Can I set an exchange rate for cross-currency payment accounts?**

- Yes, you can. First, select a payment account that is different from your base currency. For example, if your base currency is SGD, select a USD account.
- Click on the debit or credit field for the journal entry of the cross-currency account, depending on what you would like to enter.
- A **Convert Amount**modal will show, and you will be able to set the exchange rate for the cross-currency payment.

**Q9. What happens if I have not set a custom exchange rate for cross-currency payment accounts?**

- Jaz requires that you set an exchange rate for the cross-currency payment.
- You will not be able to save the journal schedule if you do not have an exchange rate set.

**Q10. Can I create a non-base scheduled journal?**

- Yes, you can create a scheduled journal in the currency of your choice.
- Set the journal currency by clicking on the currency ISO in the debit/credit headers.
  - You can set a fixed rate to be used for every journal by clicking on the pencil icon OR Jaz will automatically use the available rate  on the day(s) the schedule runs, fetched from the organization rates or 3rd party.

**Q11. Where can I view the FX rate used in a non-base scheduled journal?**

- The FX rate set for the scheduled journal can be found on the schedules view screen and hovering over the currency ISO.

**Q12. Will I receive a notification whenever a journal is created from a schedule?**

- Jaz currently does not support notifications whenever a journal is created from a schedule.

**Q13. Is there a limit to the number of scheduled journals I can create?**

- There are currently no limits to the number of scheduled journals you can create on Jaz.

**Q14. Can I create a schedule with start & end date in the past?**

- Yes, you can create a schedule with start and end dates in the past.
- After creating the schedule, the schedule will immediately run, and the journal will be immediately created.

**Q15. What happens if I update the schedule after it has already run several times?**

- Updating a schedule will have no impact on previously created journals from the schedule.
- Any changes made will only be reflected in new journals that are created from the schedule.

**Q16. What happens if I update a journal created from a schedule?**

- Any changes made will be contained in the journal itself. The original  journal schedule and its details will not be affected, and will not see any changes.

**Q17. How can I stop a schedule?**

- You can stop a schedule by making the schedule inactive.
- Alternatively, you can also delete the schedule from the same menu.

**Q18. How can I restart a schedule?**

- Simply make an inactive schedule active to restart it.
- **Note:**If the end date is earlier than the day of restarting the schedule, you will have to update the end date to the current day or later for the schedule to restart.

**Q19. What does it mean to make a schedule inactive?**

- Making a schedule inactive stops any new journals from being created based on the schedule.

**Q20. What happens if I make an inactive schedule active?**

- If you make an inactive schedule active, new journals will start being created again the next time the scheduled date or frequency is reached.

**Q21. Can I duplicate a schedule?**

- Yes, you can duplicate a schedule.

**Q22. Does creating a scheduled journal affect any financial reports?**

- No, creating a scheduled journal will not affect any financial reports.
- Financial reports will be affected only after a journal is created and active based on the schedule.

**Q23. What happens if I void a journal created from a schedule?**

- If the journal was created from a one-off schedule, the schedule will turn inactive as soon as the journal is created. As such, there will be no further impact on the schedule even if you void the journal at this point.
- If the  journal was created from a recurring journal schedule, the schedule will run as normal the next time the designated scheduled date or frequency is reached. A new journal will be created from the schedule at that point.

**Q24. Can I add dynamic information to scheduled journals so each one is different?**

- Yes, you can add dynamic information to scheduled journals using scheduler strings. These strings generate dynamic data based on the transaction date, with values automatically updated relative to the date.
- You can find the available scheduler strings in the information tooltip on clicking 'Learn more' while creating a new scheduled journal.
- Hover over the string you want to use and click the copy icon to insert it into the journal template

**Q25. In which fields can I use the scheduler strings in a scheduled journal?**

- You can use the scheduler strings in the following fields along with static data -
  - Journal Reference
  - Description
- When the scheduler runs and generates a journal, the strings will be replaced with dynamic values based on the scheduler string type and the generated bill's transaction date.

**Q26. Can I track the transactions created by a scheduler?**

- Yes. You can view the sub-tab **Transaction History** when opening a schedule.

---
