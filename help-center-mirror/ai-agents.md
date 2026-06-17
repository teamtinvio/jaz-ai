### Agent Builder
Source: https://help.jaz.ai/en/articles/10631219-agent-builder

**Q1. What is an AI Agent?**

- Jaz’s AI Agent allows you to send emails to perform accounting and finance tasks for your organizations.
- All actions taken by your agent are recorded as your own in Jaz.
- Agent tasks follow your user permissions and execute actions on your behalf.

**Q2. How do I set up my AI Agent?**

- Head over to Settings > Agent Builder and set the following according to your preferences:
  - Name
  - Email
    - Create an agent's email using letters (a-z), numbers (0-9), and the plus (+) symbol.
    - Using the plus (+) symbol is a good way to differentiate agents per organization, for example: [myagent+greengrocery@sendjaz.com](mailto:myagent+greengrocery@sendjaz.com)
  - Tone
    - Friendly
    - Formal
    - Focused
  - Skill Level
    - Assistant
    - Analyst (Growth Plan only)
    - Associate (Coming soon)
  - Memory
    - Predefined
    - Progressive (Growth Plan only)
  - Preferred Language

**Q3. What tasks can the AI Agent perform?**

The AI Agent can perform the following functions for paid organizations:
- Bookmarks
  - Create, review, and manage bookmarks.
- Chart of Accounts
  - Create, update, and search accounts and types.
- Contacts & Items
  - Create, update, and search contacts and items.
- Currency Management
  - Add, update, and retrieve currencies and exchange rates.
- Draft Transactions
  - Create draft invoices, bills, and journals.
- Jaz Magic (Invoices & Bills)
  - Autofill invoice and bill drafts from emails or attachments.
- Reports & Data Exports
  - Generate balance sheets, P&L, cash flow, and other reports.
- Tax Profiles
  - Create tax profiles.
- Direct Cash Transactions
  - Record direct cash inflows, outflows, or transfers.
  - Note: Only available for organizations under Growth Plan.
- Updates, Voids, & Deletes
  - Modify or void transactions, contacts, or accounts.
  - Note: Only available for organizations under Growth Plan.

**Q4. How does the agent receive instructions?**

- Send tasks via email to your agent's assigned email address.
- Use the ‘To’ field for direct actions and replies.
- Use ‘Cc’ to keep the agent informed but it will only respond to your verified email.

**Q5. Can the AI Agent reply to emails with other recipients?**

- No, it only responds to your verified email for security reasons.

**Q6. What happens when I update my agent's email?**

- Updating your agent’s email cancels all ongoing actions and the previous email will be unavailable for up to 72 hours.

**Q7. What happens if I cancel or downgrade my organization plan?**

- Your agent will be deactivated and its email will be released.

**Q8. Why am I not receiving responses from my agent?**

- Ensure you've included instructions in the ‘To**’** field and the email body.
- Make sure the agent's email is in your email contacts.
- Whitelist @sendjaz.com (@sendjaz.com), and check spam or other folders.

**Q9. Why can’t I add new instructions to the AI Agent?**

- Only organizations under the Growth Plan can add new instructions and turn off specific workflows.

**Q10. Is it possible to whitelist external email addresses for my agent builder?**

- Yes. You can whitelist specific email addresses or domains in your agent builder.
- Whitelisting allows your agent to CC email addresses in replies, only when these addresses or domains were in your original email to the agent.

---

### Clio
Source: https://help.jaz.ai/en/articles/10631206-clio

**Q1. What is Clio?**

- Clio stands for **Command Line Interface Operator**designed to help with accounting and finance tasks on Jaz.

**Q2. Is Clio available to all users?**

- No, Clio is available only for paid organizations.

**Q3. Can I use Clio on the Jaz mobile app?**

- Yes, Clio is available on Android (soon for IOS). Go to **Home > Clio AI Support** to access it.**Q4. How does Clio process queries?**

- It processes all queries in real-time and does not retain personal or query-related data unless explicitly saved in accounting records or reports.

**Q5. What happens when I log out or switch organizations?**

- Clio is session-based, meaning it resets when you log out, close the tab, or switch organizations. Chat history is not retained.

