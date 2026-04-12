### Data Transfer — Migrate Data to Jaz
Source: https://help.jaz.ai/en/articles/14456526-data-transfer-migrate-data-to-jaz

**Q1. What is Data Transfer**

- Data Transfer allows you to migrate your existing accounting records directly into our platform without manual entry.

**Q2. What data can be transferred?**

- We categorize data into three types. We recommend importing Foundations first.
  - **Foundations:** Chart of Accounts, Contacts, Items, Currencies
  - **Balances:** Foundations, Opening Balances, Ageing Schedules
  - **Transactions:** Invoices, Bills, Transaction Line Items, Payments**Q3. How do I use Data Transfer?**

- Follow these three steps to move your data:
  - **Export:** Download your data from your previous accounting software.
  - **Upload:** In Jaz, go to**Data Transfer**, select your transfer type (Foundations, Balances, or Transactions), and drag and drop your files.
  - **Review:** Follow the on-screen prompts to review your data and confirm the import.**Q4. What files are supported?**

- Excel or CSV formats are supported. No reformatting required. Simply export from your old software and upload the file exactly as it is.

**Q5. Are there any limits to Data Transfer?**

- Files should be in .csv or .xlsx. Max 2 MB.

**Q6. Can I undo or delete data I transferred?**

- Yes, you can edit or delete data transferred into Jaz. If you are unsure how to proceed, please contact us via in-app help or reach out to your account manager for assistance.

---

### Invite Team Members and Clients
Source: https://help.jaz.ai/en/articles/12570711-invite-team-members-and-clients

**Q1. How to invite team members and clients into my organization?**

