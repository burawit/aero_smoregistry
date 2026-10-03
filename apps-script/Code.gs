/**
 * ใบสมัครสมาชิกวิทยุการบิน — backend (Google Apps Script, bound to a Google Sheet)
 *
 * Setup
 *   1. Create a Google Sheet in the company account → Extensions → Apps Script → paste this file.
 *   2. Run `setup()` once (authorize). It creates the sheets and an ADMIN_KEY (see Execution log).
 *   3. Deploy → New deployment → Web app. Execute as: Me. Who has access: Anyone.
 *   4. Put the /exec URL into config.js (API_URL).
 *   After editing this file: Deploy → Manage deployments → Edit → Version: New version (same URL).
 *
 * API (POST, body = JSON as text/plain so the browser skips the CORS preflight)
 *   { action: "submit", data: {...} }            → public: save one application
 *   { action: "list",   key: "<ADMIN_KEY>" }     → staff: all applications + members
 *
 * Rules: ประกาศ ที่ ปก/ศช.บภ ๒-๑๘๙๙/๒๕๖๙ (แนวปฏิบัติเกี่ยวกับการใช้สถานที่การกีฬาของศูนย์ควบคุมการบินเชียงใหม่ พ.ศ. ๒๕๖๙)
 * Member types (ส่วนที่ ๒ ข้อ ๖)
 *   ประเภท ๑ พนักงาน/ลูกจ้าง/พนักงานเกษียณอายุ — member by status, not listed on the form, no fees
 *   Form layout: 12 rows = ครอบครัว rows 1–9, บุคคลภายนอก rows 10–12 (seq follows these row numbers)
 *   ประเภท ๒ ครอบครัวพนักงาน — card required: card fee 20 บาท/คน/ปี only
 *   ประเภท ๓ บุคคลภายนอก   — card fee + membership fee 100 บาท/คน/ปี; court fees are paid per use; certified by a
 *                             พนักงานศูนย์ควบคุมการบินเชียงใหม่, max 3 outsiders per certifier
 */

const SHEET_APPS = 'Applications';
const SHEET_MEMBERS = 'Members';

// Columns are matched by name, so new columns are simply appended to existing sheets.
const APP_HEADERS = [
  'app_id', 'year_be', 'form_date', 'applicant_name', 'applicant_type', 'department', 'position',
  'purpose', 'member_count', 'family_count', 'outsider_count', 'new_count', 'renew_count',
  'photo_count', 'member_fee', 'card_fee', 'facility_fee', 'total_fee',
  'renewed_from', 'created_at',
];
const MEMBER_HEADERS = [
  'app_id', 'seq', 'full_name', 'age', 'address', 'relationship', 'member_type', 'membership',
  'year_be', 'applicant_name', 'department', 'created_at',
];

// Keep these in sync with config.js
const FEES = {
  member: 100,        // ค่าสมาชิก บาท/คน/ปี — บุคคลภายนอกเท่านั้น (ข้อ ๑๖)
  card: 20,           // ค่าจัดทำบัตรสมาชิก บาท/คน/ปี — ครอบครัวและบุคคลภายนอก (ข้อ ๑๖)
  facility: 0,        // ค่าบริการสนามคิดรายชั่วโมงเมื่อใช้บริการ จึงไม่เก็บในใบสมัคร
  cardOnRenew: true,  // ข้อ ๑๖: ค่าจัดทำบัตร "/คน/ปี" → charged on renewals too
};
const RULES = {
  maxOutsidersPerCertifier: 3,         // ข้อ ๖.๓: per certifier per membership year (= outsider rows on the form)
};
const LIMITS = { maxMembers: 12, text: 150, address: 400 };
const FAMILY_ROWS = LIMITS.maxMembers - RULES.maxOutsidersPerCertifier; // rows 1–9
const APPLICANT_TYPES = ['พนักงาน', 'ลูกจ้าง', 'พนักงานเกษียณอายุ'];
const MEMBERSHIP = ['สมัครใหม่', 'ต่ออายุ'];
const FAMILY = 'ครอบครัวพนักงาน';
const OUTSIDER = 'บุคคลภายนอก';
const MEMBER_TYPES = [FAMILY, OUTSIDER];

