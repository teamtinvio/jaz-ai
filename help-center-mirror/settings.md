### Switch Organizations
Source: https://help.jaz.ai/en/articles/9094201-switch-organizations

**Q1. How can I switch to another organization without logging out?**

- You can do so by switching organizations within Jaz.

**Q2. How can I view a list of all the organizations I am a user of?**

- The list shown under **Switch Organizations**are all the organizations that you are a user of.

---

### Account Settings
Source: https://help.jaz.ai/en/articles/8938015-account-settings

**Q1. How can I change my phone number and email on Jaz?**

- You cannot update your phone number or email via the accounts settings page. If you wish to update any of them, please reach out to our support team at [support@jaz.ai](mailto:support@jaz.ai)

**Q2. How can I delete my account?**

- Go to **Settings.**
- Under **Account Settings**, click on**Delete Account**.
- Your account and associated data will be deleted within 24 hours of your request. **Note**: If you are the Super Admin of your organization, you will have to transfer your role to another user before the deletion process can be initiated. This can be done by clicking on the**Manage Roles** option from the toast displayed after clicking on **Delete Account** at the bottom.**Q3. Why can't a super admin delete their own profile?**

- Super Admins hold the highest rank within an organization. Each organization must have at least one Super Admin. As such, if you are the Super Admin, you cannot delete your own account without [transferring](#h_14a850ebd1) your role to another user.
- For more information on roles & permissions in Jaz, please refer to **[User Management](https://help.jaz.ai/en/articles/9066648-user-management)Q4. How can I transfer my Super Admin role to another user?**

- To transfer your Super Admin role, select a member, update their permissions, and assign the Super Admin role. You'll be downgraded to Admin immediately.
- **Note:** Only Super Admins can see the Super Admin role.**Q5. What does it mean to transfer my role to another user?**

- Transferring your role means you will transfer your access rights and permissions to another user in the same organization. Only the Super Admin role can be transferred.

**Q6. Is there a waiting period before my profile is deleted after transferring my role?**

- There is 24 hour waiting period before your profile and data is deleted.

**Q7. How can I cancel a "delete account" request?**

- You may contact us via [support@jaz.ai](mailto:support@jaz.ai) if you wish to cancel the request to delete your account.

**Q8. How can I log in to my Jaz account?**

- For information on logging into Jaz, refer to [Onboarding](https://help.jaz.ai/en/articles/9117115-onboarding)

**Q9. How do mobile notifications work in Jaz?**

- To receive mobile notifications, download the Jaz app on [iOS](https://apps.apple.com/us/app/jaz-accounting/id6446179376) or [Android](https://play.google.com/store/apps/details?id=com.tinvio.jaz&hl=en_US&pli=1). By default, all notifications are enabled. You can customize them per organization:
  - **Transaction** – alerts for approvals and key activities
  - **Collaboration** – mentions and comments from team members**Q10. Why am I not receiving mobile notifications?**

- Ensure you’ve updated the Jaz app to the latest version.
- Check your device settings to confirm that notifications for the Jaz app are enabled.

---

### Appearance
Source: https://help.jaz.ai/en/articles/10129973-appearance

**Q1. What are the available appearance options?**

You can choose between two color schemes:
- **Modern**: A refreshed look with vibrant colors.
- **Minimal**: A simpler, understated color palette.**Q2. How do I change the appearance option?**

1. Go to **Settings > Appearance Options**.
1. Select either **Modern** or**Minimal**.
1. The dashboard visuals will update to reflect your chosen color scheme.

**Q3. Does changing the appearance affect functionality?**

No, all dashboard functionalities and export features remain unchanged. The Appearance Options only alter the visual color scheme.

**Q4. What other improvements were made to the appearance?**

We’ve enhanced the transition between color schemes, ensuring a smooth and seamless experience as you switch between Modern and Minimal.

---

### API Key
Source: https://help.jaz.ai/en/articles/11710903-api-key

**Q1. What is an API key in Jaz, and what does it do?**

- An API key in Jaz is a secure credential that lets external systems access your org’s data. This is ideal for developers integrating Jaz with other tools.

**Q2. Where can I manage API keys?**

- Go to Settings > Access Management > API Keys
- From the API Keys tab, you can generate new keys, assign roles, view masked keys, and manage access.

**Q3. How secure are API keys in Jaz?**

- Jaz securely generates, hashes, and stores API keys.
- The full key is shown only once during creation and won’t be fully visible again. After that, only masked previews are visible for security.

**Q4. What happens when I create an API key? What does “created by” mean in the API?**

- Creating an API key also creates a linked shadow user with a placeholder email to represent the key in your organization’s permissions. Shadow users cannot access the UI.

**Q5. Can I control API key permissions?**

- Yes. You assign roles and permissions to API keys the same way you do for regular users. This ensures that keys only have access to the data and actions they need.

**Q6. Can API key users log in to the app?**

- No. API key accounts are restricted from UI access. They cannot log in to your account and are intended strictly for API use.

**Q7. How are API keys displayed in Jaz?**

- In the API Keys tab, each key is shown with:
  - A masked preview of the key
  - The assigned role and permissions
  - The linked shadow user email
  - Creation date and created by info
  - Full key details are never retrievable again after creation. This keeps the key secure.

**Q8. What happens if I lose an API key?**

- If the full key is lost, you’ll need to generate a new one. For security, Jaz does not store or display the full key after it’s first shown.

**Q9. Who can manage API keys (create, edit, delete)?**

- Only users with User Access Management permission can create, edit, or delete API keys.

**Q10. What happens when an API key is deleted?**

- Deleting an API key also removes its linked user and organization user records.

**Q11. How does authentication work with API keys?**

- The backend supports authentication using existing JWT tokens, which are securely passed through request headers.

---

### Access Management
Source: https://help.jaz.ai/en/articles/9066648-access-management

**Q1. What type of limitations can be set for an admin?**

- Turning on access to "Organization" under "Organization Permissions" provides admins with the ability to edit information about the organization.

- Turning on User Management provides the ability to edit the rights of other users, and to add new users.

**Q2. How can I create a custom user?**

- Select **Custom User** as the user role in user management.
- Adjust the individual activity permissions for the custom user.
- Choose between Admin, Preparer, or Member permissions for the user.

**Q3. What can users with member access for Invoices (AR)/Bills (AP) do?**

- Users will be able to see all invoice data and create invoice drafts. They can submit the drafts for approval to the admins of the organization.

**Q4. How can I edit a user's permission settings?**

- You can edit permissions for a user via the sidebar on a user's profile.

**Q5. What is a Super Admin in Jaz?**

- In each organization, there can only be 1 **Super Admin.**This is usually the account that created the organization.

- By default, Super Admins have permissions for **all**activities on Jaz. They also have access to all Organization permissions, which include Organization and User Management permissions.

**Q6. What are some default permissions for an admin user?**

- Admins are similar to Super Admins, and by default will have admin permissions for all activities.

- Super Admins can set Organization Permissions for Admins, however, Admins cannot change the permissions that have been previously set.

- **Note**: If Organization and User Management permissions were disabled for the Admin user, those sections will be inaccessible.**Q7. What does it mean to be a preparer or a member as a custom user?**

In Jaz,
1. **Preparers can:**
  - View all transactions
  - Create and submit all drafts for approval

1. **Members can:**
  - View and access their own transactions
  - Create and submit their own drafts for approval.

**Q8. Are there limits on the number of users or roles in Jaz?**

- Yes, limits depend on your plan:
  - **Free:** Up to 5 users (all roles)
  - **Essentials:** Unlimited admin users, up to 10 custom users
  - **Growth**: No limits
- For the latest information on the different plans, please refer to [https://jaz.ai/pricing](https://jaz.ai/pricing)

**Q9. Once a user is deleted, can they still log in via mobile?**

- User deletion happens across all platforms. If a user is deleted via the web interface, this will carry over to the mobile application as well.

**Q10. Can I add temporary members into my organization?**

- Yes. Timed User Access lets you set an end date and time for a user’s access to your organization. This is ideal for temporary roles.

**Q11. Does timed access count toward my subscription plan limit?**

- Yes. Users with timed access are included in your plan’s [total member limit](#h_3dee72fdf7) for the duration of their access.

**Q12. Where can I view the access expiry?**

- A tooltip showing the expiry will appear next to the user’s join date.

**Q13. What happens when access expires?**

- The user’s access is automatically removed from the organization.

**Q14. Can I edit the access time limit?**

- Yes. You can update or remove the access time limit anytime before it expires.

---

### Accounting
Source: https://help.jaz.ai/en/articles/9091111-accounting

**Q1. How can I change the date/month of the financial year end?**

- You can change the date/month of the financial year end under **Settings > Organization Details > Accounting.**
- Adjust the date and month as needed.

**Q2. Will changing the date/month of the financial year end affect existing data?**

- Changing the date/month of the financial year end does not affect existing data.
- It will only affect the reporting period of your existing data, such as the reporting period that show up in reports.

**Q3. How can I add currencies to my organization?**

- You can add new currencies via **Settings > Organization Details > Currencies.**
- You will find the option to add new currencies there.
- Select desired currencies from the drop-down list
- You will see the new currency added.

**Q4. Can I set exchange rates for the organization's base currency?**

- No, exchange rates cannot be set for the organization's base currency.

**Q5. How can I set exchange rates for a currency?**

- Go to **Settings > Organization Details**
- Under **Accounting**, choose a currency.
- Add a new custom rate.
- Set the **Start**and **End**date for the custom rate.
- Enter the rate in your preferred denomination, e.g. 1 SGD: 1 USD or 1 USD: 1 SGD (Assuming that SGD is the base currency)
- You can switch the currencies to enter the correct rates by clicking on the **flip**icon.

**Q6. If a custom exchange rate is set for 1 set (e.g., 1 SGD = x USD), will Jaz calculate the corresponding flipped exchange rate (e.g., 1 USD = x SGD)?**

- Yes, Jaz will also calculate the corresponding flipped exchange rate whenever a custom rate is added.

**Q7. What does it mean to add custom rates for a currency in Jaz?**

- Adding custom rates for a currency means your organization can set up its own exchange rates instead of relying on third-party rates.

**Q8. Can I choose specific dates or date ranges for custom rates?**

- Yes, you can set a custom rate for a single day or a date range by selecting the **Start**and **End**date.

**Q9. Can I delete a currency added?**

- Once you have added a currency, you cannot delete it from Jaz.

**Q10. Is there a limit to the number of currencies I can add?**

- Currently, there are no limits to the number of currencies you can add on Jaz.

**Q11. Will setting custom rates affect my existing transactions?**

- No, configuring custom rates for a specific date range where transactions already exist will have no impact on them.
- Transactions are recorded with fixed rates at the time of creation.

**Q12. Which third-party services does Jaz support for fetching currency rates?**

- Jaz is integrated with the ECB to fetch rates daily. ECB supports 30 currencies at the moment. All the other currency exchange rates are fetched from currencyAPI if there are no custom rates already set.
- Jaz fetches closing rates for each calendar date for the respective currency pairs on a daily basis, at about 15:30 GMT.

**Q13. How often are the currency rates updated when fetched from third-party services?**

- Daily, at about 15:30 GMT

**Q14. Is it possible to utilize third-party rates alongside existing custom rates?**

- When available, Jaz will always make use of custom rates set by the organization first. Jaz will only pull from 3rd party sources if custom rates have not been set, or are unavailable.

**Q15. How can I modify custom rates?**

- Go to **Settings**> **Organization Details**
- Under **Accounting**, choose a currency with custom rates.
- Edit or delete the custom rate as desired.
- Modify the exchange rate or adjust the start and end dates.

**Q16. Can I retrieve deleted custom rates?**

- No, once custom rates are deleted, they cannot be recovered.
- Instead, you can create a new custom rate.

**Q17. Can I use a currency in a transaction even if no custom rate is set?**

- Yes, if there is no custom rate added to the organization, Jaz will fetch the latest rate from a third-party provider.

---

### Addresses
Source: https://help.jaz.ai/en/articles/9090852-addresses

**Q1. Can I have same billing and delivery address?**

- Yes, save time by turning on **Same as Billing Address** toggle to have same delivery address as the billing address.**Q2. What if my organization's billing & delivery address are no longer the same? **

- Switch off the **Same as billing address** toggle to review the primary delivery address fields.
- Make changes to the address as needed.

**Q3. Will changing the billing/deliver address affect any existing data?**

- No, it will not affect any existing data. Any changes made will only show up in new business transactions.

**Q4. How many billing addresses can be added for an organization?**

- Only 1 billing and 1 primary delivery address can be added for an organization.

**Q5. How many delivery addresses can be added for an organization?**

- There are no restrictions on the number of delivery addresses that can be created for an organization.

**Q6. What if my organization's billing & delivery address are no longer the same?**

- Switch off the **Same as billing address** toggle to review the primary delivery address fields.
- Make changes to the address as needed.

---

### Bookmarks
Source: https://help.jaz.ai/en/articles/9093529-bookmarks

**Q1. What is a Bookmark in Jaz?**

- A **Bookmark**in Jaz is a name and value pair, that helps you organize information for quick access.

**Q2. How do I create a Bookmark?**

- To create a **Bookmark,**click on **+ New Bookmark**.
- You will be shown the **New Bookmark**screen, which will allow you to enter bookmark details.
  - **Category:**The category that the bookmark is related to, e.g. "Audit & Assurance", or "Banking & Finance".
    - Please view the list of categories available within Jaz.
  - **Type**:The data type of the bookmark.
    - You can select from the following bookmark types: Boolean, Date, Link, Number, Text.
- After creating a bookmark, you should see the new bookmark show up in the list of bookmarks.

**Q3. How do I modify a Bookmark?**

- Go to **Settings**> **Organization Details**
- Edit or delete the selected bookmark as desired.
- **Note**: If a bookmark is marked as deleted, you will not be able to undo the action or retrieve the deleted bookmark.

---

### Details
Source: https://help.jaz.ai/en/articles/9062942-details

**Q1. How can I access my organization details?**

- You can access your organization details under **Settings > Organization Details.Q2. How can I change my organization's name?**

- Under **Settings** >**Organization details**, change the organization name as desired.**Q3. Will changing the organization name affect existing data?**

- No, changing the organization name will not affect existing data.

**Q4. Can I update my organization's base currency?**

- No, you cannot update your organization's base currency. The base currency of an organization cannot be changed.

**Q5. What date formats are supported in Jaz?**

- dd mmm yyyy
- mm/dd/yyyy
- dd/mm/yyyy

**Q6. What number formats are supported in Jaz?**

Currently, the number formats supported in Jaz are:
- 123.456,00
- 123,456.00
​

---

### Chart Of Accounts (COA)
Source: https://help.jaz.ai/en/articles/8938028-chart-of-accounts-coa

**Q1. How can I create a new account?**

- Create a new account under **Settings > Configurations > Chart of AccountsQ2. How can I edit the account name for an account?**

- Click on an existing Account and **Edit Account** will appear
- Change the **Account Name**as desired.

**Q3. Can I edit the account type of an existing account?**

- Yes, you can update the account type of an existing accounts only if -
  - Its not a bank/cash account
  - It does not have a lock date

**Q4. How can I delete an account?**

- Accounts that do not have any active transactions, items or assets associated with it can be deleted.
- After deleting any associated transactions or item, click on the 3-dots menu of the account record, and select **Delete**.**Q5. Why can't I delete an account?**

- Make sure that you do not have active transactions, items or assets associated with the account before trying to delete the account.

**Q6. How can I set an account as inactive?**

- You can set the account as inactive via the 3-dots menu on the account record.

**Q7. Can I have 2 accounts of the same name?**

- No, all accounts on Jaz should have unique account names.

**Q8. Can I add more account types?**

- No, you cannot add new account types. The account types will be provided by Jaz by default.

**Q9. What are the available account class & types?**

Under Assets:
- Bank Accounts
- Cash
- Current assets
- Fixed assets
- Inventory
- Non-current assets

Under Expenses:
- Direct costs
- Operating expenses
- Other expenses

Under Equity:
- Shareholders Equity

Under Liability:
- Current Liability
- Non-current liability

Under Revenue:
- Operating revenue
- Other Revenue

**Q10. If I have an existing transaction associated with an account, when I set the account as inactive, what happens to the respective line items?**

- There will be no changes to the existing transactions.
- For new invoices/bills/journals, the account will not be available as an option in the drop-down list when selecting an account on a line item.

**Q11. What is a lock date, and how can I set it for an account?**

- A lock date prevents users in your organization from recording or modifying any transactions associated with the account, on or before the lock date.
- This helps to make sure that any important transactions do not get edited or deleted, which is useful in audit scenarios, or when preparing financial reports.
- To set the lock date for an account, click on **Lock Date**when creating an account to select a Lock Date.
- Alternatively, you can also set a lock date for an account that has already been created by clicking on the account you would like to edit, and adjusting the lock date.

**Q12. What is the "Monthly Movement" of an account?**

- **Monthly movement**refers to the net cash flow for the account in a month. In other words:
  - **Monthly movement = Cash-in to the account - cash-out of the account.Q13. Can I remove an account's lock date? Will it impact my existing transactions?**

- Yes, you can. Removing an account's lock date, it will not impact any existing transactions.
- You will now be able to modify/void/create transactions on or before the previously set lock date

**Q14. Why can I set a currency for a payment account but not for others?**

- A currency can only be set for accounts of type **Asset - Cash**and **Asset - Bank Account**.**Q15. Can I change the currency of an account? What can I do if I have wrongly set up a currency?**

- You cannot change the currency of an account once it has been set up and saved.
- If you have wrongly set up a currency, we suggest recreating the account with your desired currency.

---

### Custom Fields
Source: https://help.jaz.ai/en/articles/9066650-custom-fields

**Q1. How do I create a Custom Field?**

- Go to **Settings**
- Under **Configurations**, click on**Custom Fields.**
- Click on **+ New Field** to add a custom field. This will bring up the**New Custom Field **screen.
  - **The Print on documents**: Toggle this on/off to enable printing the custom field on documents.
- After creation, you will see the newly created custom field, and the business activities that the custom field can be used in.

**Q2. How do I make use of a Custom Field?**

- After creating custom fields, you can find them under **Advanced**under the transaction settings when creating a new transaction.
- Click on **Enter Custom Fields** to see the custom field.
- If the **Print on document**has been toggled off, the custom field will not be printed on the transaction document headers. However, you can still enter a value for the custom field.
  - For example, the **Internal Sales Code**custom field shown below has an eye icon with a strikethrough, indicating that this custom field will not be printed on the transaction document header.
  - However, the value **SALES-001**can still be entered and saved, which can be viewed internally by users of the organization.
- If **Print on document**has been toggled on, the custom field will also show up on the transaction document, and you can enter it directly from the document.
  - For example, the **Sales in Charge**custom field will be visible on the transaction document headers.

**Q3. How do I edit a Custom Field name?**

- Go to **Settings**
- Under **Configurations**, click on**Custom Fields**
- Click on the **menu icon (3 dots)**, and choose**Edit Custom Field.**
- Change the Custom Field name accordingly.

**Q4. Will changing the Custom Field affect existing data?**

- Changing the custom fields will not affect the main transaction data. A custom field is a field you can add as additional information for a transaction.

**Q5. Why is a Custom Field not appearing when creating a business transaction (invoices, bills payable, customer credit, or supplier credit)?**

- Ensure that **Print On Documents** has been toggled on.**Q6. How can I delete a Custom Field?**

- Go to **Settings**
- Under **Configurations**, click on**Custom Fields**
- Click on the **sidebar (3 dots)** >**DeleteQ7. Will deleting a Custom Field affect existing data?**

- No, it will only affect the future transactions you create. The custom field will be selectable for future transactions.

**Q8. What are the available field types in custom fields?**

- Field type determines the nature of the custom field being created.
- Jaz supports 3 field types -
  - **Text**: Enables the creation of a custom text field.
  - **List**: Allows creating a custom field with predefined options in a list.
  - **Date**: Provides a date picker to select a specific date.

---

### Lock Dates (COA)
Source: https://help.jaz.ai/en/articles/9577112-lock-dates-coa

**Q1. What is a lock date?**

- A lock date prevents users in your organization from recording or modifying any transactions associated with the account, on or before the lock date.
- This helps to make sure that any important transactions do not get edited or deleted, which is useful in audit scenarios, or when preparing financial reports.

**Q2. How can I set a lock date for an account?**

- To set the lock date for an account, click on **Lock Date**when creating an account to select a Lock Date.
- Alternatively, you can also set a lock date for an account that has already been created by clicking on the account you would like to edit, and adjusting the lock date.

**Q3. How do lock dates on an account affect my business transactions (e.g sales and purchases)?**

- If an account that you use for a transaction has a lock date set, you may not be able to modify transactions that make use of this account.
- Any actions that may have an impact on records in the General Ledger will be subject to lock date restrictions.
  - For example, on the 10th of July:
    - You try to modify the amount for a line item on an invoice created on 4 July, but the line item uses an account with a lock date of 8 July.
      - You will not be allowed to do so. This is because records relevant to the invoice written to the general ledger will need to be rewritten, but the current date exceeds the account's lock date.
  - Examples of other actions that may not be allowed include deletion or voiding of transactions.
    - Deletion and voiding of transactions have effects on the general ledger (e.g. record reversals).

**Q4. How do lock dates affect me when I register (create/transfer) a fixed asset?**

- Lock dates affect registrations this way:
  - If the first depreciation expense that will be recorded to the general ledger is **before**the lock date of the accounts that you use, you will not be allowed to do so.
    - For example, you choose an **Depreciation Expense Account**that has a lock date of **1st August**, but the first depreciation entry to be realized is on the**31st of July**, you will have to change or remove the lock date on the account.**Q5. How do lock dates affect me when I try to amend a fixed asset?**

- When you amend a fixed asset, Jaz may recreate or record some depreciation expense entries that occur beforethe lock date.
- If your amendments lead to such a scenario, you will have to change or remove the lock date on the account, or make different amendments to your fixed assets.

**Q6. How do lock dates affect me when I try to dispose a fixed asset?**

- When you dispose a fixed asset, there might be effects on previous depreciation entries, such as reversals, where records are deleted and rewritten.
  - If the records that need to be rewritten were originally recorded on a date before the account's lock date, you will not be able to dispose the asset in this scenario.
    - This is because there is an attempt to amend records that were written before the account's lock date.
  - In this case, you will have to change or remove the lock date on the account, or modify your asset disposal.

---

### Nano Classifiers
Source: https://help.jaz.ai/en/articles/10085487-nano-classifiers

**Q1. How do I add a new Nano Classifier?**

1. Go to **Settings > Configurations > Nano Classifiers**.
1. Click on **+ New Classifier** to add a new classifier.
1. Fill in the name for the classifier (e.g., "Department").
1. Add classes under the classifier (e.g., "Engineering," "Sales," "Finance").

The newly created classifier will show up in the list.

**Q2. How do I edit a Nano Classifier?**

1. Go to **Settings > Configurations > Nano Classifiers**.
1. Click on the classifier you want to modify, and choose **Edit**.
1. Modify the classifier name or classes as needed.

**Q3. How do I delete a Nano Classifier?**

1. Go to **Settings > Configurations > Nano Classifiers**.
1. Click on the classifier you want to delete, and choose **Delete**.**Q4. How do I use a Nano Classifier?**

1. After creating Nano Classifiers, you can apply them at the line item level in transactions.
1. Open a new or existing transaction (e.g., an invoice or bill).
1. Click "Select Classifier" to choose from the created classifiers and assign them to line items for more granular reporting.

The selected classifier(s) will then show up on the transaction details.

​

**Q5. Will changing a Nano Classifier affect existing data?**

Modifying a classifier won’t alter historical data but will affect its display in reports and views when using classifier filters.

**Q6. Will deleting a Nano Classifier affect existing data?**

Deleted classifiers remain in historical records but will no longer appear in new transactions.

**Q7. Where can I use Nano Classifiers for filtering transactions?**

In the **Ledger**and **Reports**sections, apply Nano Classifiers as filters to refine data and reports.

**Q8. Which transactions allow Nano Classifiers?**

Nano Classifiers can be added to:
- Invoices
- Bills
- Customer credit notes (CCNs)
- Supplier credit notes (SCNs)
- Manual journals (MJs)
- Direct Cash-in
- Direct Cash-out
- Bank Reconciliation Adjustment
- Fixed Assets
- Schedulers: Invoice, Bills, Ledgers

**Q9. How do I edit a classifier class name?**

1. Go to **Settings > Configurations > Nano Classifiers**.
1. Select the Classes of classifier you want to edit and choose **Edit**.
1. Rename the classifier class as needed. The updated name will automatically appear in associated transactions, ledgers, and reports.

**Q10. What reports can I analyze using Nano Classifiers?**

Currently, Nano Classifiers are supported in ledger reports. Support for additional reports will be available in the future.

**Q11. Can I assign Nano Classifiers to items on the items list?**

Yes, assigning Nano Classifiers to items ensures they are automatically applied to line items in transactions, removing the need for manual assignment.

---

### Online Payments (Collections & Disbursements)
Source: https://help.jaz.ai/en/articles/12274624-online-payments-collections-disbursements

**Q1. How do online payments work?**

- Online payments let you collect payments directly from invoices and disburse amounts in bills. A receipt is automatically generated and a payment record is automatically created.
- It’s required to have a business account in any of the following payment services to proceed:
  - [PayMongo](https://dashboard.paymongo.com/signup?utm_source=hubspot&utm_medium=crm&utm_campaign=platform-deal&utm_content=hs+c+o78377759+d)
  - [Maya](https://support.mayabank.ph/s/article/How-do-I-open-a-Maya-Business-Deposit-account)
  - [Xendit](https://docs.xendit.co/docs/create-account)
  - [Stripe](https://dashboard.stripe.com/register)
  - [HitPay](https://docs.hitpayapp.com/setup/account-creation)
  - [RazorPay](https://razorpay.com/docs/payments/set-up/)
  - [Wise](https://wise.com/us/blog/how-to-open-wise-account)
- Note: Creating a payment service business account can take more than one day because you need to submit documents to prove your business is legitimate. In some cases, some gateways would already have a working API upon signing up, like Paymongo.

**Q2. Do all payment services in Jaz support both collection and disbursement?**

- No. Support varies by provider.
  - Supports both collection and disbursement:
    - PayMongo
    - Xendit
  - Supports collection only:
    - Maya
    - Stripe
    - HitPay
    - RazorPay
  - Supports disbursement only:
    - Wise

**Q3. How do I enable online payments in invoices?**

- Head over to Settings > Configurations > Online Payments > Connect Service.
- Connect a payment service by retrieving your API key from your payment service’s business account settings and entering it in the setup.

Q4. How do I create collection and disbursement profiles?

- Set up your payment services first. Then choose either collection or disbursement profiles and fill in the required fields.
  - For collection profile
    - Fill in the general details
      - Profile Name
      - Currency
      - Payment Account
      - Allow Payments
        - Lets your customers choose how much to partially pay
      - Payment Methods
        - You can choose several payment methods from different payment services you setup
    - Adjust Fee Settings
      - Enable gateway fees
        - Automatically records gateway processing fees
        - Choose COA for the fees and fill in description
      - Enable collection of fees from customers
        - Choose the fee type: percentage, flat amount, or both
        - Choose the COA
        - Input the percentage or flat amount
      - Enable GST
- Note: Each payment method can only be linked to one gateway, but you may duplicate methods if needed.

**Q5. Can I create multiple collection and disbursement profiles?**

- Yes. You can create multiple profiles for different business needs.

**Q6. Is it possible to track gateway fees from online payments?**

- Yes. Enable recording of processing fees in your payment profile under Fees Setting, select the Chart of Account, and add a description. This is currently only available for collection profiles.

**Q7. Can I pass processing fees to my customers?**

- Yes. In your collection profile, go to Fee Settings and enable Fees Collected and set fees by percentage, flat amount, or both.
- You can assign different Chart of Accounts per method and include VAT in the fees.

**Q8. Why can’t I enable online payments?**

- Check that you are using a business account, not a personal account, of your payment gateway since APIs are mostly available for business accounts. Also ensure your [Payment Profile](#h_ca44dee003) is set up and active.

**Q9. Where can I use online payments?**

- For collections: Invoices, subscription schedulers, and invoice schedulers.
- For disbursements: Bills and Bills Payments

**Q10. How do I use my collection profile in invoices?**

- Online payments are off by default. To activate, open the invoice and click Enable Online Payments in the sidebar.
- Note: When using online payments, preview the invoice first to confirm the correct payment option is enabled. Changes to online payment settings apply retroactively.

**Q11. Do payments go directly to my business account?**

- Payments received through invoices are credited to your connected payment service.
- The timing of settlement from your payment service to your bank account depends on the payment provider’s terms and processing schedule.

**Q12. Can customers make partial payments?**

- Yes. You can turn this on in your [collection profile](https://help.juan.ac/en/articles/9994144-how-online-payments-work#heading-3-q4-how-do-i-create-collection-and-disbursement-profiles).
- When a partial payment is made, a partial payment record is created.

**Q13. How do I use my disbursement profile in bills?**

- Select the bills you want to pay in Bills or Bills Payments and click Disburse Payments.
- Add or select the beneficiary account for each vendor. This is the account where the payment will be sent.

**Q14. Can I disburse an amount less than the total bill?**

- Yes. Click on the amount field and enter the amount you want to disburse.

**Q15. Where can I view the amounts I disbursed using my disbursement profiles?**

- Go to **Purchases** >**Payments** > **Disbursements**
- You’ll be able to review the following
  - Completed: view all successful disbursements
  - Action Needed: troubleshoot fault disbursements, usually due to insufficient amount in your payment service
  - In Progress: view all pending disbursements
  - Cancelled: view cancelled disbursements

---

### Tax Profiles
Source: https://help.jaz.ai/en/articles/9066655-tax-profiles

**Q1. How do I add a new GST/VAT profile?**

- Under **Settings > Configurations > GST Profiles/VAT Profiles**
- Clicking on **+ New Profile** will add a new GST/VAT profile.
- The newly created GST/VAT profile should show up in the list of GST/VAT profiles.

**Q2. How do I edit a GST/VAT profile?**

- Under **Settings > Configurations > GST Profiles/VAT Profiles**
- Click on the **menu (3 dots) on your desired GST/VAT profile to edit**, and choose**Edit.**
- Modify the fields (name, type or rate) as desired.

**Q3. How do I use a GST/VATprofile?**

Before using VAT profiles in business transactions, you must first adjust the transaction VAT settings under the transaction settings**.**
- Choose between **GST/VAT Included in Price**or **GST/VAT Excluded in Price.**
- After selecting either GST/VATincluded in Price or GST/VAT excluded in Price, a new **Select GST/VAT**field will appear.
- You can choose from the pre-existing GST/VAT profiles, or select profiles that were added in.
- The tax amounts will then be updated accordingly, on the transaction total summary.

**Q4. Can I use a GST/VAT profile for shipping?**

- Yes, you can use a GST/VAT profile for shipping.
- For more information, refer to [How can I add VAT for shipping fees to my invoice?](https://help.jaz.ai/en/articles/9062234-create-an-invoice#h_657e2a438b)

**Q5. What is a GST/VAT type?**

- GST/VAT Type refers to the categorization of the VAT profile.
- This is pre-selected by Jaz. New GST/VAT profile types cannot be added in.

**Q6. Will changing or deleting the GST/VAT profile affect existing data?**

- If you change the GST/VAT profile via **Configurations**, the change will show up in any transactions that will make use of the GST/VAT profile moving forward. Transactions already created will not be affected.
- However, if the change is made on a transaction level, only the GST/VAT profile for the transaction itself will be affected.

---

### Tracking Tags
Source: https://help.jaz.ai/en/articles/9066651-tracking-tags

**Q1. How do I add a new tracking tag?**

- Click on **+ New Tag**to add new tracking tags.
- Fill in the name for the new tracking tag.
- The newly created tracking tag will show up in the list of tracking tags.

**Q2. How do I edit a tracking tag?**

- Go to **Settings>Configurations > Tracking Tags**
- Click on the tracking tag that you would like to modify, and choose **Edit.**
- Modify the name accordingly.

**Q3. How do I delete a tracking tag?**

- Go to **Settings> Configurations > Tracking tags**
- Click on the tracking tag that you would like to modify, and choose **Delete.Q4. How do I use a tracking tag?**

- After creating tracking tags, you can find them under **Advanced**under the transaction settings when creating a new transaction.
- Click on **Select Tracking Tags**to see the list of tracking tags created in the organization, and select the tracking tags you want to apply.You can use multiple tracking tags in a single business transaction.
- The tracking tag(s) selected will then show up on the transaction details.

**Q5. Will changing the Tracking tag affect existing data?**

- It will not change the records data, but it will affect the data displayed when you're using the tag filters.

**Q6. Will deleting a tracking tag affect existing data?**

- The remaining records that have been tagged will still have the tag attached to the records. However, the deleted tracking tag will not appear in record creation after it's been deleted.

**Q7. Where can I use the tracking tags for filtering transactions?**

- In the General Ledger, you can apply tracking tags as filters:

**Q8. Which transactions allow tracking tags?**

- Tracking tags can be added to:
  - Invoices
  - Bills
  - Customer credit notes (CCNs)
  - Supplier credit notes (SCNs)
  - Manual journals (MJs)
  - Cash-in entries
  - Cash-out entries
  - Cash transfers
  - Items in item lists

**Exceptions:** Tracking tags cannot be added to invoice and bill receipts.

---

### Transfer Trial Balance
Source: https://help.jaz.ai/en/articles/9094240-transfer-trial-balance

**Q1. How can I redo transferring a trial balance if I made a mistake during the process?**

- You can void the transfer balance entry in the manual journal entries list, and input the new transfer balance entry.

**Q2. How can I transfer my trial balance to Jaz?**

- After importing your existing Chart of Accounts, find Transfer Trial Balance  click on the **drop-down** next to**Manage Accounts** > **Transfer Trial Balance**
- Enter the respective **transfer debit** and**transfer credit** amounts.

**Q3. Will transferring my trial balance in Jaz lock any accounts?**

- Yes, after selecting a **transfer date**when creating your trial balance, it will show up as lock dates on all your accounts. For example:

**Q4. Can I add notes/explanations while transferring my trial balance?**

- Yes, you can do so by adding **Internal Notes**for your team, all the way at the bottom of the transfer trial balance screen.

**Q5. Where can I find my trial balance record after it's created?**

- After it's created, you may find it under **Journals.**
- The trial balance record should have a journal type of **Transfer Journal**.**Q6. Can I edit a trial balance record?**

- You cannot edit a trial balance record after it has been created.

**Q7. Can I see who created the trial balance record?**

- Yes. Within the transfer journal record, the **Created By**field shows the user who created the transfer journal**. Q8. How can I void a trial balance? Will it impact my financial records?**

- You can void the trial balance record within the record details screen.
- Voiding previously created trial balances may affect your financial records.
- Here's how your financial records and reports may be affected:
  - **Trial Balance -**The debit and credit amounts of your accounts may see a change.
  - **Balance Sheet -**The total amounts of the different account types may have changes, due to the account totals potentially increasing or decreasing from journal entries being voided.
  - **Profit & Loss -**The overall net profit amount may change as you might see changes to amounts in operating revenue and expense accounts.
  - **Cashflow -**Opening and Ending cash balances may be affected
  - **Ledger -**Opening and closing balances may be affected due to voided journal entries.

**Q9. Does voiding a trial balance impact the lock dates of accounts? If so, how?**

- When a trial balance is first transferred, all the accounts in the Chart of Accounts will be assigned the lock date indicated on the trial balance.
- Hence, when voiding a trial balance, the lock date originally indicated on the trial balance will be removed from all accounts.
- If an account already had a lock date manually applied before the voided trial balance was transferred, the lock date will revert to this previous lock date.
- For more information on lock dates, refer to [Lock Dates (COA)](https://help.jaz.ai/en/articles/9577112-lock-dates-coa)

**Q10. Can I convert a voided trial balance to active?**

- No, you may not. A voided trial balance can only be deleted.

**Q11. Can I create a trial balance in non-base currency?**

- No, transfer trial balances can only be created in your organization's base currency.

**Q12. How can I download a transfer trial balance PDF?**

- After creating a transfer trial balance record, navigate to **Journals**.
- You can download the PDF within the trial balance record.

**Q13. How can I delete a transfer trial balance?**

- You can delete a transfer trial balance after voiding it.

**Q14. Can I retrieve a deleted transfer trial balance?**

- No, you may not. All deletions are final.

**Q15. How can I transfer my trial balance for a non-base payment account to Jaz?**

- You can transfer the trial balance for a non-base payment account by adding the exchange rate to convert the non-base amount to base amount.
- The accounts in non-base currencies will be indicated with an underline in the credit/debit cells.
- Clicking on credit/debit will open the **Convert Amount** modal.
- For the **Exchange Rate:**If there is a custom rate available for your organization's selected currency pair on the trial balance transfer date, Jaz will retrieve that rate. Otherwise, a third-party rate will be fetched.

**Q16. Can I duplicate a trial balance record?**

- Yes, you can duplicate an active/voided trial balance record. To do so, navigate to **Journals**.
- You can duplicate the journal record using the sidebar menu, or within the transfer trial balance record details.

---

### Email Templates
Source: https://help.jaz.ai/en/articles/10729542-email-templates

**Q1. What emails can I customize?**

- You can customize emails related to:
  - Transactions:
    - Invoice
    - Invoice Payment
    - Customer Credit
    - Customer Refunds
  - Reminders:
    - Customer Statement
    - Payment Reminder
    - Subscription Renewal

**Q2. How can I create a new email template?**

- To create a new email template:
  - Navigate to Settings > Templates> Emails> Choose a tab: Transactions/Reminders and click on New Template.

**Q3. What can I edit in the email templates?**

- You can customize the following for your emails:
  - Template Name
  - CC/Reply-to Emails
  - Subject
  - Email Message
  - Currency Format

**Q4. Can I further customize my emails with placeholders?**

- Yes, each email template includes specific placeholders that you can use to customize your message. Use these to auto-fill details in your email templates.

**Q5. Can I duplicate email templates or organize them?**

- Yes, you can duplicate email templates.

**Q6. What are default email templates and how do they work?**

- There are two types of default templates:
  - **Template default for the organization:**This is the default for all emails unless a specific contact default is set.
  - **Template default for a contact:** Applied when a specific email template is set under [Contacts](https://help.jaz.ai/en/articles/8938009-contacts#h_b41c57e3da). It overrides the organization default when the contact is selected during transaction creation or editing.**Q7. Can I set default email templates during the contact import process?**

- Yes, default email templates can be assigned during contact import. The contact import template includes columns for selecting an email template per contact.

**Q8. What happens if I update an existing email template?**

- Updates to an existing template will apply to all future emails using that template.
- Previously sent emails will not be affected.
- You can preview changes before sending emails through the email preview option before sending an email.

---

### PDF Templates
Source: https://help.jaz.ai/en/articles/10729638-pdf-templates

**Q1. What transactions can I customize?**

- You can customize PDF templates for the following transactions:
  - Invoice
    - Note: Delivery Slip and Quotation PDFs will use the invoice template set for the transaction.
  - Invoice Payment
  - Customer Credit
  - Customer Refund
  - Customer Statements
    - Statement of Accounts
    - Statement of Balances

**Q2. How do I create a new PDF template?**

- Go to Settings > Templates > PDFs, then select a tab (Invoices, Customer Credits, or Statements) and click New Template.

**Q3. What sections in the PDF can I edit?**

- You can edit the following sections within a PDF:
  - **General**
Choose from 5 template styles (Classic, Bento, Formal, Overlay, Smooth), customize template name, colors, fonts, and add a unique logo per template.
  - **Header**
Customize title, document details, references, dates, terms, company info, contact details, GST/VAT ID, delivery, and address format.
  - **Table**
Enable/disable tax info, adjust row spacing (Standard, Compact, Relaxed), and customize column headers, widths, and visibility.
  - **Total**
Enable/disable the total section, adjust spacing, configure balance labels, and add a tax summary for detailed breakdowns.
Note: Applies to all templates except customer statement
  - **Footer**
Enable payment options for invoices and edit note titles for both invoices and customer credits.
Note: Applies to all templates except invoice payment and customer refund
- To apply the changes made in these sections, click Update Preview.

**Q4. Can I duplicate templates or organize them?**

- Yes, you can duplicate templates.

**Q5. What are default templates, and how do they work?**

- There are two types of default templates:
  - **Template default for the organization:** This is the default for all contacts unless a specific contact default is set.
  - **Template default for a contact:** Applied when a specific PDF template is set under [Contacts](https://help.jaz.ai/en/articles/8938009-contacts#h_b41c57e3da). It overrides the organization default when the contact is selected during transaction creation or editing.**Q6. Can I set default PDF templates during the contact import process?**

- Yes, default templates can be assigned during contact import. The contact import template includes columns for selecting a PDF template per contact.

**Q7. What happens if I update an existing template?**

- Updating a template applies changes to future transactions but previous PDFs remain unaffected.

---

### Aged Payables (Line Items) Template
Source: https://help.jaz.ai/en/articles/12773761-aged-payables-line-items-template

**Q1. How do I create a new Aged Payables (Line Items) template?**

- Go to **Settings** >**Templates** > **Reports** >**Additional Tab**, then click**New Template** (Aged Payables (Line Items)).
- Alternatively, in **Reports** >**Aged Payables (Line Items)**, click the template selector (top right) and choose New Template.**Q2. What settings can I customize in my Aged Payables (Line Items) template?**

- The Aged Payables (Line Items) template has two tabs: General and PDF.
  - General: Edit template name, baseline period, header, and footer.
  - PDF: Customize layout, header, and footer for PDF version of the report.
    - Note: PDF preview and export are only supported for up to 8 columns.

**Q3. What columns are supported in the Aged Payables (Line Items) template?**

- The Aged Payables (Line Items) template supports the following columns:
  - Adjustable:
    - Transaction Date (locked)
    - Due Date (locked)
    - Supplier Name (locked)
    - Transaction
    - Reference
    - Current (PHP)
    - < 1 Month (PHP)
    - 1 Month (PHP)
    - 2 Months (PHP)
    - 3 Months (PHP)
    - Older (PHP)
    - Balance (PHP)
    - Currency
    - Current (Source)
    - < 1 Month (Source)
    - 1 Month (Source)
    - 2 Months (Source)
    - 3 Months (Source)
    - Older (Source)
    - Contact Group
    - Contact Relationship
    - Note: Transaction Date, Due Date, and Supplier Name are locked. This means you cannot hide or re-arrange them. (PHP) pertains to the org’s default currency.

**Q4. How do I select/hide/arrange columns in the Aged Payables (Line Items) template?**

- To show or hide columns:
  - Click the column icon at the top right of the template.
  - In the panel, you’ll see two lists: Hidden Columns and Selected Columns.
  - To show a column, move it from Hidden Columns to Selected Columns.
  - To hide a column, hover over it in the Selected Columns list and click the hide icon.
- To arrange columns:
  - Click the column icon at the top right of the template.
  - In the Selected Columns list, hover over a row and drag it to your preferred position.

**Q5. How do I duplicate an Aged Payables (Line Items) template?**

- Go to **Settings** >**Templates** > **Reports > Additional Tab**, hover over the template, click the three-dot icon, and select**Duplicate**.**Q6. What happens when I update an Aged Payables (Line Items) template?**

- Changes apply automatically. For previously downloaded reports, redownload them to apply updates.

---

### Aged Payables (Summary Totals) Template
Source: https://help.jaz.ai/en/articles/12773773-aged-payables-summary-totals-template

**Q1. How do I create a new Aged Payables (Summary Totals) template?**

- Go to **Settings** >**Templates** > **Reports** >**Additional Tab**, then click**New Template** (Aged Payables (Summary Totals)).
- Alternatively, in **Reports** >**Aged Payables (Summary Totals)**, click the template selector (top right) and choose New Template.**Q2. What settings can I customize in my Aged Payables (Summary Totals) template?**

- The Aged Payables (Summary Totals) template has three tabs: General and PDF.
  - General: Edit template name, baseline period, header, and footer.
  - PDF: Customize layout, header, and footer for PDF version of the report.
    - Note: PDF preview and export are only supported for up to 8 columns.

**Q3. What columns are supported in the Aged Payables (Summary Totals) template?**

- The Aged Payables (Summary Totals) template supports the following columns:
  - Adjustable:
    - Supplier Name (locked)
    - Current (PHP)
    - < 1 Month (PHP)
    - 1 Month (PHP)
    - 2 Months (PHP)
    - 3 Months (PHP)
    - Older (PHP)
    - Balance (PHP)
    - Customer Tax ID
    - Contact Group
    - Contact Relationship
    - Note: Supplier Name is locked. This means you cannot hide or re-arrange them. (PHP) pertains to the org’s default currency.

**Q4. How do I select/hide/arrange columns in the Aged Payables (Summary Totals) template?**

- To show or hide columns:
  - Click the column icon at the top right of the template.
  - In the panel, you’ll see two lists: Hidden Columns and Selected Columns.
  - To show a column, move it from Hidden Columns to Selected Columns.
  - To hide a column, hover over it in the Selected Columns list and click the hide icon.
- To arrange columns:
  - Click the column icon at the top right of the template.
  - In the Selected Columns list, hover over a row and drag it to your preferred position.

**Q5. How do I duplicate an Aged Payables (Summary Totals) template?**

- Go to **Settings** >**Templates** > **Reports > Additional Tab**, hover over the template, click the three-dot icon, and select**Duplicate**.**Q6. What happens when I update an Aged Payables (Summary Totals) template?**

- Changes apply automatically. For previously downloaded reports, redownload them to apply updates.

---

### Aged Receivables (Line Items) Template
Source: https://help.jaz.ai/en/articles/12773778-aged-receivables-line-items-template

**Q1. How do I create a new Aged Receivables (Line Items) template?**

- Go to **Settings** >**Templates** > **Reports** >**Additional Tab**, then click**New Template** (Aged Receivables (Line Items)).
- Alternatively, in **Reports** >**Aged Receivables (Line Items)**, click the template selector (top right) and choose New Template.**Q2. What settings can I customize in my Aged Receivables (Line Items) template?**

- The Aged Receivables (Line Items) template has three tabs: General and PDF.
  - General: Edit template name, baseline period, header, and footer.
  - PDF: Customize layout, header, and footer for PDF version of the report.
    - Note: PDF preview and export are only supported for up to 8 columns.

**Q3. What columns are supported in the Aged Receivables (Line Items) template?**

- The Aged Receivables (Line Items) template supports the following columns:
  - Adjustable:
    - Transaction Date (locked)
    - Due Date (locked)
    - Customer Name (locked)
    - Transaction
    - Reference
    - Current (PHP)
    - < 1 Month (PHP)
    - 1 Month (PHP)
    - 2 Months (PHP)
    - 3 Months (PHP)
    - Older (PHP)
    - Balance (PHP)
    - Currency
    - Current (Source)
    - < 1 Month (Source)
    - 1 Month (Source)
    - 2 Months (Source)
    - 3 Months (Source)
    - Older (Source)
    - Contact Group
    - Contact Relationship
    - Note: Transaction Date, Due Date, and Customer Name are locked. This means you cannot hide or re-arrange them. (PHP) pertains to the org’s default currency.

**Q4. How do I select/hide/arrange columns in the Aged Receivables (Line Items) template?**

- To show or hide columns:
  - Click the column icon at the top right of the template.
  - In the panel, you’ll see two lists: Hidden Columns and Selected Columns.
  - To show a column, move it from Hidden Columns to Selected Columns.
  - To hide a column, hover over it in the Selected Columns list and click the hide icon.
- To arrange columns:
  - Click the column icon at the top right of the template.
  - In the Selected Columns list, hover over a row and drag it to your preferred position.

**Q5. How do I duplicate an Aged Receivables (Line Items) template?**

- Go to **Settings** >**Templates** > **Reports > Additional Tab**, hover over the template, click the three-dot icon, and select**Duplicate**.

Q6. What happens when I update an Aged Receivables (Line Items) template?

- Changes apply automatically. For previously downloaded reports, redownload them to apply updates.

---

### Aged Receivables (Summary Totals) Template
Source: https://help.jaz.ai/en/articles/12773783-aged-receivables-summary-totals-template

**Q1. How do I create a new Aged Receivables (Summary Totals) template?**

- Go to **Settings** >**Templates** > **Reports** >**Additional Tab**, then click**New Template** (Aged Receivables (Summary Totals)).
- Alternatively, in **Reports** >**Aged Receivables (Summary Totals)**, click the template selector (top right) and choose New Template.**Q2. What settings can I customize in my Aged Receivables (Summary Totals) template?**

- The Aged Receivables (Summary Totals) template has three tabs: General and PDF.
  - General: Edit template name, baseline period, header, and footer.
  - PDF: Customize layout, header, and footer for PDF version of the report.
    - Note: PDF preview and export are only supported for up to 8 columns.

**Q3. What columns are supported in the Aged Receivables (Summary Totals) template?**

- The Aged Receivables (Summary Totals) template supports the following columns:
  - Adjustable:
    - Customer Name (locked)
    - Current (PHP)
    - < 1 Month (PHP)
    - 1 Month (PHP)
    - 2 Months (PHP)
    - 3 Months (PHP)
    - Older (PHP)
    - Balance (PHP)
    - Customer Tax ID
    - Contact Group
    - Contact Relationship
    - Note: Customer Name is locked. This means you cannot hide or re-arrange them. (PHP) pertains to the org’s default currency.

**Q4. How do I select/hide/arrange columns in the Aged Receivables (Summary Totals) template?**

- To show or hide columns:
  - Click the column icon at the top right of the template.
  - In the panel, you’ll see two lists: Hidden Columns and Selected Columns.
  - To show a column, move it from Hidden Columns to Selected Columns.
  - To hide a column, hover over it in the Selected Columns list and click the hide icon.
- To arrange columns:
  - Click the column icon at the top right of the template.
  - In the Selected Columns list, hover over a row and drag it to your preferred position.

**Q5. How do I duplicate an Aged Receivables (Summary Totals) template?**

- Go to **Settings** >**Templates** > **Reports > Additional Tab**, hover over the template, click the three-dot icon, and select**Duplicate**.**Q6. What happens when I update an Aged Receivables (Summary Totals) template?**

- Changes apply automatically. For previously downloaded reports, redownload them to apply updates.

---

### Balance Sheet Template
Source: https://help.jaz.ai/en/articles/12773786-balance-sheet-template

**Q1. How do I create a new Balance Sheet template?**

- Go to **Settings** >**Templates** > **Reports** >**Accounting Tab**, then click**New Template **(Balance Sheet).
- Alternatively, in **Reports** >**Balance Sheet**, click the template selector (top right) and choose New Template.**Q2. What settings can I customize in my Balance Sheet template?**

- Balance Sheet template has three tabs: General, PDF, and Actions.
  - General: Edit template name, baseline period, header, sorting, and footer.
  - PDF: Customize layout, header, and footer for PDF version of the report.
  - Actions: Perform specific functions on a selected column or row.

**Q3. What columns are supported in the Balance Sheet template?**

- Comparative Periods: Choose date range, comparison type (day/month/quarter/year), and display order.
- Variance: Show changes between two columns (amount or %). Multiple allowed.
- Year-to-Date: Show totals from start of year to selected period. Multiple allowed.
- Account Code: Display Chart of Account codes. Only one allowed.

**Q4. How do I add or delete columns in the Balance Sheet template?**

- By default, only the baseline period column is shown.
- To add columns:
  - Click Compare to add additional period columns.
  - Hover over a column line to add Year-to-Date or Account Code columns.
  - Hover over a column line and add Variance once at least two comparison periods are available.
- To delete a column, click the column, then under Actions, select Delete Column.

**Q5. What are the different types of rows in the Balance Sheet template?**

- Accounts that are included in the Balance Sheet template are grouped into Group-level Rows (bold texts) and Child-level Rows (normal texts).
- Group-level Rows represent a group of accounts where you can:
  - Rename the group.
  - Show or hide group totals.
  - Hide the group if all child rows are hidden.
  - Set account criteria to define which accounts are included.
  - Set negative balance rules.
- Child-level Rows represent individual account rows where you can:
  - Create new account groups.
  - Set negative balance rules.
  - Group selected accounts together by choosing Create New Account Group (accounts below will be grouped under it).
- Text Rows allow you to insert custom text and can be added to both group and child levels.

**Q6. How do I add or delete rows in the Balance Sheet template?**

- To add a Group Row, hover over a row line and click **+Account Group**. Enter the group name and account criteria.
- To add a Text Row, hover and select **+Text Row** (available for both group and child levels).**Q7. How do I add a group within a group row?**

- Yes, you can add sub-groups within a group row.

**Q8. My account is not appearing in my Balance Sheet template, what do I do?**

- Check your Chart of Accounts to ensure the account type is included in the Balance Sheet report.

**Q9. What is the Negative Balance rule and how do I use it?**

- The Negative Balance rule defines what happens when an account amount falls below zero. Rules can be applied at both the Group-level Row and Child-level Row.
  - Group Row Rules
    - Choose conditions such as “if accounts are negative” or “if the entire group is negative.”
    - Move negative balances to another group or convert them to positive values.
  - Child Row Rules
    - When an individual account is negative, you can move it to a selected group.
    - Note: Account-level (child row) rules take precedence over group-level rules. Check for conflicts when both are applied.

**Q10. How do I combine accounts into one group row?**

- Yes. You can combine multiple accounts into a single group row.
- To select multiple accounts:
  - Press Cmd/Ctrl + Left Click: Select specific accounts individually.
  - Press Shift + Left Click: Select a range of accounts from the first to the last row.

**Q11. How do I hide an account row with zero balance?**

- Yes. Select the row and check Hide Row if Zero Balance.

**Q12. How do I duplicate a Balance Sheet template?**

- Go to **Settings** >**Templates** > **Reports**, hover over the template, click the three-dot icon, and select**Duplicate**.**Q13. What happens when I update a Balance Sheet template?**

- Changes apply automatically. For previously downloaded reports, redownload them to apply updates.

---

### Cash Balance Template
Source: https://help.jaz.ai/en/articles/12773812-cash-balance-template

**Q1. How do I create a new Cash Balance template?**

- Go to **Settings** >**Templates** > **Reports** >**Additional Tab**, then click**New Template** (Cash Balance).
- Alternatively, in **Reports** >**Cash Balance**, click the template selector (top right) and choose New Template.**Q2. What settings can I customize in my Cash Balance template?**

- The Cash Balance template has three tabs: General and PDF.
  - General: Edit template name, baseline period, header, and footer.
  - PDF: Customize layout, header, and footer for PDF version of the report.
    - Note: PDF preview and export are only supported for up to 8 columns.

**Q3. What columns are supported in the Cash Balance template?**

- The Cash Balance template supports the following columns:
  - Comparative Periods**:** Choose periods by comparison type (day/month/quarter/year) and display order.
  - Adjustable:
    - Account Code (locked)
    - Account Name (locked)
    - Account Type
    - Status
    - Account Currency
    - Balance
    - Balance (PHP)
    - Note: Account Code and Account Name are locked. This means you cannot hide or re-arrange them. (PHP) pertains to the org’s default currency.

**Q4. How do I select/hide/arrange columns in the Cash Balance template?**

- To add comparative columns, click Compare (beside the baseline period date).
- To show or hide columns:
  - Click the column icon at the top right of the template.
  - In the panel, you’ll see two lists: Hidden Columns and Selected Columns.
  - To show a column, move it from Hidden Columns to Selected Columns.
  - To hide a column, hover over it in the Selected Columns list and click the hide icon.
- To arrange columns:
  - Click the column icon at the top right of the template.
  - In the Selected Columns list, hover over a row and drag it to your preferred position.

**Q5. How do I duplicate a Cash Balance template?**

- Go to **Settings** >**Templates** > **Reports**, hover over the template, click the three-dot icon, and select**Duplicate**.**Q6. What happens when I update a Cash Balance template?**

- Changes apply automatically. For previously downloaded reports, redownload them to apply updates.

---

### Cashflow Statement Template
Source: https://help.jaz.ai/en/articles/12773859-cashflow-statement-template

**Q1. How do I create a new Cashflow Statement template?**

- Go to **Settings** >**Templates** > **Reports** >**Accounting Tab**, then click**New Template** (Cashflow Statement).
- Alternatively, in **Reports** >**Cashflow**, click the template selector (top right) and choose New Template.**Q2. What settings can I customize in my Cashflow Statement template?**

- The Cashflow Statement template has three tabs: General, PDF, and Actions.
  - General: Edit template name, baseline period, header, sorting, and footer.
  - PDF: Customize layout, header, and footer for PDF version of the report.
  - Actions: Perform specific functions on a selected column or row.

**Q3. What columns are supported in the Cashflow Statement template?**

- Comparative Periods: Choose date range, comparison type (day/month/quarter/year), and display order.
- Variance: Show changes between two columns (amount or %). Multiple allowed.
- Year-to-Date: Show totals from start of year to selected period. Multiple allowed.

**Q4. How do I add or delete columns in the Cashflow Statement template?**

- By default, only the baseline period column is shown.
- To add columns:
  - Click Compare to add additional period columns.
  - Hover over a column line to add a Year-to-Date column.
  - Hover over a column line and add Variance once at least two comparison periods are available.
- To delete a column, click the column, then under Actions, select Delete Column.

**Q5. What are the different types of rows in the Cashflow Statement template?**

- The Cashflow Statement template contains rows for Cash Summary, Operating Activities, Investing Activities, and Financing Activities.
  - Group Rows: Represent each major activity category. You can only edit the group name.
  - Child Rows: Show movements in cash under each activity category.
  - Text Rows: Allow you to insert custom text and can be added to both the group and child levels.

**Q6. How do I add or delete rows in the Cashflow Statement template?**

- To add a Text Row, hover and select **+Text Row**(available for both group and child levels).
- Note: It is not possible to group rows in the Cashflow Statement template.

**Q7. How do I add a group within a group row?**

- This is not possible in the Cashflow Statement template.

**Q8. How do I duplicate a Cashflow Statement template?**

- Go to **Settings** >**Templates** > **Reports**, hover over the template, click the three-dot icon, and select Duplicate.**Q9. What happens when I update a Cashflow Statement template?**

- Changes apply automatically. For previously downloaded reports, redownload them to apply updates.

---

### Ledger Template
Source: https://help.jaz.ai/en/articles/12773898-ledger-template

**Q1. How do I create a new Ledger template?**

- Go to **Settings** >**Templates** > **Reports** >**Accounting Tab**, then click**New Template** (Ledger).
- Alternatively, in **Reports** >**Ledger**, click the template selector (top right) and choose New Template.**Q2. What settings can I customize in my Ledger template?**

- The Ledger template has three tabs: General and PDF.
  - General: Edit template name, baseline period, header, and footer.
  - PDF: Customize layout, header, and footer for PDF version of the report.
    - Note: PDF preview and export are only supported for up to 8 columns.

**Q3. What columns are supported in the Ledger template?**

- The Ledger template supports the following columns:
  - Comparative Periods**:** Choose periods by comparison type (day/month/quarter/year) and display order.
  - Adjustable:
    - Date (locked)
    - Transaction (locked)
    - Description (locked)
    - Contact
    - Debit (PHP)
    - Credit (PHP)
    - Transaction Reference
    - Account
    - Account Type
    - Tracking Tags
    - Currency
    - Credit (Source)
    - Debit (Source)
    - Nano Classifiers
    - Capsule
    - Contact Group
    - Contact Relationship
    - Note: Date, Transaction, and Description are locked. This means you cannot hide or re-arrange them. (PHP) pertains to the org’s default currency.

**Q4. How do I select/hide/arrange columns in the Ledger template?**

- To add comparative columns, click Compare (beside the baseline period date).
- To show or hide columns:
  - Click the column icon at the top right of the template.
  - In the panel, you’ll see two lists: Hidden Columns and Selected Columns.
  - To show a column, move it from Hidden Columns to Selected Columns.
  - To hide a column, hover over it in the Selected Columns list and click the hide icon.
- To arrange columns:
  - Click the column icon at the top right of the template.
  - In the Selected Columns list, hover over a row and drag it to your preferred position.

**Q5. How do I duplicate a Ledger template?**

- Go to **Settings** >**Templates** > **Reports**, hover over the template, click the three-dot icon, and select**Duplicate**.**Q6. What happens when I update a Ledger template?**

- Changes apply automatically. For previously downloaded reports, redownload them to apply updates.

---

### Profit & Loss Template
Source: https://help.jaz.ai/en/articles/12773930-profit-loss-template

**Q1. How do I create a new Profit & Loss template?**

- Go to **Settings** >**Templates** > **Reports** >**Accounting Tab**, then click New Template (Profit & Loss).
- Alternatively, in **Reports** >**Profit & Loss**, click the template selector (top right) and choose New Template.**Q2. What settings can I customize in my Profit & Loss template?**

- Profit & Loss template has three tabs: General, PDF, and Actions.
  - General: Edit template name, baseline period, header, sorting, and footer.
  - PDF: Customize layout, header, and footer for PDF version of the report.
  - Actions: Perform specific functions on a selected column or row.

**Q3. What columns are supported in the Profit & Loss template?**

- Comparative Periods: Choose date range, comparison type (day/month/quarter/year), and display order.
- Variance: Show changes between two columns (amount or %). Multiple allowed.
- Year-to-Date: Show totals from start of year to selected period. Multiple allowed.
- Account Code: Display Chart of Account codes. Only one allowed.

**Q4. How do I add or delete columns in the Profit & Loss template?**

- By default, only the baseline period column is shown.
- To add columns:
  - Click Compare to add additional period columns.
  - Hover over a column line to add Year-to-Date or Account Code columns.
  - Hover over a column line and add Variance once at least two comparison periods are available.
- To delete a column, click the column, then under Actions, select Delete Column.

**Q5. What are the different types of rows in the Profit & Loss template?**

- Accounts that are included in the Profit & Loss template are grouped into Group-level Rows (bold texts) and Child-level Rows (normal texts).
- Group-level Rows represent a group of accounts where you can:
  - Rename the group.
  - Show or hide group totals.
  - Hide the group if all child rows are hidden.
  - Set account criteria to define which accounts are included.
  - Set negative balance rules.
- Child-level Rows represent individual account rows where you can:
  - Create new account groups.
  - Set negative balance rules.
  - Group selected accounts together by choosing Create New Account Group (accounts below will be grouped under it).
- Text Rows allow you to insert custom text and can be added to both group and child levels.

**Q6. How do I add or delete rows in the Profit & Loss template?**

- To add a Group Row, hover over a row line and click +Account Group. Enter the group name and account criteria.
- To add a Text Row, hover and select Add Text Row (available for both group and child levels).

**Q7. How do I add a group within a group row?**

- Yes, you can add sub-groups within a group row.

**Q8. My account is not appearing in my Profit & Loss template, what do I do?**

- Check your Chart of Accounts to ensure the account type is included in the Profit & Loss report.

**Q9. What is the Negative Balance rule and how do I use it?**

- The Negative Balance rule defines what happens when an account amount falls below zero. Rules can be applied at both the Group-level Row and Child-level Row.
  - Group Row Rules
    - Choose conditions such as “if accounts are negative” or “if the entire group is negative.”
    - Move negative balances to another group or convert them to positive values.
  - Child Row Rules
    - When an individual account is negative, you can move it to a selected group.
    - Note: Account-level (child row) rules take precedence over group-level rules. Check for conflicts when both are applied.

**Q10. How do I combine accounts into one group row?**

- Yes. You can combine multiple accounts into a single group row.
- To select multiple accounts:
  - Press Cmd/Ctrl + Left Click: Select specific accounts individually.
  - Press Shift + Left Click: Select a range of accounts from the first to the last row.

**Q11. How do I hide an account row with zero balance?**

- Yes. Select the row and check Hide Row if Zero Balance.

**Q12. How do I duplicate a Profit & Loss template?**

- Go to **Settings** >**Templates** > **Reports**, hover over the template, click the three-dot icon, and select Duplicate.**Q13. What happens when I update a Profit & Loss template?**

- Changes apply automatically. For previously downloaded reports, redownload them to apply updates.

---

### Report Packs
Source: https://help.jaz.ai/en/articles/13010001-report-packs

**Q1. What are Report Packs?**

- Report Packs combine multiple report templates into a single downloadable PDF.
- They help you generate complete financial packages (e.g., 3FS: Balance Sheet, P&L, Cash Flow) in one click.
- Jaz renders all selected reports together and stitches them into one document.

**Q2. Where can I access Report Packs?**

- Go to **Settings > Templates >Reports > Report Packs** to view and generate your report packs. Alternatively, you can open report packs in**Reports > Report Packs.**
- You can render the full PDF and download it. The downloaded version matches exactly what is shown on-screen.

**Q3. How do I create a Report Pack?**

- Go to **Settings > Templates > Reports > Report Packs**or access via** Reports > Report Packs.**
- Create a new Report Pack, enter a name, and select a category (for your internal organization).
- Choose a base period (e.g., this month).
- Save the template to make it available under Reports.

**Q4. What reports can I include in a Report Pack?**

- You can select from any existing report templates in your organization.
- Example templates include Balance Sheet, P&L, Cash Flow, Cash Balance, Trial Balance, Ledger, and any custom templates you've created.
- The list is not fixed. Your Report Pack options depend on the templates available in your organization.

**Q5. Can I customize the order of reports in a Report Pack?**

- Yes. You can drag and reorder reports to control how they appear in the final PDF.

**Q6. What design or layout options can I add to my Report Pack?**

- You can add optional decorator elements such as:
  - Cover pages
  - Table of contents
  - Notes section
  - Signature pages with configurable labels and names
  - Page numbers and uppercase formatting

**Q7. Does the Report Pack follow the layout of individual templates?**

- Yes. The Report Pack respects the layout of each underlying report template which includes portrait/landscape, column structure, and template-specific formatting.
- Report Pack–level settings override only universal elements like font, page numbers, and decorators.

**Q8. Why do some Report Packs take longer to load?**

- Large templates such as the General Ledger take longer to generate due to the volume of data.
- The system generates reports in parallel and then stitches them together, but heavy reports still affect load time.

**Q9. Can I delete a Report Pack?**

- Yes. Report Packs can exist in an empty state, so you can delete default or custom Report Packs anytime.
- If all Report Packs are deleted, the Reports page will show “No report packs to display.”

**Q10. How many reports can a Report Pack contain?**

- A Report Pack can include up to 20 reports to ensure smooth generation and reasonable load times.

**Q11. Do the Report Pack overrides affect the underlying templates?**

- No. Overrides (e.g., fonts, page numbers, decorators) apply only to the Report Pack PDF.
- The original individual report templates remain unchanged.

---

### Trial Balance Template
Source: https://help.jaz.ai/en/articles/12774004-trial-balance-template

**Q1. How do I create a new Trial Balance template?**

- Go to **Settings** >**Templates** > **Reports** >**Accounting Tab**, then click**New Template** (Trial Balance).
- Alternatively, in **Reports** >**Trial Balance**, click the template selector (top right) and choose New Template.**Q2. What settings can I customize in my Trial Balance template?**

- The Trial Balance template has three tabs: General, PDF, and Actions.
  - General: Edit template name, baseline period, header, and footer.
  - PDF: Customize layout, header, and footer for PDF version of the report.
    - Note: PDF preview and export are only supported for up to 8 columns.

**Q3. What columns are supported in the Trial Balance template?**

- The Trial Balance template supports the following columns:
  - **Comparative:** Compare by previous days, months, quarters, or years, and adjust display order.
  - **Adjustable**:
    - Account Code (locked)
    - Account Name (locked)
    - Account Type
    - Status
    - Debit (PHP)
    - Credit (PHP)
    - Account Currency
    - Debit (Source)
    - Credit (Source)
    - Note: Account Code and Account Name columns are locked. Debit and Credit columns cannot be hidden. (PHP) pertains to the org’s default currency.

**Q4. How do I select/hide/arrange columns in the Trial Balance template?**

- To add comparative columns, click Compare (beside the baseline period date).
- To show or hide columns:
  - Click the column icon at the top right of the template.
  - In the panel, you’ll see two lists: Hidden Columns and Selected Columns.
  - To show a column, move it from Hidden Columns to Selected Columns.
  - To hide a column, hover over it in the Selected Columns list and click the hide icon.
  - Note: Debit and Credit columns cannot be hidden.
- To arrange columns:
  - Click the column icon at the top right of the template.
  - In the Selected Columns list, hover over a row and drag it to your preferred position.
  - Note: Account Code and Account Name are locked and cannot be moved.

**Q5. How do I duplicate a Trial Balance template?**

- Go to **Settings** >**Templates** > **Reports**, hover over the template, click the three-dot icon, and select**Duplicate**.**Q6. What happens when I update a Trial Balance template?**

- Changes apply automatically. For previously downloaded reports, redownload them to apply updates.

---