- Choose an organization and go to Settings > [Access Management](https://help.jaz.ai/en/articles/9066648-access-management).
- Click New User and assign a role.
- The invitee will receive an email invitation.
- They can click **Accept Invite** to go to the login page and sign in with their email.
- For the OTP in first login, they can choose to receive it via email.
  - Tip: Download the Jaz Mobile App on [Apple](https://apps.apple.com/us/app/jaz-accounting/id6446179376) or [Android](https://play.google.com/store/apps/details?id=com.tinvio.jaz&hl=en_US&pli=1) for faster logins.

**Q2. How to download the Jaz Mobile App for faster logins?**

- Search “Jaz Accounting” on the App Store or Google Play or use the short links: **[App Store](https://apps.apple.com/us/app/jaz-accounting/id6446179376)** /**[Google Play](https://play.google.com/store/apps/details?id=com.tinvio.jaz&hl=en_US&pli=1)**
- Enable push notifications for faster logins.

**Q3. Do users need to create an account after accepting an invite?**

- No. Accepting the organization invitation automatically creates and verifies their account.

**Q4. My invitees can’t find the invitation email, what should they do?**

- Have them search their inbox using these terms:
  - “You’re invited! On Jaz”
  - “New to Jaz? Download the mobile app for faster logins.”
  - Sender: [message@reply.jaz.cx](mailto:message@reply.jaz.cx)
- If it’s not there, have them check the spam folder or resend the invite.

**Q5. How do I confirm if the user I invited already has access to my organization?**

- Once the invite is accepted, the user’s join date will appear in your Access Management list.
- If the join date is “Pending” this means that they have yet to accept the invitation.

---

### Onboarding
Source: https://help.jaz.ai/en/articles/9117115-onboarding

**Q1. How do I create a new organization in Jaz?**

- To create a new organization in Jaz, click on **Switch Organization**after logging in.
- Click on **Create Organization**to create a new organization.

**Q2. How can I add new users to my organization?**

- Please see [User Management](https://help.jaz.ai/en/articles/9066648-user-management) for more information on adding new users to your organization.

---

### Quick Conversion to Jaz from Another Accounting System
Source: https://help.jaz.ai/en/articles/13870579-quick-conversion-to-jaz-from-another-accounting-system

**Q1. How do I convert from my old accounting system to Jaz?**

Follow this step by step guide to convert to Jaz.
- **Step 1: Import your [Chart of Accounts (COA)](https://help.jaz.ai/en/articles/9115783-import-chart-of-accounts-coa)**
  - Go to **Configurations** >**Chart of Accounts **>**Import Template** > **Download Template**
  - Map it consistently with your old accounting software
  - You can also manually edit each COA
​
- **Step 2: Set up your accounting details in Jaz**
  - Go to **Settings** >**Organization Details** > **Accounting**
  - Set your **Financial Year End (FYE)**.
  - If you use multi-currencies, add all relevant currencies and use the exact exchange rates from your old system as at conversion date.
    - For this guide, we will use **31 Dec 2025** as the conversion date.
  - Note: The conversion date is the starting point of your accounting records in Jaz. It must be today or a past date. Many businesses choose their FYE so reporting begins cleanly from a new financial year.

- **Step 3: Create Accounts Receivable (AR) and Accounts Payable (AP) Clearing Accounts**
  - Go to **Configurations** >**Chart of Accounts** > **Add New accounts**
  - Add an **AR conversion clearing account**
    - Account name: AR Conversion Clearing Account
    - Account type: Non-current asset
  - Add an **AP conversion clearing account**
    - Account name: AP Conversion Clearing Account
    - Account type: Non-current liability.
  - Notes:
    - You can choose any name for these clearing accounts.
    - AR/AP clearing accounts act as temporary holding accounts during conversion to prevent duplicate AR and AP balances.

- **Step 4: Generate & Review your Trial Balance (TB)**
  - Generate TB from your old system as at conversion date.
  - Make sure the TB is balanced.

- **Step 5: Recreate Outstanding Invoices and Bills.**
  - Your Invoices should total the amount of your TB’s AR balance
    - Set the invoice date as at conversion date or before.
    - Under Accounts, **choose the AR clearing account**you’ve set up in step 3.
    - Input a customer (optional)
  - Your Bills should total the amount of your TB’s AP balance
    - Set the bill date as at conversion date or before.
    - Under Accounts, **choose the AP clearing account**you’ve set up in step 3.
    - Input a supplier (optional)

- **Step 6: Transfer your Trial Balance (excluding AR and AP)**
  - Go to **Settings** >**Configurations** > **Chart of Accounts** >**Transfer Trial Balance**
  - Make sure you’ve set the correct transfer date as of conversion date.
  - Transfer the Debits and Credits for each account except for AR and AP, for now.

- **Step 7: Balance the AR and AP clearing accounts**
  - AR in your TB = input as debit in AR conversion clearing account
  - AP in your TB = input as credit in AP conversion clearing account
  - Notes:
    - After this step, both clearing accounts should have 0 balance.
    - Do not enter any amounts directly into the Accounts Receivable or Accounts Payable control accounts. Only use AR/AP clearing accounts.

- **Step 8: Double check everything before saving.**
  - Total debits equals total credits
  - Trial Balance in Jaz matches your old system as at conversion date, 31 Dec 2025.
  - **AR and AP balance from TB were entered in the AR & AP clearing accounts** and not in the AR/AP accounts.
- **Step 9: Save.**
  - A Transfer Trial Balance journal will be generated.

**Q2. How long does conversion usually take?**

- Conversion can typically be done in a day.

**Q3. What if I made a mistake with my Transfer Trial Balance?**

- You can void and then delete the Transfer Trial Balance Journal to reset the conversion.

**Q4. If I convert as of last year’s FYE but only begin using Jaz mid-year, how do I ensure my outstanding invoices and bills are properly reflected?**

- After transferring your Trial Balance as at FYE, you can recreate your invoices and bills in either of the following ways:
  - **Option 1:** Import or recreate all invoices and bills from FYE up to the current date
  - **Option 2:** Post a summary journal entry to reflect the net movement in AR and AP from FYE to the current date.

---

### Sign Up & Login
Source: https://help.jaz.ai/en/articles/9583714-sign-up-login

**Q1. Can I sign up for Jaz on my own?**

- Yes, you can sign up for Jaz on your own and join us immediately!
  - To get started, sign up for a new account with your email, and fill in the details to sign up.
  - Follow the steps shown on the screen, and fill in the following details**:**
    - Organization details
    - Additional details
    - Billing address for your organization
  - Lastly, verify your email to start using Jaz!
    - You can find an example of the verification email below.
- Do reach out to [support@jaz.ai](mailto:support@jaz.ai) if you face any issues while signing up!

**Q2. I don't see the email from Jaz to verify my email. What should I do?**

- If you don't receive an email, here are a few things you can try:
  - Try resending the email via the **Resend Now**option
  - Give it a couple of minutes - the email may need some time to reach you.
  - Check your spam/junk folder.
  - Try running through the sign up process again.

**Q3. I am trying to login, and was asked for a mobile app OTP. What is this?**

- Jaz is not only available on the web, but also on the [Google Play Store](https://jaz.ai/android) and the [iOS App Store](https://jaz.ai/ios)!
- For faster logins, we highly recommend installing the mobile app, where you will receive OTPs for logging in to our web platform.
  - After installation, you can find the OTPs that you have requested on our web platform under **Menu > Web OTP**.
  - You can also enable **push notifications** for an even faster login. Future login requests will show up as a push notifications that you can tap on for approval, without having to open up the app!
- If you'd like, you can still choose to receive OTPs via the email that you have used while signing up for Jaz.

---

### Transfer Fixed Assets in Jaz (Manual)
Source: https://help.jaz.ai/en/articles/14354452-transfer-fixed-assets-in-jaz-manual

**Q1. What is Transfer Fixed Assets for?**

- It lets you transfer your fixed assets and their depreciation value from your previous accounting system into Jaz. This is usually the next step after Transfer Trial Balance.

**Q2. How do I Transfer Fixed Assets?**

Follow these steps to transfer your Fixed Assets:
- **Step 1: Transfer Trial Balance.**
Before proceeding, make sure you have completed the [Transfer Trial Balance](https://help.jaz.ai/en/articles/13870579-quick-conversion-to-jaz-from-another-accounting-system). Confirm that your trial balance includes an Accumulated Depreciation account or a similar.
​

- **Step 2: Enter Fixed Asset Details
​**Go to**Fixed Assets** > **Transfer Fixed Assets**, then fill in the following:
  - Category
  - Asset Type
  - Asset Account
  - Asset Name
  - Asset Reference
  - Purchase Date
  - Purchase Value
  - Depreciation Method

- **Step 3: Fill in the depreciation details**
  - **Depreciation Start Date:**
This should be the day **after** your Transfer Trial Balance lock date.
  - **Book Value at Start Date:**
Enter the asset’s value as of the lock date. For example: If the purchase value is SGD 50,000 and the current value is SGD 25,000, input SGD 25,000.
  - **Depreciation Expense Account:**
Select the appropriate expense account.
  - **Depreciable Value:**
This is auto-calculated from the Purchase Value. No changes are needed.
  - **Accumulated Depreciation Account:
​**Select the correct account from your COA, typically Accumulated Depreciation.
  - **Useful Life:**
Enter the asset’s useful life in months.
​

- **Step 4 (optional):** Provide internal notes and attachments.
- **Step 5:** Double check the record by viewing its ledger entry or go to Reports > Summaries > Fixed Assets**Q3. Can I import Transfer Fixed Assets?**

- Yes. Do this in Settings > Data Transfer.

**Q4. Can I edit or delete assets I transferred?**

- Yes, just click on the 3 dot icon to edit or delete an asset. If you delete a fixed asset, all of the asset's depreciation entries will be deleted and are irreversible.

**Q5. When does the depreciation happen?**

- Depreciation in Jaz happens on the last day of the month.

---

### Choosing Plans & Add-ons
Source: https://help.jaz.ai/en/articles/11710415-choosing-plans-add-ons

**Q1. What are the plans that Jaz currently offers?**

- Jaz is always upgrading to serve our users better, so our offerings may change from time to time!
- Get the latest information about our plans and the features offered by visiting our website at [www.jaz.ai](https://www.jaz.ai/).

**Q2. Why are some of the features disabled on Jaz for my organization?**

- The feature you are trying to use may not be available for your plan. For information on features that you can access with your plan, visit [www.jaz.ai/pricing](https://www.jaz.ai/pricing).

**Q3. How do I subscribe to a Jaz Plan?**

- You need to first create your **[Billing Account](https://help.jaz.ai/en/articles/11710444-billing-account-setup)**.
- Once you’ve setup your **[Billing Account](https://help.jaz.ai/en/articles/11710444-billing-account-setup)**, head over to Settings > Organization > Plans & add-ons, click subscribe/manage plan.
- Choose a plan to subscribe to
- You can choose add-ons to go with your plans
- During checkout, you can choose which billing account to use
- You can set the billing frequency: Monthly, Quarterly, Yearly, Pay-as-you-go

**Q4. How do I add extra custom users?**

- Go to **Settings** >**Plans & Add-ons** > **Manage Plans**
- Tick the Extra Custom Users box and input the additional custom users you need.

**Q5. My account balance is insufficient, what to do?**

- You can recharge your account balance directly from the checkout experience.
- Select the payment method and then add funds

**Q6. My Plans & Add-ons indicate that I am currently on a free trial. Will my subscription renew automatically?**

- Your subscription will only renew automatically if you set up a billing account and transition to a recurring plan. You can manage this under Plans & Add-ons.

---

### Billing Account Setup
Source: https://help.jaz.ai/en/articles/11710444-billing-account-setup

**Q1. How do I subscribe to Jaz?**

- You need to setup your Billing Account first in order to avail Jaz Plans.
- After setting up your Billing Account, you can proceed to customize your plans at **[Plans & Add-ons](https://help.jaz.ai/en/articles/11710415-choosing-plans-addons)**.**Q2. What is a billing account?**

- A billing account is used to manage payments for Jaz[Plans & Add-ons](https://help.jaz.ai/en/articles/11710415-choosing-plans-add-ons). It allows you to add funds or set up payment methods to cover charges efficiently.
- You can create and manage multiple billing accounts.

**Q3. Who owns a billing account?**

- Billing accounts are owned by individual users, not by organizations.
- A billing account follows the user across all organizations they have access to and can be used to pay for multiple organizations.
- Only the owner can directly access and manage their billing accounts.

**Q4. Is there a way I can share my billing account with another organization member?**

- Yes, but only after your billing account is used to pay for an organization.
- Once the billing account is paying for an organization, you can grant [Plans & Add-ons access](https://help.jaz.ai/en/articles/13615676-managing-organizations-in-billing-accounts#h_8474cfecfe) to another admin member.
- This access is limited to paying for that specific organization only. You can revoke this access at any time without affecting the organization’s subscription.
- Admin members with this access cannot use the billing account to pay for other organizations or manage the billing account itself.
  - Note: Granting access does not transfer ownership of the billing account or allow others to view balances, payment methods, or billing history.

**Q5. How do I create billing accounts?**

- Yes, you can create new billing accounts to pay for Jaz Plans and add-ons. Here's how:
  - Provide the account name.
  - Fill in the Bill to details (these indicate who the billing is addressed to).
  - Set the currency (currently, only SGD and USD are supported).
  - Choose a Preferred Billing Date (this is when you wish to be billed).
  - Enter a Billing email to receive billing notifications.
  - Optionally, add emails to CC for the billing email.
- Once setup is done, inside each billing accounts you can:
  - Recharge your account
  - Setup auto-charge and add payment methods
  - View transaction history
  - Edit billing account details
  - Make the billing account inactive

**Q6. How do I recharge my billing accounts?**

- To recharge your account, you can manually top up or turn on the **auto charge function**.**Q7. How do saved payment methods work?**

- Saved methods enable secure, fast, and automatic recharges. You can save cards and select wallets. If one payment method fails, the system will automatically try the other saved methods.

**Q8. How do I set up auto-charge and add payment methods?**

- Add new payment methods. Having at least two is recommended for reliability.
- Enable the Auto Charge toggle to activate automatic payments.

**Q9. I’ve set up my Billing Account, what’s next?**

- Head over to **[Plans & Add-ons](https://help.jaz.ai/en/articles/11710415-choosing-plans-addons)**to customize the right plan for your organization.

---

### Managing Organizations in Billing Accounts
Source: https://help.jaz.ai/en/articles/13615676-managing-organizations-in-billing-accounts

**Q1. Can I have different organizations in different billing accounts?**

- Yes. You can assign different organizations to different billing accounts.
- Common use cases include:
- Managing multiple companies or subsidiaries under separate billing accounts
- Separating internal organizations from client or partner organizations
- Using different payment methods for different organizations
- Assigning billing responsibility to different teams or cost centers

**Q2. Where can I see the activity of my billing account?**

- Go to **Billing Accounts > Choose a Billing Account > Account Activity**.
- This page shows all activity related to the selected billing account.
  - **Transactions tab:** Shows the history of balance recharges made to the billing account.
  - **Invoices tab:** Shows consolidated invoices for all organizations paid for by the billing account. You can view, download, and download receipts for reference.**Q3. Where can I download my billing account’s statement of charges?**

- Go to **Billing Accounts > Choose a Billing Account > Account Activity**.
- Click the download icon located at the right side of the screen. Choose a date range and download your statement of charges.

**Q4. Where can I manage organizations that I am paying for?**

- Go to **Billing Accounts > Choose a Billing Account > Organization Plans**. Under Organization Plans, you’ll see the following tabs:
  - **Active tab:** Lists organizations that are currently subscribed and paid for by the billing account.
  - **Downgraded tab:** Lists organizations that were automatically downgraded due to unpaid subscriptions and may still be eligible for [reinstatement](https://help.jaz.ai/en/articles/13368779-re-instating-your-org-s-subscription).
  - **Cancelled tab:** Lists organizations that were manually cancelled or automatically ended after the reinstatement period lapsed following a downgrade, and is no longer eligible for reinstatement.**Q5. How do I manually downgrade and cancel a subscription?**

- Before downgrading or canceling an organization, keep the following in mind:
  - Cancelling does not immediately remove access.
  - Billing cycles do not reset when a subscription is cancelled.
  - No refunds or credits are issued for unused time. Check our terms and conditions [here](https://www.jaz.ai/legal).
  - Cancelling only affects future renewals, not the current billing period.
- After selecting an organization go to **Settings > Plans & Add-ons > Manage Plan**
- Choose the downgraded plan, such as Essentials to Free, Growth to Essentials, or Growth to Free. After confirming, a downgrade schedule confirmation will appear.

**Q6. If I cancel a subscription, will it reset my billing cycle?**

- No. Cancelling a subscription does not reset the current billing cycle. Example**:**
  - A monthly subscription starts on January 1 and runs until January 30, renewing on February 1 at 00:00.
  - If cancelled on January 10, access continues until January 30.
- Note: Once the billing cycle ends and the organization is subscribed again, the new subscription will follow the preferred billing date of the billing account used for the new subscription.

**Q7. How do I transfer billing of my organization to another billing account?**

- Go to **Plans & Add-ons** and select**Manage**.
- During checkout, choose a different billing account to pay for the subscription.
- The organization’s billing will move to the new billing account with no downtime.
- Existing discounts continue to apply, and charges are pro-rated based on the new billing account’s billing date.
- If no discount applies, billing will reflect the standard price.

**Q8. Can I share my billing account with another member of the organization?**

- Yes. You can share your billing account with another user by granting them billing access. Go to **Settings > Access Management**.
- Select an admin member of your organization and under Organization Permissions enable **Plans & Add-ons** access.**Q9. What happens if my billing account balance runs out?**

- If your billing account does not have enough balance, your organizations will downgrade on their due date.
- If the recharge funds are not enough to cover the total amount due, **no organizations will be charged and all will be downgraded**, since billing is processed as a single payment. Example:
  - Balance: S$3,000
  - Total due: S$4,000 (Org A: S$2,000, Org B: S$2,000)
  - Result: Payment fails and both organizations are downgraded.
- To prevent your organizations from being downgraded, make sure to turn on [auto-recharge](https://help.jaz.ai/en/articles/11710444-billing-account-setup). You will also receive a notice to recharge a few days prior to your due date to remind you of the upcoming billing.

**Q10. Who can manage organizations under a billing account?**

- Only users with the appropriate billing or administrative permissions can manage organization subscriptions.

**Q11. What happens to my data if an organization is downgraded or cancelled?**

- Organization data is preserved during downgrade or cancellation.
- Access and features depend on the subscription status.

**Q12. I want to move my billing account’s credits to another billing account, how?**

- Contact your account manager, use in-app chat, or email **[support@jaz.ai](mailto:support@jaz.ai)**.
- Include the following details:
  - Subject as “Request to transfer credits”
  - Source billing account email and name
  - Amount of credits to transfer
  - Target billing account email and name
    - Example:
“Request to transfer credits. See details: [anya@gmail.com](mailto:anya@gmail.com) | My Billing Account | SGD 5,000 → [maria.admin@gmail.com](mailto:maria.admin@gmail.com) | Company Billing”
  - Note: transfer of credits might take several minutes depending on the availability of the team.

---

### Re-instating your Org's Subscription
Source: https://help.jaz.ai/en/articles/13368779-re-instating-your-org-s-subscription

**Q1. Why was my organization downgraded?**

- This happens due to unpaid subscriptions caused by insufficient funds.
- **Note:** Other cancellation reasons, such as user-initiated downgrades, cannot be reinstated.**Q2. When does this happen?**

- Organizations automatically downgrade at midnight on the due date. For example, if payment is due on September 1, the downgrade occurs at 00:00 on September 1.

**Q3. If I reinstate my subscription later, will my subscription date reset?**

- No. The subscription date remains the same. For example, if downgraded on September 1 and reinstated on September 5, the next due date is still October 1.

**Q4. How do I reinstate my subscriptions?**

- Go to **Settings > Billing Accounts > Choose Billing Account > Organization Plans Tab > Downgraded**. Select the organizations to reinstate and ensure you have enough balance.
- **Note:** Reinstatement is available only within 28 days from the downgrade date. After this, you cannot reinstate the subscription.**Q5. How can I prevent my organizations from being downgraded?**

- It is highly recommended to save a credit card as a payment method and enable **Auto Recharge** so your balance tops up before the due date. This removes the need for manual top-ups.
- It’s also best practice to add at least two payment methods to ensure a backup if the default fails.

---