// ---------------------------------------------------------------- entry points
function doGet() {
  return json_({ ok: true, service: 'member-registry', time: new Date().toISOString() });
}

function doPost(e) {
  try {
    const req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    switch (req.action) {
      case 'submit':
        return json_(submit_(req.data));
      case 'list':
        requireAdmin_(req.key);
        return json_(list_());
      case 'ping':
        return json_({ ok: true });
      default:
        throw httpError_('unknown action', 400);
    }
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err), code: err.code || 500 });
  }
}

/** Run once from the editor. Safe to run again (also adds any new columns). */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheets_(ss);
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('ADMIN_KEY')) {
    props.setProperty('ADMIN_KEY', Utilities.getUuid().replace(/-/g, '').slice(0, 12));
  }
  Logger.log('ADMIN_KEY (staff key for the registry): ' + props.getProperty('ADMIN_KEY'));
}

/** Change the staff key: edit the value below, run once, then revert the edit. */
function setAdminKey() {
  const newKey = 'CHANGE-ME';
  if (newKey === 'CHANGE-ME' || newKey.length < 8) throw new Error('Set a key of at least 8 characters first');
  PropertiesService.getScriptProperties().setProperty('ADMIN_KEY', newKey);
}

// ---------------------------------------------------------------- actions
function submit_(d) {
  if (!d || typeof d !== 'object') throw httpError_('ข้อมูลไม่ถูกต้อง', 400);

  const formDate = isoDate_(d.formDate);
  const yearBE = Number(formDate.slice(0, 4)) + 543;
  const app = {
    applicant_name: str_(d.applicantName, LIMITS.text, 'ชื่อ - สกุล ผู้ยื่น'),
    applicant_type: d.applicantType ? oneOf_(d.applicantType, APPLICANT_TYPES, 'ประเภทผู้ยื่น') : '', // no longer asked
    department: str_(d.department, LIMITS.text, 'สังกัด'),
    position: str_(d.position, LIMITS.text, null),
    purpose: oneOf_(d.purpose, MEMBERSHIP, 'ความประสงค์'),
    renewed_from: str_(d.renewedFrom, 20, null),
  };

  const raw = Array.isArray(d.members) ? d.members : [];
  if (raw.length < 1 || raw.length > LIMITS.maxMembers) {
    throw httpError_('จำนวนสมาชิกต้องอยู่ระหว่าง 1–' + LIMITS.maxMembers + ' คน', 400);
  }
  const members = raw.map(function (m, i) {
    const n = i + 1;
    const age = Number(m && m.age);
    if (!Number.isInteger(age) || age < 0 || age > 120) throw httpError_('อายุของสมาชิกลำดับที่ ' + n + ' ไม่ถูกต้อง', 400);
    return {
      seq: n,
      full_name: str_(m.fullName, LIMITS.text, 'ชื่อ - สกุล สมาชิกลำดับที่ ' + n),
      age: age,
      address: str_(m.address, LIMITS.address, 'ที่อยู่ของสมาชิกลำดับที่ ' + n),
      relationship: str_(m.relationship, LIMITS.text, 'ฐานะของสมาชิกลำดับที่ ' + n),
      member_type: oneOf_(m.memberType, MEMBER_TYPES, 'ประเภทสมาชิกลำดับที่ ' + n),
      membership: oneOf_(m.membership, MEMBERSHIP, 'สมาชิกภาพลำดับที่ ' + n),
    };
  });

  // ข้อ ๖.๓ — at most 3 outsiders per certifier; the rest of the rows are for ครอบครัว
  const outsiders = members.filter(function (m) { return m.member_type === OUTSIDER; });
  if (outsiders.length > RULES.maxOutsidersPerCertifier) {
    throw httpError_('พนักงาน 1 ท่านรับรองบุคคลภายนอกได้สูงสุด ' + RULES.maxOutsidersPerCertifier + ' คน', 400);
  }
  if (members.length - outsiders.length > FAMILY_ROWS) {
    throw httpError_('ครอบครัวพนักงานกรอกได้สูงสุด ' + FAMILY_ROWS + ' คนต่อใบสมัคร', 400);
  }
  // seq = row number on the form: ครอบครัว 1..9, บุคคลภายนอก 10..12 (input order kept within each section)
  let famNo = 0;
  let outNo = 0;
  members.forEach(function (m) { m.seq = m.member_type === OUTSIDER ? FAMILY_ROWS + (++outNo) : ++famNo; });

  const fees = computeFees_(members);
  const photo = count_(d.photoCount, members.length * 2);
  const createdAt = new Date();

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  let appId;
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    ensureSheets_(ss);

    if (outsiders.length) {
      // Count outsiders this person already certified in the same membership year (distinct names).
      const already = {};
      readObjects_(ss.getSheetByName(SHEET_MEMBERS)).forEach(function (r) {
        if (r.member_type === OUTSIDER && Number(r.year_be) === yearBE &&
            nameKey_(r.applicant_name) === nameKey_(app.applicant_name)) already[nameKey_(r.full_name)] = true;
      });
      const total = Object.assign({}, already);
      outsiders.forEach(function (m) { total[nameKey_(m.full_name)] = true; });
      const used = Object.keys(already).length;
      if (Object.keys(total).length > RULES.maxOutsidersPerCertifier) {
        throw httpError_('พนักงาน 1 ท่านรับรองบุคคลภายนอกได้สูงสุด ' + RULES.maxOutsidersPerCertifier +
          ' คนต่อปี — ปี ' + yearBE + ' ท่านรับรองไปแล้ว ' + used + ' คน (รับรองเพิ่มได้อีก ' +
          Math.max(0, RULES.maxOutsidersPerCertifier - used) + ' คน)', 409);
      }
    }

    const props = PropertiesService.getScriptProperties();
    const seqKey = 'SEQ_' + yearBE;
    const seq = Number(props.getProperty(seqKey) || 0) + 1;
    props.setProperty(seqKey, String(seq));
    appId = yearBE + '-' + ('000' + seq).slice(-4);

    const appRow = Object.assign({
      app_id: appId, year_be: yearBE, form_date: formDate,
      member_count: members.length, family_count: fees.familyCount, outsider_count: fees.outsiderCount,
      new_count: fees.newCount, renew_count: fees.renewCount, photo_count: photo,
      member_fee: fees.memberFee, card_fee: fees.cardFee, facility_fee: fees.facilityFee, total_fee: fees.total,
      created_at: createdAt,
    }, app);
    appendObjects_(ss.getSheetByName(SHEET_APPS), APP_HEADERS, [appRow]);
    appendObjects_(ss.getSheetByName(SHEET_MEMBERS), MEMBER_HEADERS, members.map(function (m) {
      return Object.assign({ app_id: appId, year_be: yearBE, applicant_name: app.applicant_name,
        department: app.department, created_at: createdAt }, m);
    }));
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }

  const application = Object.assign({ app_id: appId, year_be: yearBE, form_date: formDate,
    member_count: members.length, family_count: fees.familyCount, outsider_count: fees.outsiderCount,
    new_count: fees.newCount, renew_count: fees.renewCount, photo_count: photo,
    member_fee: fees.memberFee, card_fee: fees.cardFee, facility_fee: fees.facilityFee,
    total_fee: fees.total, created_at: createdAt.toISOString() }, app);
  return {
    ok: true,
    appId: appId,
    application: application,
    members: members.map(function (m) { return Object.assign({ app_id: appId, year_be: yearBE }, m); }),
  };
}

