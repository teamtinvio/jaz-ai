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
