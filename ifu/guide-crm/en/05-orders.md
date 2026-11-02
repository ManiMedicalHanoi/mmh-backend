---
number: 5
---
[[opener 5 | Orders | For the 3 Vietnam teams (Dental, Surgical, Eyeless). Sales enter orders and send them for approval; the Head of Department (HOD) approves. Only approved orders count for the sales KPI. The two Thailand teams have no orders in the CRM. Screens in this chapter use the Vietnamese interface. | crmg/orders | The Orders page; Create a new order; Care history; Orderer and product lines; Send for approval; Approve orders (HOD); Request changes; Where the data is saved]]

## The Orders page [[teams vn]]

:::split crmg/orders, crmg/m_orders | The Orders page on a computer and a phone (Vietnamese interface).
Left menu ▸ **Sales results ▸ Orders** (phone: the **Orders** button).

- **Figures**: number of orders, customers (unique), amount this month, FY to date (rejected orders excluded), product groups.
- **List** by month: account, status labels (**Pending · Approved · Rejected**, missing documents, no order type), value, order date.
- Click an order ⇒ **Order details** (every product line, documents, approval history) and **Edit order**.
- The red dot on the Orders menu = things to do (orders waiting for your approval, orders returned for changes, orders not yet sent).
:::split-end

[[fig crmg/order_detail | Order details.]]

## Create a new order

:::split.wide crmg/order_form | The New order form.
Click **＋ New order**.

1. Choose the **Account** (not in the list ⇒ **＋ New account**).
2. Check the **Care history** line (section 5.3).
3. Choose or type the **orderer** (section 5.4).
4. Add **product lines**: Product type, product codes (Detail), **Qty**, **Unit price**. More products ⇒ **＋ Add product**.
5. **Partner (distributor)** fills in by PIC.
6. Choose the **Order Type** (1. tender · 2. distributor / dealer · 3. direct consultation) and add the **documents**: drag and drop, **Paste** a screenshot (Ctrl + V), or **Choose file**.
7. **Save**. For a new order the system e-mails the **HOD**.
:::split-end

## Care history

:::split.wide crmg/order_care | No care history yet ⇒ Add care history inside the order form.
A **new** order can be saved only if the customer has **at least one Completed activity** (Visiting, Telephone, Message…) in the **30 days** before the order date.

None yet? You do not need to leave the form:

1. Click **＋ Add care history**.
2. Choose the **date**, the **type of care**, the **person met**, and write a short note (Visiting: also Customer feedback and Next action).
3. **Save care activity** ⇒ a Completed row is written at once to **6. WEEKLY REPORT**; a person not yet in the contact list is added to **Key Stakeholders**.
4. Save the order as usual. Your order stays as you typed it.
:::split-end

## Orderer and product lines

:::split.wide crmg/order_lines | Type a new contact name; quantity comes before unit price, prices show thousand separators.
- **Contact**: pick an existing person or **type a new name**. For a new person, add the job title and phone; when the order is saved, this person is added automatically to the account's **Key Stakeholders** (tab 2. CBC).
- Product line: enter **Qty** first, then **Unit price**. The price shows thousand separators (200.000); **Amount** is calculated.
- One line with several codes at the same price ⇒ quantity and price apply to the whole line.
:::split-end

## Send for approval

:::split.wide crmg/order_bulk | Send several orders for approval at once.
A **Pending** order that is complete (Order Type + documents) must be **sent for approval**:

- One order: **Send for approval** on the order card.
- Several orders: **Send several for approval** ▸ tick orders or **Select all** ▸ **Send**. The approver receives **one e-mail** listing every order, with the documents embedded.

Incomplete orders are greyed out with the reason (missing documents, no order type).
:::split-end

## Approve orders (HOD)

:::split crmg/order_approve, crmg/m_order_approve | The Approve orders screen: order by order, documents shown at once.
The approver (HOD) clicks the link in the e-mail or **Approve orders** on the Orders page:

- **One by one**: details, product lines, documents (thumbnails, **Full page**). Move with ‹ › or swipe.
- **List**: tick several orders ⇒ **Approve** / **Reject** at once.
- The e-mail link opens the right order directly, even in a phone's e-mail app.

After approval, the salesperson receives the result by e-mail. Editing an approved order (changing, adding or removing products) puts the whole order back to **Pending**.
:::split-end

## Request changes

:::split.wide crmg/order_fix | The salesperson reads the approver's comments and edits the order.
The approver writes a **comment for each order** ⇒ **Send change request** (each salesperson gets one e-mail).

Salesperson: the **Orders needing changes** box opens once by itself (or **View comments** on the yellow banner) ⇒ **Edit order** ⇒ **Send for approval again**.
:::split-end

## Where the data is saved

| Data | Saved in |
|---|---|
| Order lines (one row per product, same Order No.) | The team's CRM file ▸ **3. SALE ORDER** ([[sheet crm-dental | Dental]] · [[sheet crm-surgical | Surgical]] · [[sheet crm-eyeless | Eyeless]]) |
| Order type, documents, approval status, approval note | The last columns of **3. SALE ORDER** |
| Document files | Google Drive ▸ the team's **Sales Order docs** folder |
| E-mails | New order ⇒ HOD · approval request ⇒ approver · result / change request ⇒ salesperson |

:::rule The sales KPI counts approved orders only
**C5** (supported sales), **C6** (Composite) and **C7** (JIZAI) count **Approved** orders only, in the month of the **order date**. Old orders before 10/2026 without a type still count as before.
:::