function list_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheets_(ss);
  return {
    ok: true,
    applications: readObjects_(ss.getSheetByName(SHEET_APPS)),
    members: readObjects_(ss.getSheetByName(SHEET_MEMBERS)),
    serverTime: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------- helpers
function computeFees_(members) {
  const outsiderCount = members.filter(function (m) { return m.member_type === OUTSIDER; }).length;
  const newCount = members.filter(function (m) { return m.membership === 'สมัครใหม่'; }).length;
  const cardPeople = FEES.cardOnRenew ? members.length : newCount;
  const memberFee = outsiderCount * FEES.member;
  const cardFee = cardPeople * FEES.card;
  const facilityFee = outsiderCount * FEES.facility;
  return {
    familyCount: members.length - outsiderCount, outsiderCount: outsiderCount,
    newCount: newCount, renewCount: members.length - newCount,
    memberFee: memberFee, cardFee: cardFee, facilityFee: facilityFee, total: memberFee + cardFee + facilityFee,
  };
}

function ensureSheets_(ss) {
  [[SHEET_APPS, APP_HEADERS], [SHEET_MEMBERS, MEMBER_HEADERS]].forEach(function (def) {
    let sh = ss.getSheetByName(def[0]);
    if (!sh) sh = ss.insertSheet(def[0]);
    ensureHeaders_(sh, def[1]);
  });
}

/** Returns the sheet's header row, appending any expected column that is missing. */
function ensureHeaders_(sheet, expected) {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, expected.length).setValues([expected]).setFontWeight('bold');
    sheet.setFrozenRows(1);
    return expected.slice();
  }
  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
  const missing = expected.filter(function (h) { return headers.indexOf(h) === -1; });
  if (missing.length) {
    sheet.getRange(1, lastCol + 1, 1, missing.length).setValues([missing]).setFontWeight('bold');
    return headers.concat(missing);
  }
  return headers;
}

