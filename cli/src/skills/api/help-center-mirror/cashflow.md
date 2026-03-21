### Cash Transfer
Source: https://help.jaz.ai/en/articles/13882606-cash-transfer

**Q1. What is a cash transfer?**

- A cash transfer moves funds from one bank account to another.
- It automatically creates a cash out entry from one account and a cash in entry to the other in your Cashflows.

**Q2. How do I make a cash transfer?**

- Go to Reconciliations > Cashflows > click the New Direct Entry dropdown and select Cash Transfer.
- Choose the bank account to transfer from and the bank account to transfer to.
- Enter the amount, transfer date, and reference.
- Contact, Tracking Tags, Internal Notes, and Attachments are optional.

**Q3. Where can I see all my cash transfer records?**

- Go to Cashflows > Direct Entries > Cash Transfers.

**Q4. Can I duplicate a cash transfer?**

- Yes. Open a cash transfer record, click the three-dot icon, and select Duplicate.

**Q5. Can I edit a cash transfer?**

- Yes. Open the cash transfer record and update the necessary details before saving.
- Editing a cash transfer will reset any existing reconciliation linked to it.

**Q6. Can I delete a cash transfer record?**

- Yes. Open the cash transfer record, click the three-dot icon, and select Delete.
- Deleting a cash transfer will reset any existing reconciliation linked to it.

**Q7. How is a cash transfer recorded in the ledger?**

- It credits the sending bank account and debits the receiving bank account.
- No income or expense accounts are affected.

**Q8. Can I reconcile a cash transfer?**

- Yes. During bank reconciliation, you can match the cash transfer entry with the corresponding bank record.

**Q9. How do I know if a cash transfer is reconciled?**

- Open the cash transfer record.
- A reconciled icon will appear next to the bank account that has been reconciled.

**Q10. When should I use Cash Transfer instead of a Journal Entry?**

- Use Cash Transfer when moving funds between your own bank or cash accounts.
- It records the transaction as a movement of money rather than an accounting adjustment.
- This ensures it appears correctly in your Cashflow report and supports bank reconciliation.

**Q11. Can I attach proof of transfer?**

- Yes. You can upload supporting documents such as transfer receipts when creating or editing a cash transfer.

**Q12. Can I make an advance cash transfer?**

- Yes. Set a future transfer date when creating the cash transfer.

**Q13. Can I transfer between bank accounts with different currencies?**

- Yes, if multi-currency is enabled.
- Exchange rates will apply based on your currency settings.

**Q14. Can I put a cash transfer into a capsule?**

- Yes. When creating or editing a cash transfer, click the capsule icon in the reference field to assign it to a capsule.

---

### Cashflows
Source: https://help.jaz.ai/en/articles/9095678-cashflows

**Q1. What are cash flow transactions in Jaz?**

- Cashflow transactions are transactions that involve the movement of money in your business.
- These transactions include invoice payments, bill payments, customer refunds, supplier refunds, and journals created with payment accounts.

| **Transaction Type** |**Description** | **How to Create** |
| --- | --- | --- |
| **Invoice Payments** | Payments created against an invoice. | Created from an Invoice.Created while importing invoices.Created from the bulk payment flow.Created while reconciling a statement line matched with an invoice (payment is created in the background).Created from Invoice receipt flow from Invoices or Bank Reconciliations.Magic Match flow. |
| **Bill Payments** | Payments created against a bill. | Created from bills.Created while importing bills.Created from the bulk payment flow.Created while reconciling a statement line matched with a bill (payment is created in the background).Created from Bill receipt flow or Bank Magic Match flow.Reconciliations |
| **Customer Refunds** | Refunds created against customer credit notes. | Created from customer credit notes.Created while reconciling a statement line against a customer credit note (refund is created in the background).Magic Match flow. |
| **Supplier Refunds** | Refunds created against supplier credit notes. | Created from supplier credit notes.Created while reconciling a statement line against a supplier credit note (refund is created in the background).Magic Match flow. |
| **Cash Journals** | Journals created with cash/bank account types | Created from the Journals tab.Created while reconciling a statement line. |
| **Direct Cash-In** | Templated transactions where money is deposited into a cash/bank account, with balancing entries in non-bank/cash accounts. | Created from the Cashflow tab.Created while reconciling a cash-in statement line.Created by adding an adjustment entry. |
| **Direct Cash-Out** | Templated transactions where money is withdrawn from a cash/bank account, with balancing entries in non-bank/cash accounts. | Created from the Cashflow tab.Created while reconciling a cash-in statement line.Created by adding an adjustment entry. |
| **Cash Transfer** | Templated transaction used to transfer money between two cash/bank accounts, selecting one as the source and the other as the destination. Only cash/bank accounts can be used. | Created from the Journals tab. Created while reconciling a statement line. |**Q2. How can I see if my payment record is reconciled with a statement line?**

- A reconciled payment record can be found under the **Reconciled**tab.
- A payment record that is reconciled with a statement line will have the **Reconciled**icon in the payment record's detail modal.

**Q3. Can I add negative amounts in my cashflow?**

- Yes, negative amounts can be recorded in Direct Cash-in, Direct Cash-out, and Bank Reconciliation (BR) Adjustments.

**Q4. How are negative amounts calculated?**

- **Cash-in:**Positive amounts are credited, while negative amounts are debited.
- **Cash-out:**Positive amounts are debited, while negative amounts are credited.
  - Note: Cash Transfers and Quick Reconcile do not support negative amounts. The total sum cannot be negative—saving will be disabled if the total is less than or equal to zero.

---
