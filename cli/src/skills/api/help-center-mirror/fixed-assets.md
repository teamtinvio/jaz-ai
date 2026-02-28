### Fixed Assets
Source: https://help.jaz.ai/en/articles/9575775-fixed-assets

**Q1. How can I register a fixed asset?**

- In Jaz, there are two main ways of registering a fixed asset:
  - **Adding**a new fixed asset, that you have not registered elsewhere.
  - **Transferring**a new fixed asset, that you may have previously registered elsewhere and started depreciating.

**Q2. What are the depreciation methods currently available?**

- Currently, only the **Straight Line** method is available in Jaz.
  - Depreciation will take place in a linear fashion, with a depreciation expense being recorded every month.
  - Depreciation expenses are spread on a monthly basis, meaning that assets that are disposed of part way into a month will still see a full month's worth of depreciation.
- You can also register fixed assets without depreciating them (Select **No Depreciation** under**Depreciation Methods**).**Q3. When are depreciation expenses recorded/realized?**

- Currently, all depreciation entries will automatically be realized on the last day of every calendar month.
- The most recent entry that was realized will be marked with a **calendar icon** on the depreciation schedule.**Q4. Can I change when the depreciation expenses are recorded/realized?**

- Currently, you may not change the date when expenses are realized.

**Q5. Why do I not see all of my COA accounts when selecting accounts for my assets?**

- For the **Accumulated Depreciation Account** for a fixed asset, you can only select accounts with the account type**Fixed Asset**.
- For the Depreciation Expense Account for a fixed asset, you can only select accounts with the account type **Expense.Q6. Why can't I select an account when registering/transferring a fixed asset, although it is of the correct account type (fixed asset/expense?)**

- There may be a lock date set on the account, that is after the date of the first scheduled depreciation expense entry.
- For more information on how lock dates work and affect fixed assets, refer to [Lock Dates (COA)](https://help.jaz.ai/en/articles/9577112-lock-dates-coa).

**Q7. What is a purchase entry for a fixed asset?**

- A **purchase entry**for a fixed asset on Jaz refers to the business transaction recorded when buying a **new** fixed asset.
- This can be created as:
  - A bill, where one of the line items is a fixed asset being purchased, or
  - A journal entry, where the account for the **debit**entry has a **Fixed Asset**account type.

**Q8. Can I create a fixed asset without associating it with a purchase entry?**

- No, all newly created (not transferred) assets must have an associated purchase entry.
- As such, you must create the purchase entry for the fixed asset **before**creating the fixed asset.
- Note that once a purchase entry (bill line item or debit line on a journal entry) has been linked to a fixed asset, it **cannot**be linked to other new fixed assets.

**Q9. What is the depreciable value for a fixed asset?**

- In Jaz, **Depreciable Value**refers to the total depreciation expense that will be accumulated for a fixed asset over its useful life.
- This is calculated in the following manner:
  - **Depreciable value** =**Purchase Value** - **Residual Value**
    - If a **Cost Limit** is set for the asset, this value will be used instead of the purchase value.**Q10. What is the cost limit for a fixed asset?**

- The **Cost Limit** is the maximum depreciable value for a fixed asset.
- If set, this value must be less than the Purchase Value of a fixed asset.
- If you do not want to account for or record the entire fixed asset expense for depreciation, you can set this value when adjusting the **Depreciable Value** of an asset.**Q11. What do the "Active", "In-Progress" and "Complete" tabs mean on the fixed assets register?**

- Assets in the **Active**tab are all assets in your fixed asset register, regardless of whether they undergo any depreciation.
- Assets in the **In-Progress**tab are assets that are still undergoing depreciation.
- Assets in the **Complete**tab are assets that have completely depreciated.

**Q12. Where will the records for the depreciation expense entries show up?**

- The records will show up as records in your **General Ledger**, under**Depreciation Expense Account** that you have selected.

**Q13. When transferring in new assets, will the depreciation expenses accumulated so far be recorded in my general ledger?**

- No, Jaz will only record new depreciation entries, starting from the date of transfer.

**Q14. What is a sale entry for a fixed asset?**

- A **sale entry**for a fixed asset on Jaz refers to the business transaction recorded when selling a fixed asset.
- This can be created as:
  - An invoice, where one of the line items is a fixed asset being sold, or
  - A journal entry, where the account for the **credit**entry has a **Fixed Asset**account type.

**Q15. Can I sell a fixed asset without associating it with an existing sale entry?**

- No, all fixed asset sales must be linked to an existing sale entry.
- As such, a sale entry for the asset sale must be created **before**marking an asset as sold.
- Do note that once a sale entry (invoice line item or credit line on a journal entry) has been linked to a fixed asset sale, it **cannot**be linked to other fixed asset sales.

**Q16. I created a sale entry, but I don't see it in the dropdown?**

- If your sale entry is an **invoice**, the line item for the asset that is sold must have the**same fixed asset account** as the fixed asset being marked as sold.
- If your sale entry is a **journal entry**, the account that you select in the** credit**journal entry must be the **same fixed asset account** as the asset account of the asset being marked as sold.**Q17. What happens when I dispose (sell/discard) a fixed asset that is still depreciating?**

- When you dispose of a fixed asset while it is still undergoing depreciation, the following happens:
  - A final depreciation expense will be recorded on general ledger, on the depreciation end date that you have selected.
  - If you sold the asset, the record relating to the sale entry will show up in the general ledger as well.

**Q18. Are there any impacts on my financial records if I modify (edit/delete) an asset?**

- When **editing**an asset, associated ledger entries (such as the ones to the fixed asset and depreciation expense account) will get recreated.
- When **deleting**an asset, all associated general ledger entries will be deleted.
- The recreation/deletion of ledger entries are still subject to the lock dates of associated fixed asset/expense accounts. For more information on lock dates, please refer to [Lock Dates (COA)](https://help.jaz.ai/en/articles/9577112-lock-dates-coa).

**Q19. Are there any impacts on my financial records if I modify any (delete or undo) disposals?**

- In Jaz, deleting a disposal is treated as deleting a disposed fixed asset. As such, all associated ledger entries will be deleted, including previously recorded depreciation entries, as well as the ledger entry relating to the disposal.
- When **undoing**a disposal, the fixed asset will be returned to the register. The associated disposal ledger will be reversed, and depreciation entries that were previously reversed will be recorded again.

**Q20. Why am I getting an error while trying to modify an asset or a disposal?**

- If the asset you are modifying makes use of an account with a lock date, you may not be able to modify or dispose of the asset.
- Refer to Lock Dates (COA) for more information on how accounts with lock dates affect your fixed assets.

**Q21. Why can't I add or manage assets on the fixed asset register?**

- Make sure that you have permissions for activities relating to fixed assets - either **Preparer**or **Admin**permissions.
- For more information on user permissions, see [User Management](https://help.jaz.ai/en/articles/9066648-user-management)

**Q22. Why can't I create draft fixed assets?**

- Only users that have **Preparer**or **Admin**permissions for fixed assets can create or save draft fixed assets.

**Q23. Who can convert draft fixed assets to active?**

- Only **Admins**can convert draft fixed assets to active fixed asset.

---
