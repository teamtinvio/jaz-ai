### Capsules
Source: https://help.jaz.ai/en/articles/12880661-capsules

**Q1. What are Capsules?**

- Capsules are containers that group related transactions together, especially for complex accounting scenarios like prepaid expenses, deferred revenue, accrued expenses, and other advanced entries.
- It keeps all linked invoices, bills, journals, and scheduler-generated entries organized in one place.
- This can help you review and audit transactions faster.

**Q2. What other accounting scenarios can I use Capsules for?**

- Capsules can be used for any complex or multi-step transaction that requires multiple linked entries.
- Common use cases include:
  - **Accrued expenses:** Month-end accrual journals, reversals, and the supplier bill once received.
  - **Adjustments or corrections:** Reversal entries and correcting journals grouped for audit clarity
  - **Prepaid expenses:** Annual insurance or subscriptions paid upfront with monthly amortization journals.
  - **Security deposits:** Deposit payment, reclassification entries, and refund or offset
  - **Intercompany transactions:** Reimbursements, allocations, and adjustments across related entities.
  - **Fixed asset acquisitions:** Recording new equipment or asset purchases together with installation, delivery, or setup costs.
  - **Renovations or improvements to existing assets:** Contractor bills, capitalization journals, and depreciation after improvements.
  - **Construction-in-progress (CIP):** Progress billings, accumulated costs during construction, and final capitalization into a fixed asset.
  - **Asset disposals:** Derecognition entries, accumulated depreciation write-off, and gain or loss on disposal journals.

​

**Q3. What information does a Capsule contain?**

- A capsule contains three parts:
  - Basic details: capsule name, type, and description.
  - Transactions: invoices, bills, journals, or any mix of entries tied to the capsule.
  - Schedulers: recurring transactions from any schedulers.

**Q4. What are Capsule Types?**

- Capsule types are labels that help categorize your complex transactions (e.g., prepaid expenses, deferred revenue, intercompany).
- Your organization starts with default types, and you can add, edit, or rename types to match your accounting needs.

**Q5. How do I create a Capsule?**

- Go Reports > Capsules > + New Capsule. Alternatively, when creating or editing transactions, you can click the capsule icon to create a new one.
- Create a new capsule by entering a name, selecting a type, and adding an optional description.

**Q6. How do I attach a transaction to a Capsule?**

- You can attach transactions into a capsules in the following ways:
  - When creating or editing a transaction, select the capsule icon and choose an existing capsule or create a new one.
​

  - Highlighting bulk transactions and using the Quick Fix function.
​

  - Clicking the capsule icon during transaction modal view.
