---
number: 2
---
[[opener 2 | Calendar and field visits | The screen you use most: plan customer meetings, record the result right after the meeting, take photos on site. Each field visit is one row in your team's CRM file. | crmg_en/cal_month | View the calendar; Add a field visit; Record the result (4 boxes); Completion and finish date; Field photos; Rules and the visit KPI; Where the data is saved]]

## View the calendar

:::split.wide crmg_en/home | The week calendar: each card is a task, coloured by type (field visit, other task, trip, training).
Left menu ▸ **Field visits** (phone: the **Calendar** button).

- **Week / Month / List**: change the view. **‹ ›** moves between weeks, **Today** comes back to this week.
- The figures at the top: field visits, other tasks and trip days in the week.
- Filter chips: show or hide **Field visits · Other tasks · Trips · Training**, **Hide finished**, **In progress**, **Overdue**.
- Team Leaders and managers: the **Whole team** chip or one PIC.
- Click a card to open it, edit it or report the result.
:::split-end

[[fig crmg_en/cal_month, crmg_en/cal_list | Month view (left) and list view (right).]]

## Add a field visit

:::split crmg_en/add_menu, crmg_en/visit_new | Click ＋ under a day (left) ▸ the Add field visit form (right).
1. On the calendar, click **＋ Add task** under a day (or **＋ Add task** at the top; phone: the round **＋** button). Choose **Field visit**.
2. **Account**: click to see the list or type to filter. Not in the list ⇒ **＋ New account** (section 4.2).
3. **Type task / Sales Process / Product group** are filled in from your last visit to that account; just check them.
4. **Type action**: Visiting, Telephone, Message…
5. **Plan**: what you intend to do (optional).
6. Only planning ⇒ keep **Task Status = To Do / Not Started** ▸ **Save**.

The form closes at once; the data is written to Google Sheet in the background. No signal? Nothing is lost: the app sends it again when you are back online.
:::split-end

## Record the result: 4 required boxes

:::split crmg_en/visit_result, crmg_en/m_visit_result | Task Result has 4 boxes (computer) · Report result on a phone.
After the meeting, open the card (phone: **Report result**):

1. Click **CBC — person met** and pick the person from your customer contacts. The **Person met:** line is required.
2. Fill in **all 4 boxes** of **Task Result**:
   - **Actions Taken**: what you did;
   - **Current Situation**: the customer's current situation;
   - **Customer Feedback**: what the customer said;
   - **Opportunities / Next Steps**: opportunities and the next step.
3. Choose **Customer feedback** and **Next action**.
4. Set **Task Status = Completed** ▸ **Save**.

Each box has a **Voice** button to dictate instead of typing. If a **Completed** task misses a box, the app marks it red and does not save.
:::split-end

## Completion and finish date

:::split crmg_en/visit_finish | When you complete a task from an earlier day, choose the day it ended.
When you set a task from an **earlier day** to **Completed**, the app asks **This task ended on**:

- **The selected date** (default): keeps the task's own date;
- **Today**: the task ended today;
- **Another date**: pick a day in the past.

The date is saved exactly as you choose; it no longer jumps to today. A task dated in the future cannot be set to Completed.
:::split-end

## Field photos [[teams vn]]

:::split crmg/m_photo, crmg/photos | Taking a photo in a field visit card (left) · the Field photos library (right). Vietnamese interface.
For **Dental VN, Surgical VN and Eyeless VN** only. The two Thailand teams do not take field photos.

1. Open the field visit card (phone: **Take photo** on today's card).
2. Take the photo on site. The app records the GPS location and the time.
3. The photo is sent in the background **after the text is saved**; without signal it waits on the phone and is sent when you are back online.

Menu ▸ **Field photos**: all photos by PIC / month, statistics, export to PowerPoint / Excel.

:::rule Photos count for the visit KPI
A **Visiting · Completed** visit counts for the KPI only **with a photo**.
:::
:::split-end

## Rules and the visit KPI

| Rule | Details |
|---|---|
| **Visiting set to Completed** | Needs a full Task Result (4 boxes + person met), Customer feedback and Next action |
| **Visit KPI (C3)** | Counts only **Visiting · Completed** visits dated today or earlier, **with a photo** (Vietnam teams), not TBD rows |
| **Next action = Stop** | A **reason for stopping** is required |
| **Next week's plan (TBD)** | Dental VN, Surgical VN: the weekly report needs next week's plan (a TBD row if the account is not known yet). Eyeless VN: not required. |
| **Changing the date** | Edit the date in the card; unsent changes are kept and sent again, nothing is lost |

## Where the data is saved

| Data | Team | Saved in (file ▸ tab) |
|---|---|---|
| Field visits: account, plan, result, status, next action, photo, GPS | Dental VN | [[sheet crm-dental | MMH_Dental_CRM]] ▸ **6. WEEKLY REPORT** |
| | Surgical VN | [[sheet crm-surgical | MMH_Surgical_CRM]] ▸ **6. WEEKLY REPORT** |
| | Eyeless VN | [[sheet crm-eyeless | MMH_Eyeless_CRM]] ▸ **6. WEEKLY REPORT** |
| | Thailand Surgical | [[sheet crm-thai | FY68_Thailand_Surgical_CRM]] ▸ **6. CUSTOMER VISITING** |
| | Thailand Dental | [[sheet crm-thai-dental | Thailand Dental Action FY68]] ▸ **CUSTOMER VISITING** |
| Field photos | 3 Vietnam teams | Google Drive, the team's photo folder (file name *PIC_date_account*); the photo link goes into the Photo column of tab 6 |

From this tab the numbers feed the calendar, weekly report, weekly meeting, Dashboard and the **9. TARGET & KPI** tab (visit KPI) ⇒ the KPI FY68 file.
