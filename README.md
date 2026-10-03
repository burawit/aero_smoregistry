# ใบสมัครสมาชิกวิทยุการบิน — web form + member registry

A static web app (GitHub Pages) with a Google Sheets + Apps Script backend, the same pattern as the asset-management PWA.

- **กรอกใบสมัคร** (`index.html`): an employee enters their own details and up to 12 members (ครอบครัว 9 + บุคคลภายนอก 3), each with a photo. The app calculates the fees, saves the application, and prints the filled form in the same 2-page A4 layout as the paper form, ready to sign.
- **ทะเบียนสมาชิก** (`index.html#registry`): staff-only, protected by a staff key. It has search and filters for year, department and status, summary tiles, a list of members who still need to renew, one-click renewal prefill, photos, member-card printing, reprinting, and CSV export.

If `API_URL` is empty, the app runs in **demo mode**: the data stays in that browser only. You can open `index.html` from any local web server to try it.

```
member-registry/
├── index.html          UI (form + registry + print layout)
├── styles.css          screen + print (A4) styles
├── app.js              all front-end logic, no build step
├── config.js           API_URL, fees, addressee, suggestions  ← edit this
├── departments.js      สังกัด list for autocomplete ([code, name], 106 units)
├── positions.js        ตำแหน่ง list for autocomplete (382 positions)
├── apps-script/Code.gs backend: paste into the Sheet's Apps Script
├── tools/              departments.csv, positions.csv + build_lists.py (regenerates the two .js lists)
└── tests/              backend.test.js (Node, mocked Apps Script), e2e_test.py (Playwright, demo mode)
```

### สังกัด and ตำแหน่ง lists
`departments.js` feeds the autocomplete. Typing `ศช`, `เชียงใหม่` or `ศชบภ2` suggests or expands to the canonical
`ศช.บภ 2. ศูนย์ควบคุมการบินเชียงใหม่`, so the registry groups each unit under one value. Units not in the list are still
accepted, with a warning hint. ตำแหน่ง works the same way (`positions.js`): typing part of a title suggests matches,
and spacing differences are fixed on leaving the field. On the printout, long values shrink to fit their dotted line.

To update either list, edit `tools/departments.csv` or `tools/positions.csv`, run `python3 tools/build_lists.py`
(it also rejects duplicates), then upload the regenerated `departments.js` / `positions.js`.
They are separate files so updating them never touches `API_URL` in `config.js`.

## Setup (about 10 minutes)

1. **Sheet**: create a Google Sheet in the company account, e.g. `Member Registry`. Don't share it publicly.
2. **Script**: Extensions → Apps Script. Replace `Code.gs` with `apps-script/Code.gs`, then save.
3. **Initialize**: select `setup` → Run → authorize (Sheets **and Google Drive**, for photos). This creates the `Applications` and `Members` sheets and a private Drive folder `รูปถ่ายสมาชิก (member-registry)`. The **ADMIN_KEY** (the staff key) is shown in View → Executions / Logs. To use your own key, edit `setAdminKey()` and run it once.
4. **Deploy**: Deploy → New deployment → type **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone** ("Anyone within domain" makes the browser redirect to a Google login, which breaks `fetch` from GitHub Pages)
   - Copy the URL that ends in `/exec`.
5. **Config**: paste the URL into `config.js` → `API_URL`. Check that the fees match `FEES` in `Code.gs`.
6. **Host**: push the folder to a GitHub repo → Settings → Pages. Any static web server on the intranet also works.

**Updating the script later**: Deploy → Manage deployments → ✏️ Edit → Version: **New version** → Deploy. This keeps the same `/exec` URL. If you choose "New deployment" instead, you get a new URL.
If the new version uses a new Google service (photos added Google Drive), run `setup` once in the editor first so Google asks for that permission.

## Data model

Two normalized sheets. Applications form the header, and Members hold one row per person (registry = Members ⋈ Applications on `app_id`).

| Applications | Members |
|---|---|
| `app_id` (PK, `2570-0001`, running number per membership year) | `app_id` (FK), `seq` = row on the form (ครอบครัว 1–9, บุคคลภายนอก 10–12) |
| `year_be`, `form_date` (ISO) | `full_name`, `age`, `address`, `relationship` |
| `applicant_name`, `applicant_type`, `department`, `position` | `member_type` (ครอบครัวพนักงาน / บุคคลภายนอก) |
| `purpose`, `member_count`, `family_count`, `outsider_count`, `new_count`, `renew_count` | `membership` (สมัครใหม่ / ต่ออายุ) |
| `photo_count`, `doc_count`, `member_fee`, `card_fee`, `facility_fee`, `total_fee` | `year_be`, `applicant_name`, `department` (denormalized for easy filtering in Sheets) |
| `renewed_from` (previous `app_id` when renewed from the registry), `created_at` | `created_at`, `photo_id` (Drive file), `photo_thumb` (small JPEG data URL) |

Columns are matched by **name**, not position. When `Code.gs` adds a column, it is appended to the end of the existing
sheet on the next submit (or run `setup()` once to add it straight away). Old rows simply have it blank.

### Member types (ประกาศ ที่ ปก/ศช.บภ ๒-๑๘๙๙/๒๕๖๙, ส่วนที่ ๒ ข้อ ๖–๘ และข้อ ๑๖)

