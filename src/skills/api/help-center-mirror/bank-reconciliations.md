### Auto-reconcilation
Source: https://help.jaz.ai/en/articles/13286768-auto-reconcilation

**Q1. What is Auto-Reconcile?**

- Auto-reconcile automatically matches and reconciles eligible bank feed transactions based on your set rules, reducing manual reconciliation work.

**Q2. How do I turn on Auto-Reconcile?**

- Go to **Reconciliations > Bank Records**.
- Select a bank account, then open **Manage > Auto-Reconcile Settings**.
- Configure how auto-reconcile should work for the selected account.

**Q3. What configurations can I set up for Auto-Reconcile?**

- You can define rules that control how auto-reconcile works, including:
  - **Allowed reconciliation types:**
    - **Match:** Match to an existing transaction.
    - **Quick Reconcile:** Reconcile automatically based on past actions.
    - **Apply Rule:** Apply a related bank rule.
    - **Cash Transfer:** Reconcile with another unreconciled bank record as a cash transfer.
  - **Excluded bank records:**
    - Exclude bank records that match specific conditions using Saved Search.
  - **Magic threshold:**
    - **Strict:** Auto-reconciles only top recommendations.
    - **Balanced:** Auto-reconciles strong recommendations.
    - **Lenient:** Auto-reconciles more recommendations.
- These settings determine which transactions are automatically reconciled when auto-reconcile runs.

**Q4. When does Auto-Reconcile run?**

- Auto-reconcile runs automatically every day at midnight.
- You can also trigger auto-reconcile manually at any time.

**Q5. Will Auto-Reconcile continue running if I close the app?**

- Yes. Auto-reconcile runs in the background.
- Closing the app or losing internet connection will not stop the auto-reconciliation process.

**Q6. Where can I view auto-reconciled transactions?**

- Each auto-reconcile run creates an **Auto-Reconcile** tab.
- This tab lists all transactions that were automatically reconciled.
- You can review the results, make adjustments if needed, and mark transactions as reviewed to confirm the reconciliation.

---

### Bank Accounts Overview
Source: https://help.jaz.ai/en/articles/9941705-bank-accounts-overview

**Q1. Can I edit a bank account?**

- Yes, you can edit a bank account from the reconciliations tab OR the chart of Accounts tab.

**Q2. What is Jaz balance & Statement balance?**

- The statement balance is the sum of all unreconciled and reconciled statement lines, not taking into consideration deleted statement lines.
- The Jaz balance is the sum of all the transactions that use the bank account as a payment account.
- The two balances might not always be equal. For example, the balances will not match if the value of the statement lines imported is higher than the amounts of all available transactions in Jaz.

**Q3. How do I access all transactions that are affecting my Jaz balance on a payment account?**

- Clicking on Jaz Balance will bring you to the **Cashflows**page, only showing cashflow transactions involving the payment account.

---

### Bank Balance Summary
Source: https://help.jaz.ai/en/articles/10311986-bank-balance-summary

**Q1. How do I access the Bank Balance Summary Report?**

- Go to Reconciliations > Bank Records and export the report.

**Q2. What information is included in the Bank Balance Summary Report?**

- The report provides a consolidated view of bank account balances, including the following data:
  - Account Code
  - Account Name
  - Account Description (if any)
  - Status
  - Account Lock Date (if applicable)
  - Account Currency
  - Balance (current from the dashboard)
  - Statement Balance (from the bank statement as of the selected date)

**Q3. Why does the Bank Balance Summary Report not match my bank statement?**