**Q6. Can Clio handle multiple tasks at once?**

- Yes, Clio can process multiple tasks in a single query.

**Q7. Are there any restrictions on Clio’s capabilities?**

- Yes, Clio's functionality is limited to tasks and features within the Jaz ecosystem.
​
- Its functions are also limited to the user’s access permissions within an organization (e.g., a user without report access cannot generate reports).

**Q8. Does Clio store my chat history?**

- No, users cannot download or export chat history.

**Q9. What happens when I edit a sent query?**

- Editing a query replaces the previous one instead of updating it.

**Q10. What file formats does Clio support?**

- Clio supports all file formats that are compatible within Jaz. This includes:
  - PDFs
  - .xlsx
  - JPG/JPEG
  - PNG

**Q11. What languages does Clio support?**

- Both chat and voice queries support **all languages** available in Jaz.

---

### Jaz for Claude and ChatGPT (Remote Connector)
Source: https://help.jaz.ai/en/articles/15432314-jaz-for-claude-and-chatgpt-remote-connector

**Q1. What is the Jaz connector for Claude and ChatGPT?**

- It connects your Jaz accounting workspace to Claude or ChatGPT. Once connected, you can ask in plain language to look up invoices and bills, run reports, manage contacts, reconcile transactions, and more.
- Jaz records accounting entries and reads your financial data. It does not move money or execute fund transfers.

**Q2. What do I need before I connect?**

- A Jaz account. Sign in at [app.jaz.ai](https://app.jaz.ai).
- Claude (claude.ai or the Claude desktop app), or ChatGPT with connectors enabled for your plan.

**Q3. How do I connect Jaz to Claude?**

- Open **Settings → Connectors → Add custom connector**.
- Enter the connector URL: `[https://mcp.jaz.ai/mcp](https://mcp.jaz.ai/mcp)` - Sign in to Jaz with your **email one-time code** or a**passkey**.
- Select **Allow**. The connector reaches every organization you belong to; you name the one you want in your request.**Q4. How do I connect Jaz to ChatGPT?**

- Open **Settings → Connectors → Add a connector** (connectors / developer mode must be enabled for your plan).
- Enter `[https://mcp.jaz.ai/mcp](https://mcp.jaz.ai/mcp)`, then follow the same sign-in and **Allow** steps.**Q5. What can I do once connected?**

- **Invoices and receivables:** list, search, create, update, pay, and download invoices; check what is overdue.
- **Bills and payables:** manage purchase bills and supplier credit notes.
- **Reports:** profit and loss, balance sheet, trial balance, general ledger, aging, cash flow.
- **Contacts, journals, bank and reconciliation, items, taxes, chart of accounts, currencies, fixed assets,** and more.**Q6. What are some example questions I can ask?**

- "What is my outstanding accounts receivable?"
- "List my unpaid invoices."
- "Show my profit and loss for last quarter."
- "Create a draft invoice for Acme Corp for 5,000."
- "What were my largest expenses this month?"
- "Generate a trial balance as of today."

**Q7. Will the assistant change my records without confirming?**

- The assistant confirms the details with you before creating or changing records.

**Q8. Can the connector move money or make payments?**

- No. The connector records accounting entries (for example, marking an invoice paid records a payment in your ledger) and reads your data. It does not transfer funds or execute payments to third parties.

**Q9. How do I work across multiple organizations?**

- No switching needed. The connector reaches every organization you belong to. Name the organization in your request (for example, "in Acme Pte Ltd, list unpaid invoices") and it targets that one. Ask "which organizations can you see?" to list them.

**Q10. How is my data secured?**

- Sign-in uses OAuth 2.1 with PKCE. The connector receives a scoped, time-limited token tied to your account that reaches the organizations you belong to, and never sees your password. Access to each organization is checked on every request.
- All traffic is over HTTPS. See the [privacy policy](https://jaz.ai/legal).

**Q11. How do I disconnect?**

- Remove the Jaz connector in your Claude or ChatGPT connector settings.

**Q12. Who do I contact for help?**

- Account or data questions: [api-support@jaz.ai](mailto:api-support@jaz.ai)
- Security reports: [security@jaz.ai](mailto:security@jaz.ai)

---
