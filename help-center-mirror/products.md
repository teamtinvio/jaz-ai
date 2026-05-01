### Catalogs
Source: https://help.jaz.ai/en/articles/11507665-catalogs

**Q1. How do I create catalogs?**

- To create catalogs, go to Products > Catalogs > New Catalog
  - Fill in the details
  - Include items from your Items List or create new items by filling in the details
  - You can also select contact groups where you want your catalog to appear
  - If you change the original details from an Item, a reset function will appear for that field.

**Q2. Does Catalogs support all transactions?**

- Catalogs currently supports Sales Transactions:
  - Invoices
  - Customer Credits
  - Scheduled Invoices
  - Scheduled Subscription Invoices

**Q3. How to use a catalog**

- When creating or editing a transaction, click the drop down icon in the item/description field to view your catalogs.
- Choose a catalog and it applies to all the items contained in that catalog.
- The items that are applied can still be edited during creation or editing.

**Q4. Can edit, delete, or hide a catalog?**

- Yes. To manage your catalogs, go to Products > Catalogs
- You can do the following to manage your catalogs:
  - Edit
    - Edit details within a catalog
  - Delete
    - This will delete the catalog but will not affect transactions you used a catalog before
  - Make Inactive
    - This will hide the catalog during transaction creation

**Q4. If I delete a catalog, will it also delete the items associated with the catalog?**

- No. Individual items will not be affected and can still be accessible in Items List.

**Q5. Why can’t I access Catalogs?**

- Catalogs is only for organizations under Essentials or Growth Plan.

---

### Import Items
Source: https://help.jaz.ai/en/articles/10480498-import-items

**Q1. What is the maximum number of items I can import at once?**

- You can import up to 1,000 items per batch.

**Q2. What file formats are supported for import?**

- Only .xlsx files are supported for item imports.

**Q3. Can I update existing items using import?**

- Yes, importing allows you to update existing items based on the details provided in the template.

**Q4. What should I do if my file exceeds the 2MB size limit?**

- Reduce the number of items in your file and re-upload to stay within the size limit.

**Q5. If I update an existing item, will it affect past transactions?**

- No, updates to existing items will only apply to future transactions. Past transactions remain unchanged.

**Q6. How can I fix errors in the imported items?**

- Errors will be highlighted in the import review process. To fix:
  - Open your import template.
  - Locate and correct the highlighted errors (e.g., "Item Code is required").
  - Save and re-upload the file to complete the import process.

​

---

### Inventory
Source: https://help.jaz.ai/en/articles/12274576-inventory

**Q1. How to create an inventory item?**

- Go to **Products** >**Items List** > click **New Item** > choose**Inventory **as the**item category**, and fill in the required fields.**Q2. Can I import inventory items?**

- Yes, go to **Products** >**Items List** > **+ New Item** >**Import Items** > **Inventory Items.Q3. What are the costing methods in Jaz's inventory?**

- There are only two costing methods available. Fixed Cost and Weighted Average Cost.
  - **Fixed Cost:** uses one consistent cost for an item. This is often used when businesses compute fully landed costs (like shipping, customs, or handling fees) outside Jaz, or when they prefer to set their own standard cost for COGS.
    - Note: This option is provided for flexibility and is not a standard FRS/GAAP costing method.
  - **Weighted Average Cost:**recalculates the unit cost whenever new stock is added, averaging old and new costs.
  - **Note:** Once selected for an inventory item, the costing method cannot be changed.**Q4. What does Block Insufficient Deductions do?**

- Enabling this prevents transactions that would reduce inventory stock below zero.
- **Note:** If you enter a sales quantity greater than the available stock, the**QTY field turns orange** to indicate insufficient stock.

**Q5. How do I create inventory accounts?**

