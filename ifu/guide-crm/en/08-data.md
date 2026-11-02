---
number: 8
---
[[opener 8 | Where your data is saved | The whole data flow of the CRM in one place: what happens when you click Save, which file and tab the data goes to, and how it is used for reports and KPI. Click a Google Sheet icon to open the right file. | crmg_en/cust | Data flow; Summary by feature; Each team's file; Related systems]]

## Data flow

<div class="flow"><div><b>1 · You click Save</b>On a computer or a phone. The screen updates at once — no waiting.</div><div><b>2 · Queue on the device</b>Text first, photos after. Offline: kept on the device and sent again when online, never written twice.</div><div><b>3 · Your team's server</b>Checks the rules (4 result boxes, care history…) and writes to the right tab and row.</div><div><b>4 · Used next</b>Calendar, weekly / monthly reports, weekly meeting, Dashboard, tab 9. TARGET & KPI ⇒ the KPI FY68 file, e-mails.</div></div>

- The app keeps **no data of its own**; everything is in your team's Google Sheet. If you edit the Sheet directly, the app shows it after **Reload**.
- A small chip on the top bar shows how many changes are **waiting to be sent**. A red chip = an error ⇒ click it to **Retry** or **Discard**.
- Every save has its own ID ⇒ clicking Save twice or a weak connection **never creates duplicate rows**.

## Summary by feature

| What you do in the app | Tab in your team's CRM file | Used for |
|---|---|---|
| Add / edit an **account** | 1. CUSTOMER CODE | Account picker in every form, account profile |
| Add a **contact**, a new orderer, a person met in care history | 2. CBC | Customer contacts, person met |
| **Orders** [[teams vn]] | 3. SALE ORDER (+ documents in Drive) | Order approval, KPI C5 · C6 · C7, Dashboard |
| **Monthly Plan** | 5. MONTHLY REPORT | Monthly report |
| **Field visits**, care history | 6. WEEKLY REPORT (Thailand: CUSTOMER VISITING) + photos in Drive | Calendar, weekly report, visit KPI C3 |
| **Presentations** | 7. PRODUCT PRESENTATION | Event KPI |
| **ADP** | 8. ADP | Account profile, Dashboard |
| (calculated) | 9. TARGET & KPI | KPI & targets ⇒ KPI FY68 file |
| **Weekly meeting** | 13. WEEKLY MEETING | Minutes, e-mail |
| **New accounts & SKUs** | 16. NEW ACCOUNT & SKU (Thailand Surgical: 23.) | KPI C1 / C2 |
| **Other tasks** | ALL TASK | Weekly / monthly reports |
| **Trip proposals** | [[sheet trip | Business Trip file]] + Business Trip Log tab | MMH Calendar, e-mail to the Director |
| **T&E** [[teams d th]] | [[sheet training | Training Master]] ▸ Training Report | Customer training KPI |

## Each team's file

[[backend crm-dental]]
[[backend crm-surgical]]
[[backend crm-eyeless]]
[[backend crm-thai]]
[[backend crm-thai-dental]]

## Related systems

| System | The CRM uses it for | Link |
|---|---|---|
| **Training Hub** | Sign-in (e-mail + 6-digit code), permissions, customer training T&E, training calendar | [[sheet training | Training Master]] |
| **MMH KPI FY68** | KPI targets; receives Actuals from tab 9 | [[sheet kpi | MMH KPI FY68]] |
| **Turnover Report** | Distributor sales and forecast (read-only) | [[sheet turnover | Turnover Report]] |
| **Customer data** | Customers from events | [[sheet cust-data | Customer data]] |
| **Business Trip** | Trip proposals, approvals, trip reports | [[sheet trip | Business Trip]] |
| **Report Hub · Marketing** | MMH Calendar, trips of the Vietnam teams | [[sheet marketing | Report Hub – Marketing]] |

[[backend kpi]]
[[backend training]]
