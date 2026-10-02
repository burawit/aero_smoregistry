# ใบสมัครสมาชิกวิทยุการบิน — web form + member registry

A static web app (GitHub Pages) with a Google Sheets + Apps Script backend, the same pattern as the asset-management PWA.

- **กรอกใบสมัคร** (`index.html`): an employee enters their own details and up to 6 members. The app calculates the fees, saves the application, and prints the filled form in the same 2-page A4 layout as the paper form, ready to sign.
- **ทะเบียนสมาชิก** (`index.html#registry`): staff-only, protected by a staff key. It has search and filters for year, department and status, summary tiles, a list of members who still need to renew, one-click renewal prefill, reprinting, and CSV export.

If `API_URL` is empty, the app runs in **demo mode**: the data stays in that browser only. You can open `index.html` from any local web server to try it.

```
member-registry/
├── index.html          UI (form + registry + print layout)
├── styles.css          screen + print (A4) styles
├── app.js              all front-end logic, no build step
├── config.js           API_URL, fees, addressee, suggestions  ← edit this
├── apps-script/Code.gs backend: paste into the Sheet's Apps Script
└── tests/              backend.test.js (Node, mocked Apps Script), e2e_test.py (Playwright, demo mode)
```

## Setup (about 10 minutes)

1. **Sheet**: create a Google Sheet in the company account, e.g. `Member Registry`. Don't share it publicly.
2. **Script**: Extensions → Apps Script. Replace `Code.gs` with `apps-script/Code.gs`, then save.
3. **Initialize**: select `setup` → Run → authorize. This creates the `Applications` and `Members` sheets. The **ADMIN_KEY** (the staff key) is shown in View → Executions / Logs. To use your own key, edit `setAdminKey()` and run it once.
4. **Deploy**: Deploy → New deployment → type **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone** ("Anyone within domain" makes the browser redirect to a Google login, which breaks `fetch` from GitHub Pages)
   - Copy the URL that ends in `/exec`.
5. **Config**: paste the URL into `config.js` → `API_URL`. Check that the fees match `FEES` in `Code.gs`.
6. **Host**: push the folder to a GitHub repo → Settings → Pages. Any static web server on the intranet also works.

**Updating the script later**: Deploy → Manage deployments → ✏️ Edit → Version: **New version** → Deploy. This keeps the same `/exec` URL. If you choose "New deployment" instead, you get a new URL.

## Data model

Two normalized sheets. Applications form the header, and Members hold one row per person (registry = Members ⋈ Applications on `app_id`).

| Applications | Members |
|---|---|
| `app_id` (PK, `2569-0001`, running number per Buddhist year) | `app_id` (FK), `seq` (1–6) |
| `year_be`, `form_date` (ISO) | `full_name`, `age`, `address`, `relationship` |
| `applicant_name`, `applicant_type`, `department`, `position` | `membership` (สมัครใหม่ / ต่ออายุ) |
| `purpose`, `member_count`, `new_count`, `renew_count` | `year_be`, `applicant_name`, `department` (denormalized for easy filtering in Sheets) |
| `photo_count`, `doc_count`, `member_fee`, `card_fee`, `total_fee` | `created_at` |
| `renewed_from` (previous `app_id` when renewed from the registry), `created_at` | |

Rules used:

- **Membership year** = the Buddhist year of the application date (100 บาท/คน/ปี).
- **Status**:
  - **ใช้งานปีนี้**: the member's year is the current year.
  - **ต้องต่ออายุ**: the member's latest year is earlier than this year.
  - **ประวัติ**: an older row for someone who has since renewed.
  - A "person" is matched by member name + applicant name.
- **Card fee** (20 บาท) is charged only for `สมัครใหม่`. Set `cardOnRenew: true` in `Code.gs` and `CARD_FEE_ON_RENEW: true` in `config.js` to charge renewals too.
- **Fees are recalculated on the server**, so the client can't change totals.

## Security notes

- Submitting is open to anyone who has the page URL. Reading the registry requires the staff key, which the server checks on every request. The key is kept in `sessionStorage` and cleared when the tab closes.
- Unlike the asset PWA, **do not use the gviz/public-sheet read path here**: the sheet holds family members' names, ages and addresses. All reads go through `list`, which requires the key.
- Text is written as plain text with a guard against formula injection (`=`, `+`, `-`, `@`), both in Sheets and in the CSV export.
- This collects personal data of employees' families. Check retention and consent with the company's PDPA / IT team before going live.

## Tests

```bash
node tests/backend.test.js        # Code.gs against mocked SpreadsheetApp / PropertiesService / LockService
python3 tests/e2e_test.py         # Playwright, demo mode: validate → submit → print (2 A4 pages) → registry → CSV → renew
```