- Create these in your [Chart of Accounts](https://help.jaz.ai/en/articles/8938028-chart-of-accounts-coa).

**Q6. Can I edit inventory items?**

- Yes, to edit your inventory items, go to **Products** >**Items List** >** Inventory ItemsQ7. Can I delete inventory items?**

- Yes. Select the item, click the options icon, and choose Delete.
- You can also mark items as Inactive, which hides them as options in transactions.

**Q8. Where do I manage my inventory?**

- Head over to **Products** >**Inventory** to manage:
  - **Balances**: current stock levels
  - **Quantity Movements:** additions and deductions
  - **Cost Movements:** changes in unit cost**Q9. What affects quantity movements in inventory items?**

- **Increase stock:** Recording bills, customer credit notes, and journal entries.
- **Decrease stock:** Recording sales, supplier credit notes, and journal entries.**Q10. How to track quantity movements?**

- Click **Quantity Movements** on your inventory dashboard to view:
  - **All:** shows every quantity movement
  - **Additions:** items added to stock
  - **Deductions:** items removed from stock**Q11. How to track cost movements of my inventory items?**

- Click **Cost Movements**on your inventory dashboard to view:
  - **All:** shows every cost movement
  - **Above Average:** shows transactions with costs higher than the average
  - **Below Average:** shows transactions with costs lower than the average**Q12. Can I turn my Sales or Purchase items I previously recorded into an inventory item?**

- No. This restriction ensures accurate costing, inventory tracking, and financial reporting.

**Q13. How do I know if an item is an inventory item?**

- Inventory items are marked with a cube icon, making them easy to identify.

---

### Items List
Source: https://help.jaz.ai/en/articles/9094095-items-list

**Q1. What do the active and inactive buttons do for an item?**

- Active items will show up as options for selection in the business transactions. Inactive items will be hidden.

**Q2. How to view transactions for items (i.e. supplier credit, invoices, etc.)?**

- The transactions where an item is used can be found at the bottom of the item details.

**Q3. How can I track the Cost of Goods Sold (COGS) in the items list?**

- Toggle COGS on for the item.
- Set the COGS account and inventory account for the item.
- For every unit sold (any currency), the cost price (in base currency) excluding taxes will be added to the COGS account and deducted from the inventory account.

**Q4. What is the difference between an Internal Name and a Sale Name?**

- The **Internal Name** will be used as the name to identify the item within the organization. The internal name will not be displayed in the invoice/bill.
- The** Sale Name/Purchase Name** will be used as the display name for each respective record. The generated PDF and record data will display the Sale Name/Purchase Name.

**Q5. How do I determine which accounts to associate with each item?**

- For a **Sale** Item: An account that you would use to track revenue, typically a**Revenue Account.**
- For a **Purchase** Item: An account that you would use to track expenses, typically an**Expense Account.**
- If you are tracking **COGS** for the item: Select an account that you're using to record and track expenses related to the cost of goods sold.**Q6. Is there a limit to the number of items I can add?**

- Currently, there is **no**limit to the number of items that you can add.

**Q7. How will deleting a tax profile impact my items?**

- The tax profile will be removed from items that had the tax profile selected as their Sale/Purchase Tax profile.
- The next time you select the item in a transaction the tax profile will be empty.

**Q8. How will making an account inactive impact my items?**

- The account will be removed from items that have the inactive account selected as the Sale/Purchase/COGS account.
- The next time you select the item in a transaction the account will be empty.

**Q9. What is an item code?**

- An item code is used to label and track items internally within Jaz, for the organization's use.
- The item code is not shown to customers.

**Q10. Can I create an item with a duplicate item code?**

- No, all item codes must be unique.

---

### Managing Items
Source: https://help.jaz.ai/en/articles/8938037-managing-items

**Q1. How do I modify (edit/delete) an item?**

- You can **Edit/Delete**an item via the 3 dot menu
- **Note:**Deleted items cannot be recovered or retrieved.

**Q2. How do I set an item as active or inactive?**

- Toggle the state of an item to make it active/inactive or set it via menu settings.

---