function appendObjects_(sheet, expected, objs) {
  if (!objs.length) return;
  const headers = ensureHeaders_(sheet, expected);
  const rows = objs.map(function (o) {
    return headers.map(function (h) { return cell_(o[h] === undefined ? '' : o[h], h); });
  });
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, headers.length).setValues(rows);
}

// Text cells: block formula injection, and keep ids/dates as plain text (no auto-conversion).
const TEXT_AS_IS = { app_id: 1, form_date: 1, renewed_from: 1 };
function cell_(v, header) {
  if (typeof v !== 'string') return v;
  if (TEXT_AS_IS[header] && v !== '') return "'" + v;
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function readObjects_(sheet) {
  const values = sheet.getDataRange().getValues();
  const headers = values.shift() || [];
  return values
    .filter(function (r) { return r[0] !== ''; })
    .map(function (r) {
      const o = {};
      headers.forEach(function (h, i) { o[h] = r[i] instanceof Date ? r[i].toISOString() : r[i]; });
      return o;
    });
}

function nameKey_(s) {
  return String(s || '').replace(/\s+/g, '').toLowerCase();
}

function requireAdmin_(key) {
  const expected = PropertiesService.getScriptProperties().getProperty('ADMIN_KEY');
  if (!expected || typeof key !== 'string' || key !== expected) throw httpError_('unauthorized', 401);
}

function str_(v, max, label) {
  const s = (v === undefined || v === null ? '' : String(v)).replace(/\s+/g, ' ').trim();
  if (!s && label) throw httpError_('กรุณากรอก' + label, 400);
  if (s.length > max) throw httpError_((label || 'ข้อความ') + ' ยาวเกินไป', 400);
  return s;
}

function oneOf_(v, allowed, label) {
  if (allowed.indexOf(v) === -1) throw httpError_('กรุณาเลือก' + label, 400);
  return v;
}

function count_(v, fallback) {
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 && n <= 100 ? n : fallback;
}

function isoDate_(v) {
  const s = String(v || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw httpError_('วันที่ไม่ถูกต้อง', 400);
  const y = Number(s.slice(0, 4));
  if (y < 2020 || y > 2100) throw httpError_('วันที่ไม่ถูกต้อง (ใช้ปี ค.ศ. ในระบบ)', 400);
  return s;
}

function httpError_(message, code) {
  const e = new Error(message);
  e.code = code;
  return e;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