​
​
  - You can also [move](#h_3b3d10a7c4) a transaction from one capsule to another when needed.

**Q7. Can I move a transaction to another Capsule?**

- Yes. You can open a transaction, select the capsule icon, and choose the new capsule you want to move it to.
- You can also open a capsule, select multiple transactions, and bulk move them to another capsule.

**Q8. How do I delete a Capsule?**

- A capsule must be empty before it can be deleted. Once all transactions are removed, it will appear under the Empty tab, where you can delete it.

**Q9. How do I know if a transaction is part of a Capsule?**

- You can view all transactions under a capsule by going to Reports > Capsules.
- When viewing a transaction, the capsule icon appears beside Invoice Details if it is assigned to a capsule.
- When editing a transaction, the capsule icon will be highlighted if the transaction belongs to a capsule.

**Q10. How do Schedulers work with Capsules?**

- If a scheduler has a capsule selected, every recurring entry it generates will automatically be created under the same capsule.
- This ensures all related future transactions are grouped together.

**Q11. How do Capsules appear in reports?**

- You can choose to group ledger entries by Capsules.

**Q12. How are Capsules different from [Tracking Tags](https://help.jaz.ai/en/articles/9066651-tracking-tags)?**

- Tracking tags label transactions for reporting.
- Capsules group full transactions and schedulers, letting you view all entries related to a complex accounting flow.
- In reports, you can group ledger entries by Capsules, while Tracking Tags can only be used as a filter.

**Q13. Can I use Capsules in Clio?**

- Yes. Clio can detect when a document represents a complex transaction and suggest creating a capsule with the correct initial entries and schedulers.
- Once confirmed, Clio automatically creates the capsule and all required draft transactions.

**Q14. How do I attach multiple transactions to a Capsule?**

- You can use the Quick Fix function to do bulk attachment of transactions to a capsule.

---

### Balance Sheet
Source: https://help.jaz.ai/en/articles/9070574-balance-sheet

**Q1. What is a balance sheet?**

- The balance sheet is a financial statement that provides a snapshot of your organization's financial position at a specific point in time. It lists the company's assets, liabilities, and equity to show the net worth of the organization.
- The balance sheet is crucial for assessing the company's financial stability and liquidity. Stakeholders use it to evaluate how well resources are being managed and the financial strength of the business.

**Q2. How can I customize the date range for the balance sheet?**

- You can change the date using the date selector or use the predefined date ranges.

**Q3. What currency is the balance sheet in?**

- By default, the balance sheet  will display values in your organization's base currency.
- You can change the display currency of the balance sheet  to other currencies that have been set up in your organization. For more information about setting up other currencies, refer to [Accounting](https://help.jaz.ai/en/articles/9091111-accounting).

**Q4. How can I see the exchange rates being used in calculations?**

- At the bottom of the page, click on **See All Rates.**
- You will be shown a list of all exchange rates used to convert foreign currency transactions back to the organization's base currency.
  - Other information include the date of the exchange rate, as well as the rate type.

**Q5. Can I download the balance sheet?**

- Yes, you can download the report in Excel or PDF formats.
- See below for an example of the downloaded file.

**Q6. Can I add notes to my balance sheet?**

- Yes, enable **Print Report Notes** in**Options** to add and format notes below the report. These notes will be included in the exported report.

**Q7. Is it possible to include exchange rates in my balance sheet?**

- Yes, enable **Print Exchange Rates** in**Options** to display them below the report. They will also appear in the exported report.

**Q8. Does Jaz do Current Financial Year Earnings (CYE) rollover?**

- At your financial year-end, the system dynamically calculates and rolls over the CYE amount to your **[Retained Earnings](https://help.jaz.ai/en/articles/9073368-ledger#h_a7209aece1)**. Any changes to transactions or your financial year-end will automatically update the rolled-over balances.

---

### Cashflow Statement
Source: https://help.jaz.ai/en/articles/9070577-cashflow-statement

**Q1. What is a cashflow statement?**

- The cashflow statement details the amount of cash and cash equivalents entering and leaving your organization, categorized into operating, investing, and financing activities over a period.
- It is crucial for assessing the liquidity, solvency, and financial flexibility of the business. Understanding cash flow helps in effective cash management, ensuring that your organization can meet its short-term obligations and invest in growth opportunities.

**Q2. Can I customize the date range for the cashflow statement?**

- Yes, you can customize the date range for the cash flow statement. Alternatively, you can also select pre-defined date ranges for quick date sets.

**Q3. What currency is the cashflow statement in?**

- By default, the cashflow statement will display values in your organization's base currency.
- You can change the display currency of the cashflow statement to other currencies that have been set up in your organization. For more information about setting up other currencies, refer to [Accounting](https://help.jaz.ai/en/articles/9091111-accounting).

**Q4. How can I see the exchange rates being used in calculations?**

- At the bottom of the page, click on **See All Rates.**
- You will be shown a list of all exchange rates used to convert foreign currency transactions back to the organization's base currency.
  - Other information include the date of the exchange rate, as well as the rate type.

**Q5. Can I download the Cashflow Statement?**

- Yes, you can download the report in Excel or PDF formats.
- See below for an example of the downloaded file.

**Q6. Can I add notes to my cashflow statement?**

- Yes, enable **Print Report Notes** in**Options** to add and format notes below the report. These notes will be included in the exported report.

**Q7. Is it possible to include exchange rates in my cashflow statement?**

- Yes, enable **Print Exchange Rates** in**Options** to display them below the report. They will also appear in the exported report.

---

### Ledger
Source: https://help.jaz.ai/en/articles/9073368-ledger

**Q1. What is the general ledger?**

- The **General Ledger**shows all the different accounts and financial transactions that have been recorded for your business. This includes all types and classes of accounts, as well all types of business activity.
- It is a complete record of all financial transactions over the life of a company.

**Q2. Can I customize the date range for the general ledger?**

- Yes, you can customize the date range using the date selectors or use pre-defined commonly used date ranges.

**Q3. Can I download the general ledger report for a specific period?**

- Yes, you can download the general ledger report. Just set the required date range and download.
- You can download the report either as it appears on the UI (with the shown columns) or with all columns, including the hidden ones.
- See below for an example of the downloaded file.

**Q4. What grouping options are available for the general ledger report?**

Jaz supports 5 options for grouping your transactions:
- By accounts
- By contacts
  - **Note:**For transactions that do not have an associated contact, they will be grouped under **No Contact.**
- By transactions
- By relationship
- By tax profiles
  - **Note:** Only transactions that make use of tax profiles will show up here.**Q5. Can I use filters on the general ledger?**

- Yes, you can use filters on the general ledger.

**Q6. How can I view the original amount of my transactions in the general ledger in the currency that was used in the transaction?**

- You can adjust the columns in the general ledger to view the display currency, source debit/credit, and base debit/credit amounts.
  - Alternatively, you can click on the transaction record in the General Ledger.
  - This will bring up the transaction details, where you can view the transaction's original amount in the currency that was used for the transaction.

**Q7. I see many different accounts relating to foreign exchange. What are they used for?**

There are 3 accounts that Jaz provides for managing foreign exchange transactions:
- **FX Bank Revaluation (Gains)/Loss**
  - This account is used to record the gain/loss incurred to the bank balance due to the change in exchange rates of the currencies
  - E.g.- If a company operates in Singapore and has a bank account denominated in USD. At the beginning of the year, the company had USD10,000.00 in its bank account, which was recorded in its balance sheet as SGD13,592.70 with an exchange rate of 1.00 USD = 1.36 SGD. If there is a change in the rate at the end of the year, now it is 1.00 USD = 1.38 SGD. Here's how the revaluation would look like
    - Original balance in USD: $10,000.00
Original balance in SGD: $10,000.00 * 1.36 = S$13,600.00
Revalued balance in SGD: $10,000.00 * 1.38 = S$13,800.00
Gain/Loss from revaluation: S$13,800.00 - S$13,600.00 = S$200.00
  - Here, a gain of S$200.00 will be recorded in the financial statements of the company.
- **FX Realized Currency (Gains)/Loss**
  - If a transaction was conducted in a foreign currency (i.e. a currency that is different from your organization's base currency), there may be FX currency gains/losses depending on exchange rate differences between the date of the transaction and the date of payment.
  - For an example of how realized gain losses are calculated, you can view the example calculations for invoices here: [When does realized gain-loss (RGL) happen, and how is it calculated?](https://help.jaz.ai/en/articles/9062327-record-invoice-payments#h_6ddd4e757d:~:text=3rd%20party%20services.-,Q7.%20When%20does%20realized%20gain%2Dloss%20(RGL)%20happen%2C%20and%20how%20is%20it%20calculated%3F,-RGL%20happens%20when)
  - All FX gains/losses will be recorded as a debit/credit in this account.
- **FX Unrealized Currency (Gains)/Loss**
  - This account is used to record the gain/loss of unpaid cross-currency transactions due to fluctuations in exchange rates.
  - E.g. A Singapore-based company holds Account Payables of $10,000.00 owed to a US supplier. At the time of the agreement, the exchange rate was 1 USD = 1.36SGD.
  - So, the liability recorded is S$13,600.00. By the end of the reporting period, the exchange rate changes to 1.00 USD = 1.34 SGD, and now the liability is worth S$13,400. here's how the unrealized currency gain/loss would be calculated -
    - Original liability recorded: S$13,600.00
The current value of liability based on the exchange rate: S$13,400.00
FX unrealized loss = Current value of liability based on exchange rate - Original liability recorded
​**FX unrealized loss** = S$13,400.00 - S$13,600.00
​**FX unrealized loss** = S$200.00
- **FX Rounding (Gains)/Loss**
  - This account is used to record small rounding errors because of the conversion of foreign currency amounts into the base currency.
  - These rounded amounts may not perfectly match the original amounts due to exchange rates or decimal precisions.
  - If the rounded amount is less than the calculated amount, the difference is recorded as a debit to this account. Conversely, if the rounded amount is greater than the calculated amount, the difference is recorded as a credit to this account.

**Q8. Can I add notes to my ledger?**

- Yes, enable **Print Report Notes** in**Options** to add and format notes below the report. These notes will be included in the exported report.

**Q9. Is it possible to include exchange rates in my ledger?**

- Yes, enable **Print Exchange Rates** in**Options** to display them below the report. They will also appear in the exported report.

**Q10. How do I see balances rolled over year to year in my Retained Earnings?**

- Use the custom date range feature in your Ledger to view the dynamically updated Retained Earnings balances for each financial year. These balances are automatically managed and adjusted based on changes to transactions or financial year settings.

---

### Profit & Loss Statement
Source: https://help.jaz.ai/en/articles/9070576-profit-loss-statement

**Q1. What is the Profit & Loss statement?**

- The profit & loss statement summarizes the revenues, costs, and expenses incurred during a specific period, usually a fiscal quarter or year. It is also known as the Income Statement.
- It can help you in assessing your organization's operational efficiency and profitability. It helps in understanding if your organization is generating profit or incurring losses, guiding decision-making regarding cost control and revenue generation strategies

**Q2. Can I customize the date range for the profit & loss statement?**

- Yes, you can select any date range to view the profit & loss statement of that particular time frame. Alternatively, you can use pre-defined time ranges for quick date update.

**Q3. What currency is the profit & loss statement in?**

- By default, the profit & loss statement will display values in your organization's base currency.
- You can change the display currency of the profit & loss statement to other currencies that have been set up in your organization. For more information about setting up other currencies, refer to [Accounting](https://help.jaz.ai/en/articles/9091111-accounting).

**Q4. How can I see the exchange rates being used in calculations?**

- At the bottom of the page, click on **See All Rates.**
- You will be shown a list of all exchange rates used to convert foreign currency transactions back to the organization's base currency.
  - Other information include the date of the exchange rate, as well as the rate type.

**Q5. Can I make use of tracking tags when viewing my profit & loss statement?**

- If you have tracking tags added to your organization, you can also select and apply them as a filter.

**Q6. Can I download the Profit & Loss statement?**

- Yes, you can download the report in Excel or PDF formats.
- See below for an example of the downloaded file.

**Q7. Can I add notes to my profit & loss statement?**

- Yes, enable **Print Report Notes** in**Options** to add and format notes below the report. These notes will be included in the exported report.

**Q8. Is it possible to include exchange rates in my profit and loss statement?**

- Yes, enable **Print Exchange Rates** in**Options** to display them below the report. They will also appear in the exported report.

**Q9. Do my earnings roll over to the next financial year?**

- Yes, profits or losses roll over dynamically. Changes to transactions or financial year-end will be reflected automatically in the [Retained Earnings](https://help.jaz.ai/en/articles/9073368-ledger#h_e564b4f08e) account.

---

### Trial Balance
Source: https://help.jaz.ai/en/articles/8938001-trial-balance

**Q1. What is the trial balance?**

- The **Trial Balance** is a bookkeeping worksheet in which the balances of all ledgers are compiled into debit and credit account columns. It's prepared at the end of a reporting period as a preliminary step to financial statement preparation.
- You can use the trial balance to verify the arithmetic accuracy of your organization's bookkeeping entries. A balanced trial balance does not guarantee that there are no errors, but it's a crucial step in ensuring that accounts are correctly balanced before generating financial statements.

**Q2. Can I customize the date range for the trial balance report?**

- Yes, you can customize the date range for the trial balance or you can also select commonly used dates for quick access.

**Q3. What currency is the trial balance in?**

- By default, the trial balance will display values in your organization's base currency.
- You can change the display currency of the trial balance to other currencies that have been set up in your organization. For more information about setting up other currencies, refer to [Accounting](https://help.jaz.ai/en/articles/9091111-accounting).

**Q4. How can I see the exchange rates being used in calculations?**

- At the bottom of the page, click on **See All Rates.**
- You will be shown a list of all exchange rates used to convert foreign currency transactions back to the organization's base currency.
  - Other information include the date of the exchange rate, as well as the rate type.

**Q5. Can I download the trial balance?**

- Yes, you can download the report in Excel or PDF formats.
- See below for an example of the downloaded file.

**Q6. Can I add notes to my trial balance?**

- Yes, enable **Print Report Notes** in**Options** to add and format notes below the report. These notes will be included in the exported report.

**Q7. Is it possible to include exchange rates in my trial balance?**

- Yes, enable **Print Exchange Rates** in**Options** to display them below the report. They will also appear in the exported report.

---

### Aged Payables
Source: https://help.jaz.ai/en/articles/10483215-aged-payables

**Q1. What is Aged Payables Report?**

Aged Payables Report provides an overview of unpaid customer invoices categorized by overdue periods, providing a clear understanding of outstanding payments.

**Q2. Can I customize the date range for the Aged Payables Report?**

Yes, you can customize the date range for the aged payables report or you can also select commonly used dates for quick access.

**Q3. What currency is the Aged Payables Report in?**

By default, the aged payables report will display values in your organization's base currency.

**Q4. Can I download the Aged Payables Report?**

Yes, an example of the downloaded file is shown below. You can either choose to download a summary report or detailed report.

**Q5. Can I add notes to my Aged Payables?**

- Yes, enable **Print Report Notes** in**Options** to add and format notes below the report. These notes will be included in the exported report.

**Q6. Is it possible to include exchange rates in my Aged Payables?**

- Yes, enable **Print Exchange Rates** in**Options** to display them below the report. They will also appear in the exported report.

---

### Aged Receivables
Source: https://help.jaz.ai/en/articles/10483205-aged-receivables

**Q1. What is Aged Receivables Report?**

- Aged Receivables Report provides an overview of unpaid customer invoices categorized by overdue periods, providing a clear understanding of outstanding payments.

**Q2. Can I customize the date range for the Aged Receivables Report?**

- Yes, you can customize the date range for the aged receivables report or you can also select commonly used dates for quick access.

**Q3. What currency is the Aged Receivables Report in?**

- By default, the aged receivables report will display values in your organization's base currency.

**Q4. Can I download the Aged Receivables Report?**

- You can either choose to download a summary report or detailed report.

**Q5. Can I add notes to my cash balance?**

- Yes, enable **Print Report Notes** in**Options** to add and format notes below the report. These notes will be included in the exported report.

**Q6. Is it possible to include exchange rates in my cash balance?**

- Yes, enable **Print Exchange Rates** in**Options** to display them below the report. They will also appear in the exported report.

---

### Cash Balance
Source: https://help.jaz.ai/en/articles/10311914-cash-balance

**Q1. What is Cash Balance Report?**

- The Cash Balance Report provides an overview of your organization's cash and bank balances at a specific point in time, aiding liquidity monitoring.

**Q2. Can I customize the date range for the cash balance report?**

- Yes, you can customize the date range for the cash balance or you can also select commonly used dates for quick access.

**Q3. What currency is the cash balance in?**

- By default, the cash balance will display values in your organization's base currency.
  - *Note: The "Balance" column displays the account balance, while the "Balance (Base Currency)" shows the converted amount in the organization's base currency.*

**Q4. Can I download the cash balance?**

- Yes, you can download the report in Excel or PDF formats.
- See below for an example of the downloaded file.

**Q5. Can I add notes to my cash balance?**

- Yes, enable **Print Report Notes** in**Options** to add and format notes below the report. These notes will be included in the exported report.

**Q6. Is it possible to include exchange rates in my cash balance?**

- Yes, enable **Print Exchange Rates** in**Options** to display them below the report. They will also appear in the exported report.

---

### Data Exports
Source: https://help.jaz.ai/en/articles/9139401-data-exports

**Q1. Where can I find sale/purchase reports for download?**

- You can find it in **Reports**> **Data Exports.Q2. How can I download a report?**

- Next to the title for each of the reports, you will find a download icon.
- Click on the icon to download the report.

**Q3. What is a sale summary report?**

- The **sales summary report** is a compilation of all invoices created in your organization. Each record includes details about the invoice such as the reference, transaction currency, and total invoice amount.
- You can generate a sales summary report for both active and draft invoices by selecting the **Status** when downloading the report.**Q4. What is a sales cashflow summary report?**

- The **sales cashflow summary report** is a compilation of all cash-inflows to your organization. Each record includes details about the cash-in payment such as the payment reference, payment currency, and total payment amount.
- You can generate a sales cashflow summary report for both active and draft payments by selecting the **Status** when downloading the report.**Q5. What is an aged receivables details report?**

- The aged receivables report provides a detailed account of outstanding receivables, categorized by how long invoices have been outstanding.
- This can help in managing debtor balances and cash flow in your organization.

**Q6. What is an AR Reconciliation report?**

- The Aged Receivables (AR) reconciliation report shows a summary of all aged receivable accounts, including the balance of your FX unrealized gains/loss account.
- You will also be able to view all invoice/customer credit records with details regarding the age (e.g. when the last payment was made for an outstanding invoice) under the **Aged Receivables**tab.

**Q7. What is a purchase summary report?**

- The purchase summary report is a compilation of all bills created in your organization. Each record includes details about the invoice such as the reference, transaction currency, and total bill amount.
- You can generate a purchase summary report for both active and draft bills by selecting the **Status** when downloading the report.**Q8. What is a purchases cashflow summary report?**

- The **purchases cashflow summary report** is a compilation of all cash-outflows from your organization. Each record includes details about the cash-out payment such as the payment reference, payment currency, and total payment amount.
- You can generate a sales cashflow summary report for both active and draft payments by selecting the **Status** when downloading the report.**Q9. What is an aged payables details report?**

- The aged payables report provides a detailed account of outstanding payables, categorized by age.
- The report can help to offer insights into the organization's payment obligations to manage cash outflows effectively.

**Q10. What is an AP reconciliation report?**

- The Aged Payables (AP) reconciliation report shows a summary of all aged payable accounts, including the balance of your FX unrealized gains/loss account.
- You will also be able to view all bill/supplier credit records with details regarding the age (e.g. when the last payment was made for an outstanding bill) under the **Aged Payables**tab.

**Q11. What is a trial balance report?**

- The **Trial Balance report**is an export of the organization's current** trial balance**.
- The information in the exported **Trial Balance report**is the same as the trial balance that you can view in Jaz. For more information about the trial balance and viewing it within Jaz, you may refer to [Trial Balance](https://help.jaz.ai/en/articles/8938001-trial-balance).

**Q12. What is a profit & loss report?**

- The **Profit & Loss report**is an export of the organization's **Profit & Loss Statement**.
- The information in the exported **Profit & Loss report**is the same as the profit & loss statement that you can view in Jaz. For more information about the profit & loss statement and viewing it within Jaz, you may refer to [Profit & Loss statement](https://help.jaz.ai/en/articles/9070576-profit-loss-statement)
- You can also choose to export the profit & loss statement organized and tabulated by month by exporting the **Profit & Loss by Month report.Q13. What is a cashflow report?**

- The **Cashflow report**is an export of the organization's **Cashflow Statement**.
- The information in the exported **cash flow report**is the same as the cash flow statement that you can view in Jaz. For more information about the cashflow statement and viewing it within Jaz, you may refer to [Cashflow Statement](https://help.jaz.ai/en/articles/9070577-cashflow-statement)

**Q14. What is a balance sheet report?**

- The **Balance Sheet report**is an export of the organization's balance sheet.
- The information in the exported **balance sheet report**is the same as the balance sheet that you can view in Jaz. For more information about the balance sheet and viewing it within Jaz, you may refer to [Balance Sheet](https://help.jaz.ai/en/articles/9070574-balance-sheet)

**Q15. What is an equity movement report?**

- This **equity movement report**tracks changes in equity over a period, including contributions by and distributions to owners, profits retained in the organization, and other adjustments.
- It provides insights into how equity is being used and generated in your organization, offering a view of the organization's financing strategy and its effectiveness in growing the equity base.

**Q16. What is a tax ledger?**

- The **tax ledger**compiles all transactions relevant to taxation, including tax payable, tax credits, and deductions.
- You can use the tax ledger to help your organization with tax planning and compliance, ensuring that your business accurately reports its tax obligations and maximizes any available tax benefits.

**Q17. What is a general ledger report?**

- The **General Ledger Report** extracts data from the organization's**General Ledger**, which is a complete record of all financial transactions over the life of a company.
- The information in the exported **General Ledger Report**is the same as the general ledger. To learn more about the **General Ledger**in Jaz, you can refer to [this link](https://intercom.help/jaz-ca1acb882400/en/articles/9073368-general-ledger).

**Q18. Can I customize reports?**

- If you need any customized reports, such as other financial information or report structures, please reach out to us at[support@jaz.ai](mailto:support@jaz.ai) for assistance.

---