| ประเภท | Who | On the form? | ค่าจัดทำบัตร (20/ปี) | ค่าสมาชิก (100/ปี) | Certified by an employee? |
|---|---|---|---|---|---|
| ๑ | พนักงาน, ลูกจ้าง, พนักงานเกษียณอายุ | No, member by status | – | – | – |
| ๒ | ครอบครัวพนักงาน | Yes | Yes (every year) | No | No |
| ๓ | บุคคลภายนอก | Yes | Yes (every year) | Yes | Yes |

- **Form layout**: up to 12 members per application — ครอบครัว rows 1–9, บุคคลภายนอก rows 10–12. Once 3 outsiders are
  chosen, the web form greys out บุคคลภายนอก for the other members.
- **Outsiders (ประเภท ๓)** must be submitted and certified by a **พนักงาน** of ศูนย์ควบคุมการบินเชียงใหม่. The certification text and tick box
  appear only when the application includes an outsider, and the printout names the outsider rows.
- **Max 3 outsiders per certifier per membership year.** The form checks one application; the server also counts what that
  applicant already certified that year (distinct names, matched by applicant name) and rejects the 4th.
- Outsiders may use only the tennis and badminton courts, every day except Sunday (AEROTHAI FAMILY DAY), 15.30–20.30,
  and pay court fees per hour when they play (tennis 100, badminton 60 บาท/คน/ชม.). This is printed as a note.
- **No copy documents** (ID card / house registration / employee card copies) — the announcement doesn't require them.

Other rules:

- **Membership year** = ปีงบประมาณ, 1 ต.ค.–30 ก.ย. (`MEMBERSHIP_YEAR` in Code.gs, `MEMBERSHIP_YEAR_START_MONTH` in config).
  A form dated 2 ต.ค. 2569 belongs to ปีงบ 2570 and its card expires 30 ก.ย. 2570. Rows saved before this rule can be moved
  with `fixMembershipYear()` (run once in the editor).
- **Status**:
  - **ใช้งานปีนี้**: the member's year is the current year.
  - **ต้องต่ออายุ**: the member's latest year is earlier than this year.
  - **ประวัติ**: an older row for someone who has since renewed.
  - A "person" is matched by member name + applicant name.
- **Card fee** is 20 บาท/คน/**ปี** (ข้อ ๑๖), so it is charged on renewals too (`CARD_FEE_ON_RENEW: true`, `cardOnRenew: true`). Set `cardOnRenew: true` in `Code.gs` and `CARD_FEE_ON_RENEW: true` in `config.js` to charge renewals too.
- **Fees are recalculated on the server**, so the client can't change totals.

## Photos and member cards

- **Photo per member**, attached in the form: required for **สมัครใหม่**; for **ต่ออายุ** the latest photo on file for the same
  member + ผู้ยื่น is reused (a new one can still be attached). The browser crops every photo to 3:4 and sends a card-size
  JPEG (450×600) plus a 96×128 thumbnail. The server checks it is a real JPEG, saves the full photo as a private file in the
  Drive folder (named `2570-0001-10 ชื่อ.jpg`) and keeps the thumbnail in the `Members` sheet.
- **Registry**: thumbnails per member, tap one to add or replace a photo (e.g. taken at the counter; the old file goes to the
  Drive trash). The tile "ยังไม่มีรูปถ่าย" counts this year's members still without one.
- **Cards**: tick members of the current year → **พิมพ์บัตร**. Prints A4 sheets of 10 cards (85.6 × 54 mm, ID-card size) with
  crop marks: page 1 fronts, page 2 backs mirrored per row → print **double-sided, flip on long edge**, cut, laminate.
  Front: photo, name, member no. (`app_id-ลำดับ`), ประเภท colour band (ฟ้า = ครอบครัว, ส้ม = บุคคลภายนอก), พนักงาน/ผู้รับรอง,
  ฐานะ, สิทธิ์, ออกบัตร / หมดอายุ. Back: conditions from the announcement, issuer signature, "หากพบบัตรนี้โปรดส่งคืน".
  Optional `CARD_LOGO` and `CARD_CONTACT` in config.js.
- Full photos are only returned by the `photos` action (staff key) and only for members listed in the sheet.

## ต่ออายุ from the public form

Choosing **ต่ออายุสมาชิก** shows "ดึงข้อมูลจากใบสมัครเดิม": the employee enters their **name (ข้อ 1) + previous application no.**
(printed on the form / shown after saving). Both must match (`renewLookup`). Only member **names** come back (plus member
type and whether a photo is on file) — age, address, ฐานะ and photos are never sent to the browser. Fields left blank keep
the stored values: on save the server re-checks name + number, copies the blanks from the old row (age + years passed) and
keeps the photo. Wrong guesses are rate-limited (5 per name, 40 in total, per hour; `LOOKUP` in Code.gs). Staff can still
renew with full details from the registry.

## Security notes

- Submitting is open to anyone who has the page URL. Reading the registry requires the staff key, which the server checks on every request. The key is kept in `sessionStorage` and cleared when the tab closes.
- Unlike the asset PWA, **do not use the gviz/public-sheet read path here**: the sheet holds family members' names, ages and addresses. All reads go through `list`, which requires the key.
- Text is written as plain text with a guard against formula injection (`=`, `+`, `-`, `@`), both in Sheets and in the CSV export.
- This collects personal data of employees' families. Check retention and consent with the company's PDPA / IT team before going live.

## Tests

```bash
node tests/backend.test.js        # Code.gs against mocked SpreadsheetApp / PropertiesService / LockService
python3 tests/e2e_test.py         # Playwright, demo mode: validate → photos → submit → print → registry → CSV → renew → cards
```