- Ensure all accounts are synced and transactions are up to date. Consider running a [reconciliation](https://help.jaz.ai/en/articles/9941720-reconciliations-overview).

---

### Export Reconciled/Unreconciled Records
Source: https://help.jaz.ai/en/articles/9941732-export-reconciled-unreconciled-records

**Q1. Can I export a list of unreconciled records?**

- Yes, you can download a list of both unreconciled & reconciled records in Jaz.
- You can export a list for all time, or choose a custom date range.
- The final export will show a list of all unreconciled transaction records that have the bank account as its payment account in the **Unreconciled Records Sheet**.**Q2. Can I export a list of reconciled records?**

- You can see a list of reconciled bank records in the exported file under the Bank Records sheet.

---

### Magic Match in Bank Reconciliation
Source: https://help.jaz.ai/en/articles/9993390-magic-match-in-bank-reconciliation

**Q1. What is a Magic match in Bank reconciliation?**

- Magic Match automatically finds matching transactions or payments in Jaz when you upload your bank statements.
- A banner with this information will be displayed for each bank account with uploaded statements.
- If there are no magic match suggestions, you can manually reconcile the statements. Refer: [Different ways statements can be reconciled](https://help.jaz.ai/en/articles/9941720-reconciliations-overview#h_36afa48ec1).

**Q2. How does Jaz determine which transactions will potentially reconcile with a statement line?**

- Jaz uses specific criteria to match transactions with statement lines:
  - **With Contact (Payer/Payee)**: Jaz looks for transactions within 30 days before the statement line date where the contact and amount match.
  - **Without Contact (Payer/Payee)**: Jaz looks for transactions within 30 days before the statement line date where any contact and the amount match.
  - **Payment (Cash-Out/Cash-In Entries)**: Jaz also matches these entries against statement lines with the same bank account if the transaction date is within 3 days before the statement line date.**Q3. I see the same transaction matched with more than one statement line. What happens if I reconcile both?**

- Jaz shows potential matches with statement lines, but if one transaction is matched with multiple statement lines, reconciling will not allow both to reconcile with the same transaction. Instead, you will see a partial success banner and only the first statement line in the list will be reconciled.

**Q4. I see records with the same date and amount as the statement line, but I don't see them matched.**

- The only reason a record with the same date and amount as the statement line is not matched is that the contacts do not match.

**Q5. How many matches does Jaz return per statement line?**

- There is no limit to the number of matches that can be returned.
- Jaz matches all transactions that meet the following conditions:
  - Date
  - Amount
  - Contact
- This includes transactions such as:
  - Invoices
  - Bills
  - Customer credit notes
  - Supplier credit notes
  - Journals
  - Invoice payments
  - Bill payments
  - Customer credit refunds
  - Supplier credit refunds
  - Cash-in
  - Cash-out
  - Cash transfer records

**Q6. My statement line is matched with a transaction, but aren't statement lines reconciled with payments?**

- Yes, statement lines are always reconciled with payment records.
- When using Magic Match, which recommends a transaction match, Jaz creates a payment in the background and reconciles that payment instead of the transaction itself.

**Q7. If I do not agree with the magic match suggestions by Jaz, is there any other way I can reconcile my statement?**

- Yes, absolutely! You can manually reconcile each statement line. To know more refer: [Reconciliations Overview](https://help.jaz.ai/en/articles/9941720-reconciliations-overview#h_36afa48ec1)

---

### Managing Bank Statements
Source: https://help.jaz.ai/en/articles/9941717-managing-bank-statements

**Q1. How can I import a bank statement?**

- Select a bank account that you want to import a statement for and import a bank statement.
- Configure the import settings for the import by assigning columns in your bank statements to fields in Jaz.
  - **Note:**The statement date and amount fields must be assigned to a column in your statement.
- You can review the imported statement lines before finishing.

**Q2. What file formats are compatible with statement uploads?**

- You can upload your statements in a CSV file format or as a PDF.

**Q3. Will Jaz let me configure the columns from the statement PDF file?**

- Yes, Jaz will extract the columns from the uploaded PDF file and let you assign them to fields in Jaz.

**Q4. What if there are errors in the uploaded PDF statement file?**

- Jaz will extract statement lines from the uploaded PDF file and create a downloadable CSV file for reviewing discrepancies, if any.
- Alternatively, you can still import the statement lines with no errors. Jaz will ignore the ones with issues and import the rest.

**Q5. Can I import a statement in one currency into a bank account that uses a different currency?**

- The final statement amounts that get recorded in Jaz will be in the currency of the bank account in Jaz, not the currency of the amounts in the bank statement.
- Jaz will not do any automatic conversion between the different currencies, and will solely take the numerical amounts as is.
- For example, a statement line that has 50 USD as its amount will be automatically recorded in Jaz as 50 USD, when importing to a USD bank account, or 50 SGD if importing into a SGD bank account.

**Q6. Can I review the statement lines before they are imported into the system?**

- Yes, Jaz will let you review all the statement lines before they are imported into your bank account on Jaz.

**Q7. Can I upload multiple bank statements?**

- Yes, you can upload up to 12 files at a time.

**Q8. Can I manage my uploaded statements?**

- To manage your uploaded statements, utilize the Overview tab:
  - Pending – configure and review imported statements
  - Imported – view, download, delete statements
  - Empty – uploaded files with no statements
  - Deleted – view and restore deleted files
    - *Note: Reconciled files cannot be deleted.*

**Q9. Can I delete a bank statement line?**

- Yes, you can delete a bank statement line individually via the 3-dot menu on the statement line OR you can bulk-delete by selecting multiple statement lines at once from both reconciled & unreconciled tabs.

**Q10. Is it possible to retrieve a deleted statement line?**

- Yes, you can. Under the **Deleted**tab for the bank account, you will find a list of deleted statement lines.
- Undelete individual statement line OR bulk undelete to move it back to the Unreconciled tab.

---

### Reconciliations Overview
Source: https://help.jaz.ai/en/articles/9941720-reconciliations-overview

**Q1. Why aren't there any records available for reconciliation initially, and why do they only appear after hitting refresh?**

- Jaz filters available records, listing transactions that match the cash flow direction.
- If you do not see any records listed upon the first load, that means there are no transactions in Jaz that have the same cash flow direction.
  - Hit reset to list all the transactions in Jaz, including those that do not match the cash flow direction.

**Q2. What are the ways a bank statement can be reconciled in Jaz?**

| **Transaction Type** |**Description** |
| --- | --- |
| Quick Reconciliations | Multi-select unreconciled records and use the quick reconcile option to create direct cash entries for each record with the same accounts. |
| Invoice/Bill Receipt | Invoice/Bill receipts created from the reconciliation flow create invoices/bills and payments in the statement line's bank account, with the payment date matching the statement line date. |
| Cash-in/Cash-out Journal | This is a templated journal for quick reconciliation to capture the transfer of money between the statement line bank account & any other non-bank/non-cash account.Cash-in journal automatically debits the statement line bank account, while the other selected account is credited.Cash-out journal automatically credits the statement line bank account, while the other selected account is debited. |
| Cash Transfer Journal | This is a templated journal for quick reconciliation to capture money movement between 2 bank accounts.For Cash-in statement line -Select an account from which the money is transferred to the statement line's bank account. (i.e. add credit entry)For Cash-out statement line -Select an account to which the money is transferred from the statement line's bank account. (i.e. add debit entry) |
| Journal Entry | A Journal where you can add multiple balancing debit/credit entries using any non-bank/non-cash COAs added in the org.For Cash-in statement line -The statement line entry is recorded as a debit entryFor Cash-out statement line -The statement line entry is recorded as a credit entry |
| Transactions created in Jaz | Select any existing unreconciled transactions in Jaz to reconcile the statement line.Select 1/more transactions to reconcile the statement line. |
| Add Adjustment entry | After selecting Jaz transactions, if the amount still does not match the statement line completely, an adjustment entry with the balance amount can be added. |

**Q3. Can I do reconciliations in bulk?**

- Yes, use Quick reconciliation to bulk reconcile records by using the same journal entry account for all the journal entries created for every selected unreconciled record.

**Q4: Can I sort unreconciled transactions before reconciling?**

- Yes. By default, Magic Sort is turned on. It helps you quickly match bank transactions to your records by automatically sorting entries based on amount and date proximity, making it easier to find the most relevant matches.

**Q5. How can I bulk reconcile using the Quick reconcile feature?**

- Select desired unreconciled records and use the quick reconcile feature to create individual journal entries in the background for each record.
- Just enter the Journal reference & journal account which will be used to create a balancing entry.
  - Every single journal created from this flow will have the same journal reference & journal account. The journal amount will be based on the unreconciled record amount.
  - The journals created will match the bank account's currency.
    - If its created in FX currency, you can set the exchange rate of all the journals getting created from the quick reconcile flow OR Jaz will fetch the organization rate if available OR fetch it from 3rd party.

**Q6.**How do I enable dynamic strings in Quick Reconcile?

- Include the desired placeholders (e.g., #{{bankReference}}) while reconciling.

**Q7.**What happens if a bank statement does not include certain details?

- If an attribute is missing (e.g., no payee name is provided), the system will omit that dynamic string from the reference instead of leaving it blank.

**Q8.**Do dynamic strings work with all bank statements?

- Dynamic strings rely on the data available in the bank statement. If a bank does not provide a certain attribute, that specific dynamic string will not populate.

**Q9. How can I reconcile a statement with a new invoice/bill?**

- To reconcile a bank statement against a new invoice/bill, you can create a new invoice/bill receipt.
- The details for the invoice/bill receipt will be automatically filled in for you based on the bank statement line.

**Q10. What are Cash-in / Cash-out Journals? How can I use them to reconcile a statement?**

- Cash-in / Cash-out journal template allows for quick journal creation & statement reconciliation.
- The 1st line entry in the journal is always extracted from the statement line to be reconciled.
  - If it's a Cash-in journal, the statement line bank account is debited.
  - If it's a Cash-out journal, the statement line bank account is credited.
- You can add 1 or more balancing journal entry lines in the template.
  - If it's a Cash-in journal, the balancing entries will be credited.
  - If it's a Cash-out journal, the balancing entries will be debited.
- If the statement line bank account is in foreign currency, you can set a custom rate for the journal / Jaz will set the org rate if available on the statement line date/fetch from 3rd party.

**Q11. What are Cash Transfer Journals? How can I use them to reconcile a statement?**

- Cash Transfer Journal is a quick way to capture money movement between the statement line bank account & other bank accounts added to your organization.
- For Cash-in statement line -
  - You only need to select the account from which the money is transferred to the statement line's bank account. (i.e. add credit entry)
  - Jaz will get the debit/credit amount & date from the statement line.
- For Cash-out statement line -
  - You only need to select the account to which the money is transferred from the statement line's bank account. (i.e. add debit entry)
  - Jaz will get the credit/debit amount & date from the statement line.
- If the cash transfer is between 2 bank accounts of different currencies, Jaz will calculate the transaction rate on the fly based on the amount entered by you and the statement line amount.

**Q12. Can I create a Journal transaction to reconcile against a bank statement transaction?**

- Yes, you can create a journal transaction from the reconciliation screen.
- This templated journal is less rigid compared to cash-in/cash-out journals OR cash-transfer journals.
- In this Journal you can add debit/credit entries irrespective of whether the entry in question is cash-in / cash-out.
  - In the 1st line, the debit/credit amount will be automatically added for you, based on the cash-flow direction of the bank statement being reconciled.
  - Jaz will also autofill the account & amount from the statement line. You will need to add balancing entries as required.
  - Journal currency is also set the same as the statement line currency.
    - If the statement line is in base currency -
      - you can add balancing journal entries by selecting any of the base currency accounts.
      - You can also use non-base currency accounts. To learn how to set exchange rates for a non-base currency account, refer to: [Manual Journal Guide](https://help.jaz.ai/en/articles/8937999-manual-journal#h_bbec06e5a7)
    - If the statement line is in non-base currency -
      - You can either create a balanced non-base currency Journal OR change the currency to the base currency & then create. For more details on handling non-base currency journals, refer to: [Manual Journal Guide](https://help.jaz.ai/en/articles/8937999-manual-journal#h_957a2e7ca9)
  - Note that you cannot partially reconcile a statement line with a journal transaction.

**Q13. Can I use a combination of transactions, payments, adjustment entries, journal entry & receipts to reconcile a statement line?**

- Transactions, payments & adjustment entries can be combined to reconcile a statement line.
  - However, journal entries & receipts cannot be used in any combinations. They must be reconciled in full.

**Q14. How can I partially use a transaction to reconcile with a statement line?**

- To partially reconcile with a statement line, you can change the **Match Amount**for a transaction that you would like to partially use for reconciliation.

**Q15. How can I reconcile a statement line with a cross-currency transaction?**

- When you select a cross-currency transaction to reconcile with a statement line, you will be asked to add the cash received/spent in the statement line's currency.

**Q16. How do I reconcile a statement if I can only partially reconcile it with the transactions available in Jaz?**

- You can add an adjustment to fully reconcile the statement.
- Adding an adjustment is similar to creating a journal entry. Adjustment entries have information like the bank account already filled in.
- Adjustment journals are created in the statement line's currency.
  - If the statement line is in base currency, simply add the balancing entries.
  - If the statement line is in non-base currency, You can modify the exchange rate of the adjustment journal by clicking on the currency ISO in the debit/credit header.

**Q17. Is there a limit to the number of line items I can add to an adjustment journal?**

- You can have 3 journal entry lines in an adjustment journal.

**Q18. Where can I see the transactions used to reconcile a statement line?**

- To see the transactions used, click on the reconciled statement line.
- This will bring up the details for the reconciled statement line, including the list of transactions used to reconcile the statement line.

**Q19. Are transaction fee amounts considered when doing reconciliations?**

- When loading the list of payments available for reconciliation, the amount shown will be **net cash amounts.**Reconciliations will be done against this net cash amount.
  - For invoice payments & customer credit refunds, the net amount excludes the fee amount.
  - For bill payments and supplier credit refunds, the net amount includes the fee amount.
- If you are reconciling against a transaction instead of a payment, you will be able to indicate transaction fees when recording new payments during the reconciliation process.

---

### Resetting Reconciliations
Source: https://help.jaz.ai/en/articles/9941723-resetting-reconciliations

**Q1. How can I reset reconciliations? What happens to the corresponding business transaction records? Will it impact my financial reports?**

- The corresponding business transaction records previously used for matching will be unmatched.
- There will be no further impact on your financial reports. However, previously created transactions such as journal entries used for adjustments will remain recorded.
- You can reset the reconciled statement lines individually using the 3-dot menu or you can bulk reset by multi-selecting desired records.

**Q2. Are there any other triggers to reset reconciliation apart from manually resetting the statement lines?**

- Yes, there are a couple of ways you can reset reconciliations -
  - Updating the net payment amount of the payment record used for reconciliation
  - Updating the payment account of the payment record used for reconciliation
  - Updating the debit/credit amount of the payment account of the journal entry used for reconciliation
  - Updating the payment account in the journal entry used for reconciliation

---

### Airwallex
Source: https://help.jaz.ai/en/articles/11405402-airwallex

**Q1. Is it possible to directly integrate my Bank Account with Jaz?**

- Yes! You can easily integrate your bank account with Jaz & get all the transactions to reconcile.
- Select a bank account that you want to connect with the external bank account to get regular bank feeds.
- This can be done from the Reconciliation module, select the desired bank account & import the bank feeds.

**Q2. Is it easy to set up a bank connection on Jaz?**

- The bank connection setup is pretty straightforward & easy on Jaz.
- Once you have selected the Bank Account from step 1 of the bank feed import process, you will need to retrieve the Client ID & API Key from the Airwallex account to key into the 2nd step.
  - If you don't have access to your Airwallex account to retrieve these 2 pieces of information, your client will need to be the one doing it.
- Once done with step 2, you'll move to the final step where you can select the bank account and select the date to pull the bank feeds from.

**Q3. Why can't I select dates older than 12 months from today?**

- You can pull in bank feeds only up to 12 months from today in Jaz.

**Q4. How can I re-sync my bank feeds?**

- Select the desired bank account from the reconciliation module and hit the sync icon on the bank feed details modal, to get new statement lines to Jaz for reconciling.

**Q5. How can I disconnect a bank account from Jaz?**

- Simply hit disconnect on the bank feed details modal, to disconnect the connected bank.
- This will stop further bank feeds from getting populated in Jaz.
- This will also allow you to connect the same bank account to another Jaz bank account.

**Q6. Why can't I see all of my bank accounts while trying to integrate with Jaz?**

- Please check the currencies of the Jaz bank account & the 3rd party bank account you are trying to integrate with.
- Jaz restricts cross-currency bank account integrations.

**Q7. Which bank connections are supported by Jaz currently?**

- Jaz supports Airwallex, Aspire, Stripe, Wise, and Xendit bank feeds.

---

### Aspire
Source: https://help.jaz.ai/en/articles/10988803-aspire

Q1. Is it possible to directly integrate my Bank Account with Jaz?

- Yes! You can easily integrate your bank account with Jaz & get all the transactions to reconcile.
- Select a bank account that you want to connect with the external bank account to get regular bank feeds.
- This can be done from the Reconciliation module, select the desired bank account & import the bank feeds.

Q2. Is it easy to set up bank feeds on Jaz?

- The bank feeds setup is pretty straightforward & easy on Jaz.
- Once you have selected the Bank Account from step 1 of the bank feed import process, you will need to retrieve the Client ID & API Key from the Aspire account to key into the 2nd step.
  - If you don't have access to your Aspire account to retrieve these 2 pieces of information, your client will need to be the one doing it.
- Once done with step 2, you'll move to the final step where you can select the bank account and select the date to pull the bank feeds from.

Q3. Why can't I select dates older than 12 months from today?

- You can pull in bank feeds only up to 12 months from today in Jaz.

Q4. How can I re-sync my bank feeds?

- Select the desired bank account from the reconciliation module and hit the sync icon on the bank feed details modal, to get new statement lines to Jaz for reconciling.

Q5. How can I disconnect a bank account from Jaz?

- Simply hit disconnect on the bank feed details modal, to disconnect the connected bank.
- This will stop further bank feeds from getting populated in Jaz.
- This will also allow you to connect the same bank account to another Jaz bank account.

Q6. Why can't I see all of my bank accounts while trying to integrate with Jaz?

- Please check the currencies of the Jaz bank account & the 3rd party bank account you are trying to integrate with.
- Jaz restricts cross-currency bank account integrations.

Q7. Which bank feeds are supported by Jaz currently?

- Jaz supports Airwallex, Aspire, Stripe, Wise, and Xendit bank feeds.

---

### Stripe
Source: https://help.jaz.ai/en/articles/10988869-stripe

Q1. Is it possible to directly integrate my Bank Account with Jaz?

- Yes! You can easily integrate your bank account with Jaz & get all the transactions to reconcile.
- Select a bank account that you want to connect with the external bank account to get regular bank feeds.
- This can be done from the Reconciliation module, select the desired bank account & import the bank feeds.

Q2. Is it easy to set up bank feeds on Jaz?

- The bank feeds setup is pretty straightforward & easy on Jaz.
- Once you have selected the Bank Account from step 1 of the bank feed import process, you will need to retrieve the API Key from the Stripe Wallet account to key into the 2nd step.
- Once done with step 2, you'll move to the final step where you can select the bank account and select the date to pull the bank feeds from.

Q3. Why can't I select dates older than 12 months from today?

- You can pull in bank feeds only up to 12 months from today in Jaz.

Q4. How can I re-sync my bank feeds?

- Select the desired bank account from the reconciliation module and hit the sync icon on the bank feed details modal, to get new statement lines to Jaz for reconciling.

Q5. How can I disconnect a bank account from Jaz?

- Simply hit disconnect on the bank feed details modal, to disconnect the connected bank.
- This will stop further bank feeds from getting populated in Jaz.
- This will also allow you to connect the same bank account to another Jaz bank account.

Q6. Why can't I see all of my bank accounts while trying to integrate with Jaz?

- Please check the currencies of the Jaz bank account & the 3rd party bank account you are trying to integrate with.
- Jaz restricts cross-currency bank account integrations.

Q7. Which bank feeds are supported by Jaz currently?

- Jaz supports Airwallex, Aspire, Stripe, Wise, and Xendit bank feeds.

---

### Wise
Source: https://help.jaz.ai/en/articles/10988884-wise

Q1. Is it possible to directly integrate my Bank Account with Jaz?

- Yes! You can easily integrate your bank account with Jaz & get all the transactions to reconcile.
- Select a bank account that you want to connect with the external bank account to get regular bank feeds.
- This can be done from the Reconciliation module, select the desired bank account & import the bank feeds.

Q2. Is it easy to set up bank feeds on Jaz?

- The bank feeds setup is pretty straightforward & easy on Jaz.
- Once you have selected the Bank Account from step 1 of the bank feed import process, you will need to retrieve the API Key from the Wise account to key into the 2nd step.
- Once done with step 2, you'll move to the final step where you can select the bank account and select the date to pull the bank feeds from.

Q3. Why can't I select dates older than 12 months from today?

- You can pull in bank feeds only up to 12 months from today in Jaz.

Q4. How can I re-sync my bank feeds?

- Select the desired bank account from the reconciliation module and hit the sync icon on the bank feed details modal, to get new statement lines to Jaz for reconciling.

Q5. How can I disconnect a bank account from Jaz?

- Simply hit disconnect on the bank feed details modal, to disconnect the connected bank.
- This will stop further bank feeds from getting populated in Jaz.
- This will also allow you to connect the same bank account to another Jaz bank account.

Q6. Why can't I see all of my bank accounts while trying to integrate with Jaz?

- Please check the currencies of the Jaz bank account & the 3rd party bank account you are trying to integrate with.
- Jaz restricts cross-currency bank account integrations.

Q7. Which bank feeds are supported by Jaz currently?

- Jaz supports Airwallex, Aspire, Stripe, Wise, and Xendit bank feeds.

---

### Xendit
Source: https://help.jaz.ai/en/articles/10988891-xendit

Q1. Is it possible to directly integrate my Bank Account with Jaz?

- Yes! You can easily integrate your bank account with Jaz & get all the transactions to reconcile.
- Select a bank account that you want to connect with the external bank account to get regular bank feeds.
- This can be done from the Reconciliation module, select the desired bank account & import the bank feeds.

Q2. Is it easy to set up bank feeds on Jaz?

- The bank feeds setup is pretty straightforward & easy on Jaz.
- Once you have selected the Bank Account from step 1 of the bank feed import process, you will need to retrieve the API Key from the Xendit account to key into the 2nd step.
- Once done with step 2, you'll move to the final step where you can select the bank account and select the date to pull the bank feeds from.

Q3. Why can't I select dates older than 12 months from today?

- You can pull in bank feeds only up to 12 months from today in Jaz.

Q4. How can I re-sync my bank feeds?

- Select the desired bank account from the reconciliation module and hit the sync icon on the bank feed details modal, to get new statement lines to Jaz for reconciling.

Q5. How can I disconnect a bank account from Jaz?

- Simply hit disconnect on the bank feed details modal, to disconnect the connected bank.
- This will stop further bank feeds from getting populated in Jaz.
- This will also allow you to connect the same bank account to another Jaz bank account.

Q6. Why can't I see all of my bank accounts while trying to integrate with Jaz?

- Please check the currencies of the Jaz bank account & the 3rd party bank account you are trying to integrate with.
- Jaz restricts cross-currency bank account integrations.

Q7. Which bank feeds are supported by Jaz currently?

- Jaz supports Airwallex, Aspire, Stripe, Wise, and Xendit bank feeds.

---

### Bank Rules
Source: https://help.jaz.ai/en/articles/10989529-bank-rules

Q1: How do Bank Rules work?

- This feature supports Direct Cash Entry reconciliations, with receipt reconciliations in development.
- Users can configure rules to allocate transaction amounts using two methods: Percentage Only and Fixed and Percentage:
  - **Percentage Only Allocation**
    - Splits transaction amounts into multiple percentage-based allocations.
    - Must total 100% across all entries (max 10 lines).
  - **Fixed and Percentage**
    - Allocates a fixed amount first, with the remainder split by percentage.
    - If the transaction is less than fixed allocations, it won't be reconciled.
    - Allows negative values for refunds or reversals.
    - Supports up to 10 fixed and 10 percentage lines (total 20 lines).

Q2: How do I create a Bank Rule?

- Go to Reconciliation > Choose a bank account > Unreconciled > Highlight transactions > Quick Reconcile dropdown > Apply Bank Rule > Add new

Q3: Are Bank Rules account specific?

- Yes, they apply to individual bank accounts.

Q4: What if my transaction is less than the fixed allocations?

- It won’t be reconciled—ensure fixed amounts are appropriate.

Q5: Can I edit or delete a rule?

- Yes, modify or remove rules according to your specifications.

Q6: What are dynamic strings used for in Bank Rules?

- Dynamic strings are used specifically for the **Reference** field in Bank Rules. They allow you to automatically extract specific text (e.g., a bank reference or description) from your uploaded bank statement and include it in the transaction record.
- For example, if you set a rule to include the dynamic string #{{bankReference}} along with a custom label “= Statement Upload: 274”, your transactions will display that combined reference once reconciliation is complete (#{{bankReference}} = Statement Upload: 274).

Q7: How do I enable dynamic strings in Bank Rules?

- Include the desired placeholders (e.g., #{{bankReference}}) while creating or editing Bank Rules.

**Q8.**What happens if a bank statement does not include certain details?

- If an attribute is missing (e.g., no payee name is provided), the system will omit that dynamic string from the reference instead of leaving it blank.

**Q9.**Do dynamic strings work with all bank statements?

- Dynamic strings rely on the data available in the bank statement. If a bank does not provide a certain attribute, that specific dynamic string will not populate.

---

### Saved Search (Reconciliations)
Source: https://help.jaz.ai/en/articles/10988908-saved-search-reconciliations

Q1. How to enable Saved Search

- Users can switch between regular search mode and saved search mode by clicking the search icon.

Q2. How do I create a Saved Search?

- Switch to Saved Search mode > Add a New Search > Name your criteria > Select variables, conditions, and values
- Run your criteria from the Saved Search field.

Q3. What filters can be used?

- Supported filter criteria include:
  - Amount
  - Date
  - Description
  - Payee
  - Reference
- Duplicate search filters are not allowed within the same saved search.

Q4. Can I apply multiple saved searches at once?

- No, only one saved search can be applied at a time. To add more conditions, modify an existing saved search.

---
