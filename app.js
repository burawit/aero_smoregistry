/* ใบสมัครสมาชิกวิทยุการบิน — front end (vanilla JS, no build step) */
(function () {
  'use strict';

  // ------------------------------------------------------------------ config
  const CFG = Object.assign({
    API_URL: '', MEMBER_FEE: 100, CARD_FEE: 20, CARD_FEE_ON_RENEW: true, MAX_MEMBERS: 12,
    ADDRESSEE: 'ผศช.บภ 2.', DIRECTOR_TITLE: 'ผู้อำนวยการศูนย์ควบคุมการบินเชียงใหม่',
    COMPANY_NAME: 'บริษัท วิทยุการบินแห่งประเทศไทย จำกัด', DEPARTMENTS: [], RELATIONSHIPS: [],
    // ระเบียบ ส่วนที่ ๒ ข้อ ๖ — keep in sync with FEES / RULES in Code.gs
    FACILITY_FEE: 0,                       // ค่าบริการสนามคิดรายชั่วโมงเมื่อใช้บริการ (ข้อ ๑๖) จึงไม่เก็บในใบสมัคร
    RULE_REF: 'ประกาศ ที่ ปก/ศช.บภ ๒-๑๘๙๙/๒๕๖๙ แนวปฏิบัติเกี่ยวกับการใช้สถานที่การกีฬาของศูนย์ควบคุมการบินเชียงใหม่ พ.ศ. ๒๕๖๙',
    OUTSIDER_RULES: 'ใช้ได้เฉพาะสนามเทนนิสและสนามแบดมินตัน ทุกวัน ยกเว้นวันอาทิตย์ เวลา 15.30–20.30 น. ' +
      'และชำระค่าบริการสนามเมื่อใช้ (เทนนิส 100 บาท/คน/ชม. แบดมินตัน 60 บาท/คน/ชม.)',
    MAX_OUTSIDERS: 3,                      // บุคคลภายนอกที่พนักงาน 1 ท่านรับรองได้
    CERTIFIER_UNIT: 'ศูนย์ควบคุมการบินเชียงใหม่',
    OUTSIDER_RELATIONSHIPS: ['เพื่อน', 'เพื่อนร่วมงาน', 'คนรู้จัก'],
    // ปีสมาชิก = ปีงบประมาณ 1 ต.ค.–30 ก.ย. (บัตรหมดอายุ 30 ก.ย.); 1 = ปีปฏิทิน. Keep in sync with MEMBERSHIP_YEAR in Code.gs
    MEMBERSHIP_YEAR_START_MONTH: 10,
    // บัตรสมาชิก
    CARD_TITLE: 'บัตรสมาชิกสถานที่การกีฬา',
    CARD_LOGO: '',                         // optional image in the repo, e.g. "logo.png"
    CARD_CONTACT: '',                      // optional, e.g. "โทร 0 5320 0000"
    FAMILY_RIGHTS: 'ใช้ได้ทุกสถานที่การกีฬา',
    OUTSIDER_RIGHTS: 'สนามเทนนิส · สนามแบดมินตัน',
    OUTSIDER_HOURS: 'ทุกวัน ยกเว้นวันอาทิตย์ 15.30–20.30 น.',
  }, window.APP_CONFIG || {});
  const DEMO = !CFG.API_URL;

  const MEMBERSHIP = ['สมัครใหม่', 'ต่ออายุ'];
  const PURPOSES = [['สมัครใหม่', 'สมัครเข้าเป็นสมาชิกใหม่'], ['ต่ออายุ', 'ต่ออายุสมาชิก']];
  const TH_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  const TH_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  // Member types (ระเบียบ ข้อ ๖). ประเภท ๑ (พนักงาน/ลูกจ้าง/เกษียณ) is a member by status and is not listed.
  const FAMILY = 'ครอบครัวพนักงาน';
  const OUTSIDER = 'บุคคลภายนอก';
  const MEMBER_TYPES = [[FAMILY, 'ครอบครัวพนักงาน (ประเภท ๒)'], [OUTSIDER, 'บุคคลภายนอก (ประเภท ๓)']];
  const MEMBER_TYPE_CARDS = [
    [FAMILY, 'ครอบครัวพนักงาน', `ประเภท ๒ · ค่าทำบัตร ${CFG.CARD_FEE} บาท/ปี · ใช้ได้ทุกสถานที่`],
    [OUTSIDER, 'บุคคลภายนอก', `ประเภท ๓ · ค่าบัตร ${CFG.CARD_FEE} + ค่าสมาชิก ${CFG.MEMBER_FEE} บาท/ปี · ต้องมีพนักงานรับรอง · เฉพาะเทนนิส/แบดมินตัน`],
  ];
  const REL_OTHER = '__other';
  const isOutsider = (m) => (m.memberType || m.member_type) === OUTSIDER;
  // ฐานะ suggestions for family members (ตนเอง = ประเภท ๑ and "บุคคลภายนอก" are types, not relationships)
  const FAMILY_RELATIONSHIPS = (CFG.RELATIONSHIPS || []).filter((d) => d !== 'ตนเอง' && d !== OUTSIDER);
  const relOptions = (m) => (isOutsider(m) ? (CFG.OUTSIDER_RELATIONSHIPS || []) : FAMILY_RELATIONSHIPS);
  // Which chip is selected: a listed relationship, "อื่น ๆ" (free text), or nothing yet.
  const relChoice = (m) => (m.relOther ? REL_OTHER
    : (relOptions(m).includes(m.relationship) ? m.relationship : (m.relationship ? REL_OTHER : '')));
  // Only outsiders (ประเภท ๓) need a certifying employee (ข้อ ๖.๓).
  const certText = (who) => `ข้าพเจ้าเป็นพนักงาน${CFG.CERTIFIER_UNIT} ขอรับรองว่าข้อความข้างต้นของผู้สมัครประเภทบุคคลภายนอก` +
    `${who ? ` ${who}` : ''} เป็นความจริง โดยผู้สมัครที่ข้าพเจ้านำมาสมัครนี้` +
    'ยินดีปฏิบัติตามระเบียบข้อบังคับของบริษัทฯ ทุกประการ และจะไม่เรียกร้องค่าเสียหายใด ๆ ' +
    'หากเกิดอันตรายหรือบาดเจ็บขณะอยู่ในบริเวณบ้านพักรับรองหรือศูนย์กีฬาของ ' + CFG.COMPANY_NAME;
  // ข้อ ๗ / ๙.๑ (everyone) and ข้อ ๘ / ๑๒ (outsiders)
  const CARD_NOTE = 'ผู้ใช้บริการต้องแสดงบัตรประจำตัวพนักงานหรือบัตรสมาชิกต่อเจ้าหน้าที่ทุกครั้งก่อนเข้าใช้บริการ ' +
    'และสมาชิกประเภท ๒ และ ๓ ต้องฝากบัตรสมาชิกไว้กับเจ้าหน้าที่';
  const usageNote = (hasOutsider) => CARD_NOTE + (hasOutsider ? ` · สมาชิกประเภท ๓ ${CFG.OUTSIDER_RULES}` : '');
  // สังกัด list: departments.js (window.APP_DEPARTMENTS, [code, name]) unless config.js sets DEPARTMENTS
  const DEPTS = ((CFG.DEPARTMENTS && CFG.DEPARTMENTS.length) ? CFG.DEPARTMENTS : (window.APP_DEPARTMENTS || []))
    .map((d) => (Array.isArray(d) ? { code: String(d[0] || '').trim(), name: String(d[1] || '').trim() } : { code: String(d || '').trim(), name: '' }))
    .filter((d) => d.code)
    .sort((a, b) => a.code.localeCompare(b.code, 'th'));
  const deptLabel = (d) => (d.name ? `${d.code} ${d.name}` : d.code);
  const matchKey = (s) => String(s || '').replace(/[\s.]/g, '').toLowerCase(); // "ศช.บภ 2." == "ศชบภ2"
  const DEPT_INDEX = new Map();
  DEPTS.forEach((d) => [d.code, d.name, deptLabel(d)].forEach((k) => { if (k) DEPT_INDEX.set(matchKey(k), deptLabel(d)); }));
  // Typing a code or a full name alone is expanded to the canonical "code name", so the registry groups cleanly.
  const canonicalDept = (v) => {
    const t = String(v || '').replace(/\s+/g, ' ').trim();
    return DEPT_INDEX.get(matchKey(t)) || t;
  };
  const isKnownDept = (v) => DEPT_INDEX.has(matchKey(v));

  // ตำแหน่ง list: positions.js (window.APP_POSITIONS) unless config.js sets POSITIONS
  const POSITIONS = ((CFG.POSITIONS && CFG.POSITIONS.length) ? CFG.POSITIONS : (window.APP_POSITIONS || []))
    .map((p) => String(p || '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, 'th'));
  const POS_INDEX = new Map(POSITIONS.map((p) => [matchKey(p), p]));
  const canonicalPosition = (v) => {
    const t = String(v || '').replace(/\s+/g, ' ').trim();
    return POS_INDEX.get(matchKey(t)) || t;
  };
  const isKnownPosition = (v) => POS_INDEX.has(matchKey(v));

  const KEY_STORE = 'mr-staff-key';
  const DEMO_STORE = 'mr-demo-db';

  // ------------------------------------------------------------------ utils
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const baht = (n) => Number(n || 0).toLocaleString('th-TH');
  const pad = (n) => String(n).padStart(2, '0');
  const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const parts = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? { y: +m[1], m: +m[2], d: +m[3] } : null; };
  const thLong = (iso) => { const p = parts(iso); return p ? `${p.d} ${TH_MONTHS[p.m - 1]} พ.ศ. ${p.y + 543}` : ''; };
  const thShort = (iso) => { const p = parts(iso); return p ? `${p.d}/${p.m}/${p.y + 543}` : ''; };
  const thMid = (iso) => { const p = parts(iso); return p ? `${p.d} ${TH_MONTHS_SHORT[p.m - 1]} ${p.y + 543}` : ''; };
  // ปีสมาชิก (พ.ศ.): with a ปีงบประมาณ (start month 10) a date in ต.ค.–ธ.ค. belongs to the next year — same rule as Code.gs
  const YEAR_START = Math.min(12, Math.max(1, Number(CFG.MEMBERSHIP_YEAR_START_MONTH) || 1));
  const memberYear = (iso) => { const p = parts(iso); return p ? p.y + 543 + (YEAR_START > 1 && p.m >= YEAR_START ? 1 : 0) : 0; };
  const curYearBE = () => memberYear(todayISO());
  const yearLabel = (y) => (YEAR_START === 1 ? `ปี ${y}` : `ปีงบ ${y}`);
  const yearEndISO = (yearBE) => { // last day of the membership year = card expiry (30 ก.ย. for ปีงบประมาณ)
    const y = yearBE - 543;
    const m = YEAR_START === 1 ? 12 : YEAR_START - 1;
    return `${y}-${pad(m)}-${pad(new Date(y, m, 0).getDate())}`;
  };
  const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();

  function store(kind) {
    try { return kind === 'session' ? window.sessionStorage : window.localStorage; } catch (e) { return null; }
  }
  const kv = {
    get(k, kind) { try { const s = store(kind); return s ? s.getItem(k) : null; } catch (e) { return null; } },
    set(k, v, kind) { try { const s = store(kind); if (s) s.setItem(k, v); } catch (e) { /* ignore */ } },
    del(k, kind) { try { const s = store(kind); if (s) s.removeItem(k); } catch (e) { /* ignore */ } },
  };

  let toastTimer;
  function toast(msg, isError) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.toggle('error', !!isError);
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 3500);
  }

  // ครอบครัวพนักงาน: card fee only · บุคคลภายนอก: card fee + membership fee (+ facility fee)
  function computeFees(members) {
    const count = members.length;
    const outsiderCount = members.filter(isOutsider).length;
    const newCount = members.filter((m) => m.membership === 'สมัครใหม่').length;
    const cardPeople = CFG.CARD_FEE_ON_RENEW ? count : newCount;
    const memberFee = outsiderCount * CFG.MEMBER_FEE;
    const cardFee = cardPeople * CFG.CARD_FEE;
    const facilityFee = outsiderCount * CFG.FACILITY_FEE;
    return {
      count, familyCount: count - outsiderCount, outsiderCount, newCount, renewCount: count - newCount, cardPeople,
      memberFee, cardFee, facilityFee, total: memberFee + cardFee + facilityFee,
    };
  }

  // The form has MAX_MEMBERS rows: ครอบครัว first, then MAX_OUTSIDERS rows for บุคคลภายนอก (ข้อ ๖.๓).
  const FAMILY_ROWS = Math.max(0, CFG.MAX_MEMBERS - CFG.MAX_OUTSIDERS);

  // Same limits as Code.gs (the server also counts outsiders across all applications of the year).
  function countRuleErrors(familyCount, outsiderCount) {
    const errs = [];
    if (outsiderCount > CFG.MAX_OUTSIDERS) errs.push(`พนักงาน 1 ท่านรับรองบุคคลภายนอกได้สูงสุด ${CFG.MAX_OUTSIDERS} คน`);
    if (familyCount > FAMILY_ROWS) errs.push(`ครอบครัวพนักงานกรอกได้สูงสุด ${FAMILY_ROWS} คนต่อใบสมัคร`);
    return errs;
  }

  // Row numbers on the form: ครอบครัว 1..FAMILY_ROWS, บุคคลภายนอก FAMILY_ROWS+1.. (kept in input order)
  function formRows(list) {
    let fam = 0;
    let out = 0;
    return list.map((m) => (isOutsider(m) ? FAMILY_ROWS + (++out) : ++fam));
  }

  // ------------------------------------------------------------------ API
  async function call(action, payload) {
    let res;
    try {
      // text/plain body = "simple" request, so Apps Script needs no CORS preflight
      res = await fetch(CFG.API_URL, { method: 'POST', body: JSON.stringify(Object.assign({ action }, payload || {})) });
    } catch (e) {
      throw new Error('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่');
    }
    let data;
    try { data = await res.json(); } catch (e) {
      throw new Error('เซิร์ฟเวอร์ตอบกลับไม่ถูกต้อง (ตรวจสอบ API_URL และการ deploy)');
    }
    if (!data.ok) {
      const err = new Error(data.error || 'เกิดข้อผิดพลาด');
      err.code = data.code;
      throw err;
    }
    return data;
  }

  // Demo backend: same shapes as Code.gs, stored in this browser only.
  const demo = (() => {
    let mem = null;
    const empty = () => ({ applications: [], members: [], seq: {}, photos: {} });
    const load = () => {
      if (mem) return mem;
      try { mem = JSON.parse(kv.get(DEMO_STORE)) || empty(); } catch (e) { mem = empty(); }
      mem.photos = mem.photos || {};
      return mem;
    };
    const save = (db) => {
      mem = db;
      try { window.localStorage.setItem(DEMO_STORE, JSON.stringify(db)); } catch (e) {
        throw new Error('พื้นที่เก็บข้อมูลของเบราว์เซอร์เต็ม (โหมดทดลองเก็บรูปไว้ในเบราว์เซอร์)');
      }
    };
    return {
      submit(input) {
        const db = load();
        const yearBE = memberYear(input.formDate);
        const key = (s) => String(s || '').replace(/\s+/g, '').toLowerCase();
        const blank = (v) => v === undefined || v === null || String(v).trim() === '';
        // ต่ออายุ via lookup (same as Code.gs): re-check the pair, blanks keep the stored values
        const d = Object.assign({}, input, { members: input.members.map((m, i) => {
          if (!m.renewOf) return m;
          const oldApp = db.applications.find((a) => a.app_id === m.renewOf.appId && key(a.applicant_name) === key(input.applicantName));
          if (!oldApp) { const err = new Error(`ใบสมัครเดิมเลขที่ ${m.renewOf.appId} ไม่ตรงกับชื่อผู้ยื่น`); err.code = 404; throw err; }
          const old = db.members.find((r) => r.app_id === m.renewOf.appId && Number(r.seq) === Number(m.renewOf.seq));
          if (!old) throw new Error(`ไม่พบสมาชิกคนที่ ${i + 1} ในใบสมัครเดิม ${m.renewOf.appId}`);
          const years = Math.max(0, yearBE - Number(oldApp.year_be));
          return Object.assign({}, m, {
            age: blank(m.age) ? Number(old.age) + years : m.age,
            address: blank(m.address) ? old.address : m.address,
            relationship: blank(m.relationship) ? old.relationship : m.relationship,
            memberType: blank(m.memberType) ? old.member_type : m.memberType,
            kept: old.photo_id ? old : null,
          });
        }) });
        const outs = d.members.filter(isOutsider);
        const ruleErrs = countRuleErrors(d.members.length - outs.length, outs.length);
        if (ruleErrs.length) throw new Error(ruleErrs[0]);
        if (outs.length) {
          const already = new Set(db.members.filter((r) => r.member_type === OUTSIDER && r.year_be === yearBE &&
            key(r.applicant_name) === key(d.applicantName)).map((r) => key(r.full_name)));
          const total = new Set([...already, ...outs.map((m) => key(m.fullName))]);
          if (total.size > CFG.MAX_OUTSIDERS) {
            throw new Error(`พนักงาน 1 ท่านรับรองบุคคลภายนอกได้สูงสุด ${CFG.MAX_OUTSIDERS} คนต่อปี — ${yearLabel(yearBE)} ` +
              `ท่านรับรองไปแล้ว ${already.size} คน (รับรองเพิ่มได้อีก ${Math.max(0, CFG.MAX_OUTSIDERS - already.size)} คน)`);
          }
        }
        db.seq[yearBE] = (db.seq[yearBE] || 0) + 1;
        const appId = `${yearBE}-${String(db.seq[yearBE]).padStart(4, '0')}`;
        const f = computeFees(d.members);
        const createdAt = new Date().toISOString();
        const reused = d.members.map((m) => (m.photo ? null : m.kept || (m.membership !== 'ต่ออายุ' ? null
          : db.members.slice().reverse().find((r) => r.photo_id && key(r.full_name) === key(m.fullName) &&
            key(r.applicant_name) === key(d.applicantName)) || null)));
        const application = {
          app_id: appId, year_be: yearBE, form_date: d.formDate, applicant_name: d.applicantName,
          applicant_type: d.applicantType, department: d.department, position: d.position, purpose: d.purpose,
          member_count: f.count, family_count: f.familyCount, outsider_count: f.outsiderCount,
          new_count: f.newCount, renew_count: f.renewCount,
          photo_count: d.members.filter((m, i) => m.photo || reused[i]).length,
          member_fee: f.memberFee, card_fee: f.cardFee, facility_fee: f.facilityFee,
          total_fee: f.total, renewed_from: d.renewedFrom || '', created_at: createdAt,
        };
        const rowNo = formRows(d.members);
        const members = d.members.map((m, i) => ({
          app_id: appId, seq: rowNo[i], full_name: m.fullName, age: m.age, address: m.address,
          relationship: m.relationship, member_type: m.memberType, membership: m.membership, year_be: yearBE,
          applicant_name: d.applicantName, department: d.department, created_at: createdAt,
          photo_id: m.photo ? `demo:${appId}|${rowNo[i]}` : (reused[i] ? reused[i].photo_id : ''),
          photo_thumb: m.photo ? m.thumb : (reused[i] ? reused[i].photo_thumb : ''),
        }));
        d.members.forEach((m, i) => { if (m.photo) db.photos[`${appId}|${rowNo[i]}`] = m.photo; });
        db.applications.push(application);
        db.members.push(...members);
        save(db);
        return { ok: true, appId, application, members: members.map((m) => Object.assign({}, m, { photo_thumb: undefined })) };
      },
      list() {
        const db = load();
        return { ok: true, applications: db.applications.slice(), members: db.members.slice() };
      },
      photos(list) {
        const db = load();
        const out = {};
        list.forEach((x) => {
          const k = `${x.appId}|${x.seq}`;
          const row = db.members.find((r) => `${r.app_id}|${r.seq}` === k);
          const p = row && row.photo_id ? db.photos[String(row.photo_id).replace(/^demo:/, '')] : '';
          if (p) out[k] = p;
        });
        return { ok: true, photos: out };
      },
      renewLookup(appId, name) {
        const db = load();
        const key = (v) => String(v || '').replace(/\s+/g, '').toLowerCase();
        const app = db.applications.find((a) => a.app_id === appId && key(a.applicant_name) === key(name));
        if (!app) {
          const err = new Error(`ไม่พบใบสมัครเลขที่ ${appId} ของ ${name} — ตรวจสอบชื่อและเลขที่ หรือติดต่อเจ้าหน้าที่`);
          err.code = 404;
          throw err;
        }
        const onFile = (m) => !!m.photo_id || db.members.some((r) => r.photo_id && key(r.full_name) === key(m.full_name) &&
          key(r.applicant_name) === key(app.applicant_name));
        const members = db.members.filter((m) => m.app_id === appId).sort((a, b) => a.seq - b.seq).map((m) => ({
          seq: m.seq, full_name: m.full_name, member_type: m.member_type, has_photo: onFile(m),
        }));
        const { app_id, year_be, applicant_name, department, position } = app;
        return { ok: true, application: { app_id, year_be, applicant_name, department, position }, members };
      },
      setPhoto(d) {
        const db = load();
        const k = `${d.appId}|${d.seq}`;
        const row = db.members.find((r) => `${r.app_id}|${r.seq}` === k);
        if (!row) throw new Error('ไม่พบสมาชิก');
        db.photos[k] = d.photo;
        row.photo_id = `demo:${k}`;
        row.photo_thumb = d.thumb;
        save(db);
        return { ok: true, photo_id: row.photo_id, photo_thumb: row.photo_thumb };
      },
    };
  })();

  // Demo calls run synchronously but still reject like the server does.
  const demoCall = (fn) => new Promise((resolve) => resolve(fn()));
  const api = {
    submit: (data) => (DEMO ? demoCall(() => demo.submit(data)) : call('submit', { data })),
    list: (key) => (DEMO ? demoCall(() => demo.list()) : call('list', { key })),
    photos: (key, members) => (DEMO ? demoCall(() => demo.photos(members)) : call('photos', { key, members })),
    setPhoto: (key, d) => (DEMO ? demoCall(() => demo.setPhoto(d)) : call('setPhoto', Object.assign({ key }, d))),
    renewLookup: (appId, applicantName) => (DEMO ? demoCall(() => demo.renewLookup(appId, applicantName))
      : call('renewLookup', { appId, applicantName })),
  };

  // ------------------------------------------------------------------ photos
  // Every photo goes through a square crop editor in the browser (drag to place the face, zoom, rotate), then a
  // card-size JPEG and a small thumbnail for the registry are made from it. Only those are uploaded.
  const PHOTO_PX = 600;          // square output → Drive
  const THUMB_PX = 128;          // square thumbnail → Members sheet
  const SOURCE_MAX = 2000;       // the original is shrunk to this (longest side) to keep memory low on phones
  const MAX_ZOOM = 4;
  const PERSON_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="9" r="4" fill="currentColor"/>' +
    '<path d="M4 21c.8-4 4-6.2 8-6.2s7.2 2.2 8 6.2" fill="currentColor"/></svg>';

  function loadImage(src) {
    const viaImg = () => new Promise((resolve, reject) => {
      const url = URL.createObjectURL(src);
      const img = new Image();
      img.onload = () => { resolve(img); setTimeout(() => URL.revokeObjectURL(url), 0); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode')); };
      img.src = url;
    });
    if (!window.createImageBitmap) return viaImg();
    return createImageBitmap(src, { imageOrientation: 'from-image' }).catch(viaImg);
  }

  // Decode the chosen file once and keep a moderate-size copy (canvas) to edit — and to re-edit later in the form.
  async function loadSource(file) {
    if (!file) throw new Error('ไม่ได้เลือกไฟล์');
    if (file.type && !/^image\//.test(file.type)) throw new Error('กรุณาเลือกไฟล์รูปภาพ');
    if (file.size > 30 * 1024 * 1024) throw new Error('ไฟล์รูปใหญ่เกินไป (เกิน 30 MB)');
    let img;
    try { img = await loadImage(file); } catch (e) {
      throw new Error('เปิดไฟล์รูปนี้ไม่ได้ ลองใช้ไฟล์ JPG หรือ PNG');
    }
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    const k = Math.min(1, SOURCE_MAX / Math.max(w, h));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w * k));
    c.height = Math.max(1, Math.round(h * k));
    const g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, 0, 0, c.width, c.height);
    if (img.close) img.close();
    return c;
  }

  // ---- crop editor --------------------------------------------------------------------------------------------
  // View state in output units (frame = PHOTO_PX square): rot (0..3 × 90°), zoom (1 = image just covers the frame),
  // x/y = top-left of the drawn (rotated, scaled) image. The image always covers the frame.
  const editor = { src: null, rot: 0, zoom: 1, x: 0, y: 0, resolve: null, pointers: new Map(), pinch: null };

  const rotSize = (st) => (st.rot % 2 ? [st.src.height, st.src.width] : [st.src.width, st.src.height]);
  const coverScale = (st) => PHOTO_PX / Math.min(...rotSize(st));

  function clampView(st) {
    st.zoom = Math.min(MAX_ZOOM, Math.max(1, st.zoom));
    const s = coverScale(st) * st.zoom;
    const [w, h] = rotSize(st);
    st.x = Math.min(0, Math.max(PHOTO_PX - w * s, st.x));
    st.y = Math.min(0, Math.max(PHOTO_PX - h * s, st.y));
  }

  function initialView(st) { // centred across, head-room kept for tall shots
    st.zoom = 1;
    const s = coverScale(st);
    const [w, h] = rotSize(st);
    st.x = (PHOTO_PX - w * s) / 2;
    st.y = (PHOTO_PX - h * s) * 0.3;
  }

  function zoomAt(st, factor, fx, fy) { // keep the frame point (fx, fy) still
    const before = st.zoom;
    st.zoom = Math.min(MAX_ZOOM, Math.max(1, st.zoom * factor));
    const k = st.zoom / before;
    st.x = fx - (fx - st.x) * k;
    st.y = fy - (fy - st.y) * k;
    clampView(st);
  }

  function drawView(ctx, st, size) {
    const k = size / PHOTO_PX;
    const s = coverScale(st) * st.zoom;
    const [w, h] = rotSize(st);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, size, size);
    ctx.imageSmoothingQuality = 'high';
    ctx.setTransform(k, 0, 0, k, (st.x + (w * s) / 2) * k, (st.y + (h * s) / 2) * k);
    ctx.rotate((st.rot * Math.PI) / 2);
    ctx.drawImage(st.src, (-st.src.width * s) / 2, (-st.src.height * s) / 2, st.src.width * s, st.src.height * s);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  function paintEditor() {
    const cv = $('#pe-canvas');
    const px = Math.round(cv.getBoundingClientRect().width * (window.devicePixelRatio || 1)) || PHOTO_PX;
    if (cv.width !== px) { cv.width = px; cv.height = px; }
    drawView(cv.getContext('2d'), editor, px);
    const pv = $('#pe-preview');
    const ppx = Math.round(pv.getBoundingClientRect().width * (window.devicePixelRatio || 1)) || 200;
    if (pv.width !== ppx) { pv.width = ppx; pv.height = ppx; }
    drawView(pv.getContext('2d'), editor, ppx);
    $('#pe-zoom').value = String(editor.zoom);
  }

  // `type` = member type, so the size preview shows the card's frame colour
  function openEditor(src, view, type) {
    Object.assign(editor, { src, rot: 0, pointers: new Map(), pinch: null });
    $('#pe-preview-box').classList.toggle('t-out', type === OUTSIDER);
    if (view) Object.assign(editor, view); else initialView(editor);
    clampView(editor);
    const modal = $('#photo-editor');
    modal.hidden = false;
    document.body.classList.add('modal-open');
    requestAnimationFrame(paintEditor);
    $('#pe-stage').focus({ preventScroll: true });
    return new Promise((resolve) => { editor.resolve = resolve; });
  }

  function closeEditor(result) {
    $('#photo-editor').hidden = true;
    document.body.classList.remove('modal-open');
    const done = editor.resolve;
    editor.resolve = null;
    if (done) done(result);
  }

  function editorResult() {
    const out = document.createElement('canvas');
    out.width = PHOTO_PX;
    out.height = PHOTO_PX;
    drawView(out.getContext('2d'), editor, PHOTO_PX);
    const t = document.createElement('canvas');
    t.width = THUMB_PX;
    t.height = THUMB_PX;
    const g = t.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(out, 0, 0, THUMB_PX, THUMB_PX);
    return {
      photo: out.toDataURL('image/jpeg', 0.88),
      thumb: t.toDataURL('image/jpeg', 0.8),
      source: editor.src,
      view: { rot: editor.rot, zoom: editor.zoom, x: editor.x, y: editor.y },
    };
  }

  function stageToFrame(clientX, clientY) {
    const r = $('#pe-stage').getBoundingClientRect();
    return [((clientX - r.left) / r.width) * PHOTO_PX, ((clientY - r.top) / r.height) * PHOTO_PX];
  }

  function wireEditor() {
    const stage = $('#pe-stage');
    const unit = () => PHOTO_PX / stage.getBoundingClientRect().width;
    stage.addEventListener('pointerdown', (e) => {
      stage.setPointerCapture(e.pointerId);
      editor.pointers.set(e.pointerId, [e.clientX, e.clientY]);
      stage.classList.add('dragging');
      if (editor.pointers.size === 2) {
        const [a, b] = [...editor.pointers.values()];
        editor.pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), mid: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] };
      }
    });
    stage.addEventListener('pointermove', (e) => {
      if (!editor.pointers.has(e.pointerId)) return;
      const prev = editor.pointers.get(e.pointerId);
      editor.pointers.set(e.pointerId, [e.clientX, e.clientY]);
      if (editor.pointers.size === 1) {
        editor.x += (e.clientX - prev[0]) * unit();
        editor.y += (e.clientY - prev[1]) * unit();
        clampView(editor);
      } else if (editor.pointers.size === 2 && editor.pinch) {
        const [a, b] = [...editor.pointers.values()];
        const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        editor.x += (mid[0] - editor.pinch.mid[0]) * unit();
        editor.y += (mid[1] - editor.pinch.mid[1]) * unit();
        const [fx, fy] = stageToFrame(mid[0], mid[1]);
        zoomAt(editor, d / editor.pinch.d, fx, fy);
        editor.pinch = { d, mid };
      }
      paintEditor();
    });
    const up = (e) => {
      editor.pointers.delete(e.pointerId);
      if (editor.pointers.size < 2) editor.pinch = null;
      if (!editor.pointers.size) stage.classList.remove('dragging');
    };
    stage.addEventListener('pointerup', up);
    stage.addEventListener('pointercancel', up);
    stage.addEventListener('wheel', (e) => {
      e.preventDefault();
      const [fx, fy] = stageToFrame(e.clientX, e.clientY);
      zoomAt(editor, Math.exp(-e.deltaY * 0.0015), fx, fy);
      paintEditor();
    }, { passive: false });
    stage.addEventListener('keydown', (e) => {
      const step = e.shiftKey ? 40 : 10;
      const moves = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
      if (moves[e.key]) {
        editor.x += moves[e.key][0];
        editor.y += moves[e.key][1];
        clampView(editor);
      } else if (e.key === '+' || e.key === '=') zoomAt(editor, 1.1, PHOTO_PX / 2, PHOTO_PX / 2);
      else if (e.key === '-') zoomAt(editor, 1 / 1.1, PHOTO_PX / 2, PHOTO_PX / 2);
      else return;
      e.preventDefault();
      paintEditor();
    });
    $('#pe-zoom').addEventListener('input', (e) => {
      zoomAt(editor, Number(e.target.value) / editor.zoom, PHOTO_PX / 2, PHOTO_PX / 2);
      paintEditor();
    });
    $('#pe-zoom-in').addEventListener('click', () => { zoomAt(editor, 1.2, PHOTO_PX / 2, PHOTO_PX / 2); paintEditor(); });
    $('#pe-zoom-out').addEventListener('click', () => { zoomAt(editor, 1 / 1.2, PHOTO_PX / 2, PHOTO_PX / 2); paintEditor(); });
    $('#pe-rotate').addEventListener('click', () => {
      editor.rot = (editor.rot + 1) % 4;
      initialView(editor);
      paintEditor();
    });
    $('#pe-reset').addEventListener('click', () => { initialView(editor); paintEditor(); });
    $('#pe-cancel').addEventListener('click', () => closeEditor(null));
    $('#pe-ok').addEventListener('click', () => closeEditor(editorResult()));
    $('#photo-editor').addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeEditor(null);
      else if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') { e.preventDefault(); closeEditor(editorResult()); }
    });
    window.addEventListener('resize', () => { if (!$('#photo-editor').hidden) paintEditor(); });
  }

  // One hidden <input type=file> serves the form and the registry; `onPicked` says where the photo goes.
  let onPicked = null;
  function pickPhoto(handler, type) {
    onPicked = { handler, type };
    const input = $('#photo-input');
    input.value = '';
    input.click();
  }
  async function onPhotoChosen(e) {
    const file = e.target.files && e.target.files[0];
    const pick = onPicked;
    onPicked = null;
    if (!file || !pick) return;
    try {
      const result = await openEditor(await loadSource(file), null, pick.type);
      if (result) await pick.handler(result);
    } catch (err) {
      toast(err.message || 'ใช้รูปนี้ไม่ได้', true);
    }
  }

  // ------------------------------------------------------------------ views
  function switchView(name) {
    $$('.tab').forEach((t) => {
      const on = t.dataset.view === name;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', String(on));
    });
    $('#view-form').hidden = name !== 'form';
    $('#view-registry').hidden = name !== 'registry';
    if (history.replaceState) history.replaceState(null, '', name === 'registry' ? '#registry' : location.pathname + location.search);
    if (name === 'registry') openRegistry();
  }

  // ================================================================== PICKER (สังกัด / ตำแหน่ง)
  // Small searchable dropdown. Native <datalist> is clumsy on iPhone, so we draw our own list.
  function attachPicker(input, items, limit) {
    const max = limit || 8;
    const id = `${input.name}-picker`;
    const wrap = document.createElement('div');
    wrap.className = 'picker-wrap';
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);
    const list = document.createElement('ul');
    list.id = id;
    list.className = 'picker';
    list.setAttribute('role', 'listbox');
    list.hidden = true;
    wrap.appendChild(list);
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-controls', id);
    input.setAttribute('aria-expanded', 'false');
    let matches = [];
    let active = -1;

    const close = () => {
      list.hidden = true;
      active = -1;
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
    };
    const search = () => {
      const q = matchKey(input.value);
      if (!q) { close(); return; }
      const found = items.filter((it) => it.key.includes(q));
      found.sort((x, y) => Number(y.key.startsWith(q)) - Number(x.key.startsWith(q))); // prefix matches first
      matches = found.slice(0, max);
      list.innerHTML = matches.length
        ? matches.map((it, k) => `<li id="${id}-${k}" role="option" data-k="${k}">${it.html}</li>`).join('') +
          (found.length > max ? `<li class="picker-note">พบ ${found.length} รายการ — พิมพ์เพิ่มเพื่อกรอง</li>` : '')
        : '<li class="picker-note">ไม่พบในรายการ — พิมพ์เองได้</li>';
      active = -1;
      list.hidden = false;
      input.setAttribute('aria-expanded', 'true');
    };
    const pick = (k) => {
      const it = matches[k];
      if (!it) return;
      input.value = it.value;
      close();
      input.dispatchEvent(new Event('change', { bubbles: true }));
    };
    const move = (step) => {
      if (list.hidden || !matches.length) return;
      active = (active + step + matches.length) % matches.length;
      $$('[role=option]', list).forEach((li, k) => li.classList.toggle('active', k === active));
      input.setAttribute('aria-activedescendant', `${id}-${active}`);
      list.querySelector(`#${CSS.escape(id)}-${active}`).scrollIntoView({ block: 'nearest' });
    };

    input.addEventListener('input', search);
    input.addEventListener('focus', () => {
      if (input.value) search();
      // On phones, lift the field to the top so the list isn't hidden behind the keyboard.
      if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) {
        setTimeout(() => (input.closest('.field') || input).scrollIntoView({ block: 'start', behavior: 'smooth' }), 300);
      }
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); if (list.hidden) search(); move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      else if (e.key === 'Enter' && !list.hidden && active >= 0) { e.preventDefault(); pick(active); }
      else if (e.key === 'Escape') close();
    });
    input.addEventListener('blur', () => setTimeout(close, 150));
    list.addEventListener('pointerdown', (e) => e.preventDefault()); // keep focus (and the keyboard) on the input
    list.addEventListener('click', (e) => {
      e.preventDefault();
      const li = e.target.closest('[role=option]');
      if (li) pick(Number(li.dataset.k));
    });
  }

  // ================================================================== FORM
  const form = $('#app-form');
  let state;
  let lastSaved = null;

  const blankMember = (membership) => ({
    fullName: '', age: '', address: '', relationship: '', memberType: '', membership: membership || 'สมัครใหม่',
  });

  function radios(name, options, selected) {
    return options.map(([value, label]) =>
      `<label><input type="radio" name="${name}" value="${esc(value)}"${value === selected ? ' checked' : ''}><span>${esc(label)}</span></label>`).join('');
  }

  // `full` = {type: message} for a type whose rows are used up by the other members (ข้อ ๖.๓: บุคคลภายนอก ≤ 3)
  function typeCards(name, selected, full) {
    return MEMBER_TYPE_CARDS.map(([value, title, sub]) => {
      const off = full[value] && value !== selected;
      return `<label${off ? ' class="is-full"' : ''}><input type="radio" name="${name}" value="${esc(value)}"` +
        `${value === selected ? ' checked' : ''}${off ? ' disabled' : ''}>` +
        `<span class="opt-text"><span class="opt-title">${esc(title)}${off ? ` <span class="full-tag">${esc(full[value])}</span>` : ''}</span>` +
        `<span class="opt-sub">${esc(sub)}</span></span></label>`;
    }).join('');
  }

  // Which member types the i-th member can still take, given the others
  function typeLimits(i) {
    const others = state.members.filter((_, k) => k !== i);
    const out = others.filter(isOutsider).length;
    const fam = others.filter((m) => m.memberType === FAMILY).length;
    return {
      [OUTSIDER]: out >= CFG.MAX_OUTSIDERS ? `ครบ ${CFG.MAX_OUTSIDERS} คนแล้ว` : '',
      [FAMILY]: fam >= FAMILY_ROWS ? `ครบ ${FAMILY_ROWS} คนแล้ว` : '',
    };
  }

  // "ใช้ที่อยู่เดียวกับ คนที่ 1 · คนที่ 2" — only members who already have an address (and a different one)
  function addrCopyHtml(i) {
    const mine = norm(state.members[i].address);
    const seen = new Set([mine]);
    const opts = [];
    state.members.forEach((m, k) => {
      const a = norm(m.address);
      if (k === i || !a || seen.has(a)) return;
      seen.add(a);
      const first = String(m.fullName || '').trim().split(/\s+/).filter((w) => !/\.$/.test(w))[0] || '';
      opts.push(`<button type="button" class="chip-btn" data-act="copy-address" data-from="${k}">คนที่ ${k + 1}${first ? ` ${esc(first)}` : ''}</button>`);
    });
    return opts.length ? `<span class="addr-copy-label">ใช้ที่อยู่เดียวกับ</span>${opts.join('')}` : '';
  }
  function refreshAddrCopy() {
    $$('#members .member').forEach((card) => { card.querySelector('.addr-copy').innerHTML = addrCopyHtml(Number(card.dataset.i)); });
  }

  function buildStatic() {
    $('#form-intro').textContent = `กรอกข้อมูลผู้ยื่นและผู้เป็นสมาชิกได้สูงสุด ${CFG.MAX_MEMBERS} คนต่อใบ — ` +
      `ครอบครัวพนักงาน (ประเภท ๒) ไม่เกิน ${FAMILY_ROWS} คน และบุคคลภายนอก (ประเภท ๓) ไม่เกิน ${CFG.MAX_OUTSIDERS} คน ` +
      'บันทึกแล้วพิมพ์ใบสมัครเพื่อลงลายมือชื่อ';
    $('#purpose').innerHTML = radios('purpose', PURPOSES, 'สมัครใหม่');
    attachPicker(form.department, DEPTS.map((d) => ({
      value: deptLabel(d), key: matchKey(deptLabel(d)),
      html: `<b>${esc(d.code)}</b> ${esc(d.name)}`,
    })));
    attachPicker(form.position, POSITIONS.map((p) => ({ value: p, key: matchKey(p), html: esc(p) })));
    $('#member-rules').innerHTML = `
      <p>พนักงาน ลูกจ้าง และพนักงานเกษียณอายุ (ประเภท ๑) เป็นสมาชิกโดยสถานภาพ <b>ไม่ต้องใส่ชื่อตนเอง</b></p>
      <p>ประเภท ๒ และ ๓ ต้องทำบัตรสมาชิก และแสดง/ฝากบัตรกับเจ้าหน้าที่ทุกครั้งก่อนเข้าใช้บริการ</p>
      <p>บุคคลภายนอก (ประเภท ๓) ต้องมีพนักงาน${esc(CFG.CERTIFIER_UNIT)}เป็นผู้รับรอง ` +
      `สูงสุด ${CFG.MAX_OUTSIDERS} คนต่อพนักงาน 1 ท่าน · ${esc(CFG.OUTSIDER_RULES)}</p>
      <p class="rules-ref">อ้างอิง ${esc(CFG.RULE_REF)}</p>`;
  }

  function resetForm() {
    form.reset();
    state = { members: [blankMember()], renewedFrom: '' };
    form.formDate.value = todayISO();
    form.querySelector('input[name=purpose][value="สมัครใหม่"]').checked = true;
    $('#renew-note').hidden = true;
    $('#form-error').hidden = true;
    $$('.invalid', form).forEach((el) => el.classList.remove('invalid'));
    $('#renew-app').value = '';
    delete $('#renew-hint').dataset.sticky;
    updateRenewLookup();
    renderMembers();
    updateDateHint();
    updateDeptHint();
    updatePosHint();
  }

  function renderMembers() {
    const max = CFG.MAX_MEMBERS;
    $('#members').innerHTML = state.members.map((m, i) => `
      <div class="member${isOutsider(m) ? ' is-outsider' : ''}" data-i="${i}">
        <div class="member-head">
          <span class="member-no">${i + 1}</span>
          <span class="member-label">สมาชิกคนที่ ${i + 1}</span>
          <div class="member-tools">
            ${state.members.length > 1 ? `<button type="button" class="icon-btn" data-act="remove" aria-label="ลบสมาชิกลำดับที่ ${i + 1}">&times;</button>` : ''}
          </div>
        </div>
        ${m.carry ? `<p class="carry-note">ข้อมูลจากใบสมัครเดิม ${esc(m.carry.appId)} — ช่องที่เว้นว่างจะใช้ข้อมูลเดิมที่เก็บไว้ในระบบ
          (อายุปรับเพิ่มตามปีให้เอง) กรอกเฉพาะช่องที่ต้องการเปลี่ยน เช่นเดียวกับรูปถ่าย</p>` : ''}
        <div class="grid">
          <fieldset class="field span-3"><legend class="label">ประเภทสมาชิก</legend>
            <div class="seg cards" data-k="memberType">${typeCards(`mtype-${i}`, m.memberType, typeLimits(i))}</div>
          </fieldset>
          <label class="field span-2"><span class="label">ชื่อ - สกุล</span>
            <input data-k="fullName" value="${esc(m.fullName)}" maxlength="150" required></label>
          <label class="field"><span class="label">อายุ (ปี)</span>
            <input data-k="age" type="number" min="0" max="120" inputmode="numeric" value="${esc(m.age)}"${m.carry ? ' placeholder="ใช้ข้อมูลเดิม"' : ' required'}></label>
          <label class="field span-3"><span class="label">สถานที่อยู่อาศัย / ทำงานในปัจจุบัน (ที่สามารถติดต่อได้)</span>
            <textarea data-k="address" rows="2" maxlength="400"${m.carry ? ' placeholder="เว้นว่าง = ใช้ที่อยู่เดิมในระบบ"' : ' required'}>${esc(m.address)}</textarea></label>
          <div class="addr-copy span-3">${addrCopyHtml(i)}</div>
          <fieldset class="field span-3"><legend class="label">ฐานะที่เกี่ยวข้องกับผู้ยื่น${m.carry ? ' <span class="opt-note">(ไม่เลือก = ใช้ข้อมูลเดิม)</span>' : ''}</legend>
            <div class="seg small chips" data-k="relationship">${radios(`rel-${i}`,
              relOptions(m).map((v) => [v, v]).concat([[REL_OTHER, 'อื่น ๆ']]), relChoice(m))}</div>
            <input data-k="relationshipOther" class="rel-other" placeholder="ระบุฐานะที่เกี่ยวข้อง" maxlength="150"
              value="${relChoice(m) === REL_OTHER ? esc(m.relationship) : ''}"${relChoice(m) === REL_OTHER ? '' : ' hidden'}>
          </fieldset>
          <fieldset class="field span-3"><legend class="label">สมาชิกภาพ</legend>
            <div class="seg small" data-k="membership">${radios(`membership-${i}`, MEMBERSHIP.map((v) => [v, v]), m.membership)}</div>
          </fieldset>
          ${photoField(m, i)}
        </div>
      </div>`).join('');
    $('#add-member').hidden = state.members.length >= max;
    updateCountsAndFees();
  }

  // สมัครใหม่: photo required (used for the member card) · ต่ออายุ: last year's photo is reused, a new one is optional
  function photoField(m, i) {
    const renew = m.membership === 'ต่ออายุ';
    const prev = renew && !m.photo ? (m.prevThumb || '') : '';   // last year's photo (staff view), kept by the server
    const kept = renew && !m.photo && m.carry && m.hasPhoto;     // public lookup: the photo stays hidden
    const shown = m.thumb || prev;
    let label;
    if (!renew) label = 'รูปถ่ายหน้าตรง <span class="req-note">(ต้องแนบสำหรับสมัครใหม่)</span>';
    else if (prev || kept) label = 'รูปถ่าย <span class="opt-note">— มีรูปเดิมในระบบแล้ว ไม่ต้องแนบ</span>';
    else if (m.carry) label = 'รูปถ่าย <span class="opt-note">— ยังไม่มีรูปในระบบ แนบได้เลย (ไม่บังคับ)</span>';
    else label = 'รูปถ่าย <span class="opt-note">— ต่ออายุใช้รูปเดิมในระบบ ไม่ต้องแนบ</span>';
    const hint = renew
      ? 'แนบใหม่เฉพาะเมื่อต้องการเปลี่ยนรูปบนบัตร'
      : 'หน้าตรง ไม่สวมหมวก เห็นใบหน้าชัด ถ่ายจากมือถือได้ · เลือกแล้วลากจัดใบหน้าให้อยู่กลางกรอบสี่เหลี่ยม';
    return `<div class="field span-3 photo-field${renew && !shown ? ' is-renew' : ''}"><span class="label">${label}</span>
      <div class="photo-row">
        <button type="button" class="photo-box${shown ? ' has-photo' : ''}" data-act="photo"
          aria-label="${shown ? 'เปลี่ยนรูปถ่าย' : 'เลือกรูปถ่าย'}สมาชิกคนที่ ${i + 1}">${shown ? `<img src="${esc(shown)}" alt="">` : PERSON_ICON}${prev ? '<span class="photo-tag">รูปเดิม</span>' : ''}${kept ? '<span class="photo-tag">มีรูปในระบบ</span>' : ''}</button>
        <div class="photo-actions">
          <button type="button" class="btn btn-ghost btn-sm" data-act="photo">${m.photo ? 'เปลี่ยนรูป' : (renew ? 'แนบรูปใหม่' : 'เลือกรูป / ถ่ายรูป')}</button>
          ${m.photo && m.source ? '<button type="button" class="btn btn-ghost btn-sm" data-act="photo-adjust">ปรับตำแหน่ง</button>' : ''}
          ${m.photo ? '<button type="button" class="link-btn" data-act="photo-remove">ลบรูป</button>' : ''}
          <small class="hint">${hint}</small>
        </div>
      </div>
    </div>`;
  }

  function setListHint(input, hint, hasList, isKnown, emptyMsg, unknownMsg) {
    const v = input.value.trim();
    if (!hasList) { hint.textContent = ''; return; }
    const unknown = !!v && !isKnown(v);
    hint.textContent = !v ? emptyMsg : (unknown ? unknownMsg : '');
    hint.classList.toggle('warn', unknown);
  }
  const updateDeptHint = () => setListHint(form.department, $('#dept-hint'), DEPTS.length, isKnownDept,
    'พิมพ์รหัสหรือชื่อหน่วยงาน แล้วเลือกจากรายการ', 'ไม่พบในรายการหน่วยงาน — ตรวจสอบการสะกด (ยังบันทึกได้)');
  const updatePosHint = () => setListHint(form.position, $('#pos-hint'), POSITIONS.length, isKnownPosition,
    'พิมพ์บางส่วนของชื่อตำแหน่ง แล้วเลือกจากรายการ', 'ไม่พบในรายการตำแหน่ง — ตรวจสอบการสะกด (ยังบันทึกได้)');

  function updateDateHint() {
    $('#date-th').textContent = thLong(form.formDate.value);
  }

  function updateCountsAndFees() {
    const n = state.members.length;
    const f = computeFees(state.members);
    $('#fees').innerHTML = `
      <tr><td>ค่าจัดทำบัตรสมาชิก <span class="calc">${CFG.CARD_FEE} บาท/คน/ปี × ${f.cardPeople} คน${CFG.CARD_FEE_ON_RENEW ? '' : ' (เฉพาะสมัครใหม่)'}</span></td><td>${baht(f.cardFee)} บาท</td></tr>
      <tr><td>เงินค่าสมาชิก <span class="calc">${CFG.MEMBER_FEE} บาท/คน/ปี × ${f.outsiderCount} คน (เฉพาะบุคคลภายนอก)</span></td><td>${baht(f.memberFee)} บาท</td></tr>
      ${CFG.FACILITY_FEE ? `<tr><td>ค่าบริการสถานที่การกีฬา <span class="calc">${CFG.FACILITY_FEE} บาท/คน × ${f.outsiderCount} คน (เฉพาะบุคคลภายนอก)</span></td><td>${baht(f.facilityFee)} บาท</td></tr>` : ''}
      <tr class="total"><td>รวมทั้งสิ้น</td><td>${baht(f.total)} บาท</td></tr>`;
    const pill = $('#member-count');
    pill.textContent = `${n} / ${CFG.MAX_MEMBERS} คน · ครอบครัว ${f.familyCount}/${FAMILY_ROWS} · ` +
      `บุคคลภายนอก ${f.outsiderCount}/${CFG.MAX_OUTSIDERS}`;
    pill.classList.toggle('over', countRuleErrors(f.familyCount, f.outsiderCount).length > 0);
    updateCert();
  }

  // คำรับรอง is only for outsiders (ข้อ ๖.๓)
  function updateCert() {
    const outs = state.members.filter(isOutsider);
    $('#cert-card').hidden = !outs.length;
    const names = outs.map((m) => String(m.fullName || '').trim()).filter(Boolean);
    $('#cert-text').textContent = certText(names.length ? `ได้แก่ ${names.join(', ')}` : '');
    if (!outs.length) form.agree.checked = false;
  }

  function onMembersInput(e) {
    const card = e.target.closest('.member');
    if (!card) return;
    const i = Number(card.dataset.i);
    const m = state.members[i];
    const t = e.target;
    t.classList.remove('invalid');
    if (t.type === 'radio') {
      t.closest('.seg').classList.remove('invalid');
      if (e.type !== 'change') return; // radios fire input + change; handle once
      if (t.name.startsWith('mtype-')) {
        const before = relOptions(m);
        m.memberType = t.value;
        // a chip from the other type's list no longer fits (e.g. คู่สมรส → บุคคลภายนอก)
        if (!m.relOther && before.includes(m.relationship) && !relOptions(m).includes(m.relationship)) m.relationship = '';
        renderMembers();
      } else if (t.name.startsWith('rel-')) {
        const other = card.querySelector('[data-k=relationshipOther]');
        if (t.value === REL_OTHER) {
          m.relOther = true;
          m.relationship = other.value.trim();
          other.hidden = false;
          other.focus();
        } else {
          m.relOther = false;
          m.relationship = t.value;
          other.hidden = true;
          other.classList.remove('invalid');
          if (!m.memberType && FAMILY_RELATIONSHIPS.includes(t.value) && !typeLimits(i)[FAMILY]) { // คู่สมรส/บุตร… implies family
            m.memberType = FAMILY;
            renderMembers();
          }
        }
      } else {
        m.membership = t.value;
        renderMembers(); // the photo field differs for สมัครใหม่ / ต่ออายุ
      }
      return;
    }
    const k = t.dataset.k;
    if (k === 'relationshipOther') m.relationship = t.value;
    else if (k) m[k] = t.value;
    if (k === 'fullName' && isOutsider(m)) updateCert();
    if (k === 'address' || k === 'fullName') refreshAddrCopy();
  }

  function onMembersClick(e) {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const i = Number(btn.closest('.member').dataset.i);
    const m = state.members[i];
    const act = btn.dataset.act;
    if (act === 'remove') {
      state.members.splice(i, 1);
      renderMembers();
    } else if (act === 'copy-address') {
      m.address = state.members[Number(btn.dataset.from)].address;
      const ta = btn.closest('.member').querySelector('[data-k=address]');
      ta.value = m.address;
      ta.classList.remove('invalid');
      refreshAddrCopy();
    } else if (act === 'photo' || act === 'photo-adjust') {
      const apply = (r) => {
        if (!r) return;
        Object.assign(m, { photo: r.photo, thumb: r.thumb, source: r.source, view: r.view });
        if (state.members.includes(m)) renderMembers();
        $('#form-error').hidden = true;
      };
      if (act === 'photo-adjust' && m.source) openEditor(m.source, m.view, m.memberType).then(apply);
      else pickPhoto(apply, m.memberType);
    } else if (act === 'photo-remove') {
      ['photo', 'thumb', 'source', 'view'].forEach((k) => delete m[k]);
      renderMembers();
    }
  }

  function addMember() {
    if (state.members.length >= CFG.MAX_MEMBERS) return;
    const purpose = (form.querySelector('input[name=purpose]:checked') || {}).value;
    state.members.push(blankMember(purpose === 'ต่ออายุ' ? 'ต่ออายุ' : 'สมัครใหม่'));
    renderMembers();
    const cards = $$('.member');
    cards[cards.length - 1].querySelector('input').focus();
  }

  function collect() {
    const checked = (name) => (form.querySelector(`input[name="${name}"]:checked`) || {}).value || '';
    const int = (v) => (v === '' || v == null ? '' : Number(v));
    return {
      formDate: form.formDate.value,
      applicantName: form.applicantName.value.trim(),
      applicantType: '',
      department: canonicalDept(form.department.value),
      position: canonicalPosition(form.position.value),
      purpose: checked('purpose'),
      renewedFrom: state.renewedFrom || '',
      members: state.members.map((m) => ({
        fullName: String(m.fullName).trim(), age: int(m.age), address: String(m.address).trim(),
        relationship: String(m.relationship).trim(), memberType: m.memberType, membership: m.membership,
        photo: m.photo || undefined, thumb: m.photo ? m.thumb : undefined,
        renewOf: m.carry || undefined,
      })),
      agree: form.agree.checked,
    };
  }

  function validate(d) {
    $$('.invalid', form).forEach((el) => el.classList.remove('invalid'));
    const errors = [];
    const bad = (el, msg) => { if (el) el.classList.add('invalid'); errors.push({ el, msg }); };
    if (!parts(d.formDate)) bad(form.formDate, 'กรุณาระบุวันที่ยื่น');
    if (!d.applicantName) bad(form.applicantName, 'กรุณากรอกชื่อ - สกุล ผู้ยื่น');
    if (!d.department) bad(form.department, 'กรุณากรอกสังกัด');
    if (!d.purpose) bad($('#purpose'), 'กรุณาเลือกความประสงค์');
    d.members.forEach((m, i) => {
      const card = $(`.member[data-i="${i}"]`);
      const f = (k) => card.querySelector(`[data-k=${k}]`);
      const n = i + 1;
      const carried = !!m.renewOf; // blanks keep the stored values
      if (!m.fullName) bad(f('fullName'), `กรุณากรอกชื่อ - สกุล สมาชิกลำดับที่ ${n}`);
      if (!(carried && m.age === '') && (m.age === '' || !Number.isInteger(m.age) || m.age < 0 || m.age > 120)) {
        bad(f('age'), `อายุของสมาชิกลำดับที่ ${n} ไม่ถูกต้อง`);
      }
      if (!m.address && !carried) bad(f('address'), `กรุณากรอกที่อยู่ของสมาชิกลำดับที่ ${n}`);
      if (!m.relationship && !carried) {
        bad(relChoice(state.members[i]) === REL_OTHER ? f('relationshipOther') : f('relationship'),
          `กรุณาเลือกฐานะของสมาชิกลำดับที่ ${n}`);
      }
      if (!MEMBER_TYPES.some(([v]) => v === m.memberType)) bad(f('memberType'), `กรุณาเลือกประเภทสมาชิกลำดับที่ ${n}`);
      if (!MEMBERSHIP.includes(m.membership)) bad(f('membership'), `กรุณาเลือกสมาชิกภาพลำดับที่ ${n}`);
      if (m.membership === 'สมัครใหม่' && !m.photo) bad(card.querySelector('.photo-box'), `กรุณาแนบรูปถ่ายของสมาชิกคนที่ ${n} (สมัครใหม่)`);
    });
    const outsiderCount = d.members.filter(isOutsider).length;
    countRuleErrors(d.members.length - outsiderCount, outsiderCount)
      .forEach((msg) => errors.push({ el: $('#members'), msg }));
    if (outsiderCount && !d.agree) bad(form.agree.closest('.check'), 'กรุณาติ๊กคำรับรองสำหรับบุคคลภายนอก');
    return errors;
  }

  function showFormError(msgs) {
    const box = $('#form-error');
    if (!msgs.length) { box.hidden = true; return; }
    box.innerHTML = msgs.length === 1 ? esc(msgs[0]) :
      `กรุณาตรวจสอบ ${msgs.length} รายการ:<br>` + msgs.slice(0, 5).map((m) => '• ' + esc(m)).join('<br>') + (msgs.length > 5 ? '<br>…' : '');
    box.hidden = false;
  }

  async function onSubmit(e) {
    e.preventDefault();
    const d = collect();
    const errors = validate(d);
    if (errors.length) {
      showFormError(errors.map((x) => x.msg));
      const first = errors[0].el;
      if (first) {
        first.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const focusable = first.matches('input,textarea,select') ? first : first.querySelector('input');
        if (focusable) focusable.focus({ preventScroll: true });
      }
      return;
    }
    showFormError([]);
    const btn = $('#submit-btn');
    btn.disabled = true;
    btn.textContent = 'กำลังบันทึก…';
    try {
      const r = await api.submit(d);
      lastSaved = { application: r.application, members: r.members };
      reg.loaded = false;
      $('#success-id').textContent = r.appId;
      $('#success-summary').textContent =
        `${r.application.applicant_name} · สมาชิก ${r.members.length} คน · ค่าธรรมเนียมรวม ${baht(r.application.total_fee)} บาท`;
      form.hidden = true;
      $('#renew-note').hidden = true;
      $('#success').hidden = false;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      showFormError([err.message || 'บันทึกไม่สำเร็จ']);
    } finally {
      btn.disabled = false;
      btn.textContent = 'บันทึกใบสมัคร';
    }
  }

  function startNewForm() {
    resetForm();
    $('#success').hidden = true;
    form.hidden = false;
    window.scrollTo({ top: 0 });
  }

  // Fill the form for ต่ออายุ from a previous application (registry rows or the public lookup).
  function fillRenewal(app, members, fromLookup) {
    const appId = String(app.app_id);
    const ms = members.slice().sort((a, b) => a.seq - b.seq).slice(0, CFG.MAX_MEMBERS);
    const diff = Math.max(0, curYearBE() - Number(app.year_be));
    form.applicantName.value = app.applicant_name || '';
    form.department.value = canonicalDept(app.department);
    updateDeptHint();
    form.position.value = canonicalPosition(app.position);
    updatePosHint();
    form.querySelector('input[name=purpose][value="ต่ออายุ"]').checked = true;
    const type = (m) => (MEMBER_TYPES.some(([v]) => v === m.member_type) ? m.member_type : '');
    state.members = ms.map((m) => (fromLookup
      // public lookup: names only — blank fields keep what is stored (Code.gs copies them on save)
      ? { fullName: m.full_name, age: '', address: '', relationship: '', membership: 'ต่ออายุ', memberType: type(m),
        carry: { appId, seq: Number(m.seq) }, hasPhoto: !!m.has_photo }
      // staff, from the registry: full details
      : { fullName: m.full_name, age: m.age === '' ? '' : Number(m.age) + diff, address: m.address,
        relationship: m.relationship, membership: 'ต่ออายุ', memberType: type(m), prevThumb: m.photo_thumb || '' }));
    if (!state.members.length) state.members = [blankMember('ต่ออายุ')];
    state.renewedFrom = appId;
    renderMembers();
    const stillValid = Number(app.year_be) >= curYearBE();
    const note = $('#renew-note');
    note.textContent = `ต่ออายุจากใบสมัครเลขที่ ${appId} (${yearLabel(app.year_be)})` +
      (diff && !fromLookup ? ` · ปรับอายุสมาชิกเพิ่ม ${diff} ปีแล้ว` : '') +
      (stillValid ? ` · ใบนี้ยังใช้ได้ถึง ${thMid(yearEndISO(app.year_be))}` : '') + ' — ตรวจสอบข้อมูลก่อนบันทึก';
    note.hidden = false;
    updateRenewLookup();
  }

  function prefillRenewal(appId) { // staff, from the registry
    const app = reg.appsById[appId];
    if (!app) return;
    startNewForm();
    fillRenewal(app, reg.membersByApp[appId] || [], false);
    switchView('form');
    toast('โหลดข้อมูลสำหรับต่ออายุแล้ว');
  }

  // ต่ออายุ from the public form: ผู้ยื่น name + previous application no. (2569-0012, 2569-12 or 25690012)
  function normalizeAppNo(v) {
    const t = String(v || '').trim();
    let m = /^(\d{4})\s*[-/]\s*(\d{1,4})$/.exec(t);
    if (m) return `${m[1]}-${m[2].padStart(4, '0')}`;
    m = /^(\d{4})(\d{4})$/.exec(t.replace(/\s+/g, ''));
    return m ? `${m[1]}-${m[2]}` : '';
  }

  function updateRenewLookup() {
    const renew = (form.querySelector('input[name=purpose]:checked') || {}).value === 'ต่ออายุ';
    $('#renew-lookup').hidden = !renew;
    const btn = $('#renew-fetch');
    if (btn.dataset.busy) return;
    const name = form.applicantName.value.trim();
    const no = normalizeAppNo($('#renew-app').value);
    btn.disabled = !name || !no;
    const hint = $('#renew-hint');
    if (hint.dataset.sticky) return;
    hint.classList.remove('warn');
    hint.textContent = !name ? 'กรอกชื่อ - สกุล ผู้ยื่นในข้อ 1 ก่อน จึงจะดึงข้อมูลได้'
      : ($('#renew-app').value.trim() && !no ? 'รูปแบบเลขที่ใบสมัคร เช่น 2569-0012' : '');
  }

  async function fetchRenewal() {
    const name = form.applicantName.value.trim();
    const no = normalizeAppNo($('#renew-app').value);
    if (!name || !no) { updateRenewLookup(); return; }
    const btn = $('#renew-fetch');
    const hint = $('#renew-hint');
    btn.dataset.busy = '1';
    btn.disabled = true;
    btn.textContent = 'กำลังค้นหา…';
    try {
      const r = await api.renewLookup(no, name);
      $('#renew-app').value = no;
      fillRenewal(r.application, r.members || [], true);
      hint.dataset.sticky = '1';
      hint.classList.remove('warn');
      hint.textContent = `ดึงข้อมูลสมาชิก ${(r.members || []).length} คนจากใบสมัครเลขที่ ${no} แล้ว`;
      $('#members').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      hint.dataset.sticky = '1';
      hint.classList.add('warn');
      hint.textContent = err.message || 'ดึงข้อมูลไม่สำเร็จ';
    } finally {
      delete btn.dataset.busy;
      btn.textContent = 'ดึงข้อมูล';
      btn.disabled = !normalizeAppNo($('#renew-app').value) || !form.applicantName.value.trim();
    }
  }

  // ================================================================== PRINT
  const fill = (v, width, cls) =>
    `<span class="pf-fill${cls ? ' ' + cls : ''}"${width ? ` style="width:${width}"` : ''}>${esc(v)}</span>`;
  const box = (on) => `<span class="pf-box${on ? ' on' : ''}"></span>`;
  const blankDate = () => `วันที่ ${fill('', '14mm')}/${fill('', '14mm')}/${fill('', '18mm')}`;

  function renderPrint(app, members) {
    const p = parts(app.form_date) || { d: '', m: 1, y: '' };
    const ms = members.slice().sort((a, b) => a.seq - b.seq);
    const foot = (n) => `<div class="pf-foot"><span>ใบสมัครสมาชิกวิทยุการบิน (ปรับปรุง พ.ศ. 2569) · เลขที่ ${esc(app.app_id)}</span><span>หน้า ${n} / 2</span></div>`;
    // place people by section (works for old records whose seq predates the section layout)
    const fam = ms.filter((m) => !isOutsider(m)).slice(0, FAMILY_ROWS);
    const outs = ms.filter(isOutsider).slice(0, CFG.MAX_OUTSIDERS);
    const outRows = outs.map((_, k) => FAMILY_ROWS + k + 1);
    const cell = (v, cls) => `<td class="${cls || ''}"><div class="cell">${esc(v)}</div></td>`;
    const row = (no, m) => (m
      ? `<tr><td class="c">${no}.</td>${cell(m.full_name, 'val')}${cell(m.age, 'c val')}${cell(m.address, 'val')}` +
        `${cell(m.relationship, 'val')}<td class="c">${box(m.membership === 'สมัครใหม่')}</td>` +
        `<td class="c">${box(m.membership === 'ต่ออายุ')}</td><td></td></tr>`
      : `<tr><td class="c">${no}.</td><td></td><td></td><td></td><td></td><td class="c">${box()}</td><td class="c">${box()}</td><td></td></tr>`);
    const rows =
      `<tr class="sect"><td colspan="8">ประเภท ๒ ครอบครัวพนักงาน — ค่าจัดทำบัตร ${CFG.CARD_FEE} บาท/คน/ปี</td></tr>` +
      Array.from({ length: FAMILY_ROWS }, (_, i) => row(i + 1, fam[i])).join('') +
      `<tr class="sect"><td colspan="8">ประเภท ๓ บุคคลภายนอก (ไม่เกิน ${CFG.MAX_OUTSIDERS} คน ต้องมีพนักงานรับรอง) — ` +
      `ค่าจัดทำบัตร ${CFG.CARD_FEE} + ค่าสมาชิก ${CFG.MEMBER_FEE} บาท/คน/ปี</td></tr>` +
      Array.from({ length: CFG.MAX_OUTSIDERS }, (_, k) => row(FAMILY_ROWS + k + 1, outs[k])).join('');

    const page1 = `
      <section class="pf-page">
        <div class="pf-title">ใบสมัครสมาชิกวิทยุการบิน</div>
        <div class="pf-subtitle">ตาม${esc(CFG.RULE_REF)}</div>
        <div class="pf-top">
          <div class="pf-top-left">
            <div class="pf-row">วันที่ ${fill(p.d, '14mm')} เดือน ${fill(TH_MONTHS[p.m - 1], '32mm')} พ.ศ. ${fill(p.y ? p.y + 543 : '', '18mm')}</div>
            <div class="pf-row">ชื่อ - สกุล ${fill(app.applicant_name, '', 'grow')}</div>
            <div class="pf-row">สังกัด ${fill(app.department, '', 'grow')}</div>
          </div>
          <table class="pf-staffbox">
            <tr><td class="hd" rowspan="2">สำหรับ<br>เจ้าหน้าที่</td><td>รับสมัครเมื่อ</td><td>ผู้รับ</td></tr>
            <tr><td class="blank"></td><td class="blank"></td></tr>
          </table>
        </div>
        <div class="pf-row">มีความประสงค์ที่จะนำบุคคลต่อไปนี้</div>
        <div class="pf-row pf-indent1">${PURPOSES.map(([v, l]) => `<span class="pf-opt">${box(app.purpose === v)}${l}</span>`).join('')}</div>
        <div class="pf-row">(โปรดระบุรายละเอียดผู้เป็นสมาชิก)</div>
        <table class="pf-members">
          <colgroup><col style="width:6%"><col style="width:23%"><col style="width:6%"><col style="width:29%"><col style="width:12%"><col style="width:6%"><col style="width:6%"><col style="width:12%"></colgroup>
          <thead><tr><th rowspan="2">ลำดับ</th><th rowspan="2">ชื่อ - สกุล</th><th rowspan="2">อายุ</th>
            <th rowspan="2">สถานที่อยู่อาศัย / ทำงานในปัจจุบัน<br>(ที่สามารถติดต่อได้)</th><th rowspan="2">ฐานะที่เกี่ยวข้อง<br>กับผู้ยื่น</th>
            <th colspan="2">สมาชิกภาพ</th><th rowspan="2">ลายมือชื่อ<br>ผู้สมัคร</th></tr>
            <tr><th class="sm">สมัคร<br>ใหม่</th><th class="sm">ต่อ<br>อายุ</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        ${foot(1)}
      </section>`;

    const page2 = `
      <section class="pf-page">
        ${outRows.length ? `<div class="pf-h2">คำรับรองของพนักงานผู้รับรอง (สมาชิกประเภทที่ ๓ บุคคลภายนอก)</div>
        <p class="pf-cert">${esc(certText(`(ลำดับที่ ${outRows.join(', ')})`))}</p>` : '<div class="pf-h2">รูปถ่ายและค่าธรรมเนียม</div>'}
        <p class="pf-cert">พร้อมนี้ ข้าพเจ้าได้แนบรูปถ่ายและค่าธรรมเนียมในการสมัครเป็นสมาชิก มาดังนี้</p>
        <table class="pf-attach">
          <tr><td class="n">1.</td><td>รูปถ่ายหน้าตรงของผู้สมัคร (แนบในระบบ · ต่ออายุใช้รูปเดิม)</td><td class="amt">จำนวน ${fill(app.photo_count, '26mm')} คน</td></tr>
          <tr><td class="n">2.</td><td>ค่าจัดทำบัตรสมาชิก ${CFG.CARD_FEE} บาท/คน/ปี (สมาชิกประเภท ๒ และ ๓)</td><td class="amt">รวมเป็นเงิน ${fill(baht(app.card_fee), '26mm')} บาท</td></tr>
          <tr><td class="n">3.</td><td>ค่าสมาชิก ${CFG.MEMBER_FEE} บาท/คน/ปี (เฉพาะสมาชิกประเภท ๓)</td><td class="amt">รวมเป็นเงิน ${fill(baht(app.member_fee), '26mm')} บาท</td></tr>
          ${Number(app.facility_fee) ? `<tr><td class="n">4.</td><td>ค่าบริการสถานที่การกีฬา (เฉพาะสมาชิกประเภท ๓)</td><td class="amt">รวมเป็นเงิน ${fill(baht(app.facility_fee), '26mm')} บาท</td></tr>` : ''}
        </table>
        <p class="pf-note">หมายเหตุ: ${esc(usageNote(outRows.length > 0))}</p>
        <div class="pf-sign">
          <div class="pf-row">ลายมือชื่อ ${fill('', '', 'grow')}</div>
          <div class="pf-row">ตำแหน่ง ${fill(app.position, '', 'grow')}</div>
          <div class="pf-row">วันที่ ${fill(thShort(app.form_date), '', 'grow')}</div>
        </div>
        <hr class="pf-cut">
        <div class="pf-staff">
          <div class="pf-staff-hd">สำหรับเจ้าหน้าที่</div>
          <div class="pf-staff-body">
            <div class="pf-row"><b>เรียน</b>&nbsp;${esc(CFG.ADDRESSEE)}</div>
            <div class="pf-row pf-indent1">${box()}เห็นควรอนุมัติให้เข้าเป็นสมาชิกได้โดย</div>
            <div class="pf-row pf-indent2">${box()}เรียกเก็บค่าบัตรสมาชิกของผู้สมัครได้ในลำดับที่ ${fill('', '40mm')}</div>
            <div class="pf-row pf-indent2">${box()}ไม่เรียกเก็บค่าบัตรสมาชิกของผู้สมัครในลำดับที่ ${fill('', '40mm')}</div>
            <div class="pf-row pf-indent2">${box()}เก็บค่าสมาชิกของผู้สมัครในลำดับที่ ${fill('', '40mm')}</div>
            <div class="pf-row pf-indent1">${box()}ไม่อาจดำเนินการได้</div>
            <div class="pf-row">เนื่องจาก ${fill('', '', 'grow')}</div>
            <div class="pf-row">${fill('', '', 'grow')}</div>
            <div class="pf-sign">
              <div class="pf-row">ลงชื่อ ${fill('', '', 'grow')} เจ้าหน้าที่</div>
              <div class="pf-row">${blankDate()}</div>
            </div>
            <div class="pf-row">คำสั่ง ${fill('', '', 'grow')}</div>
            <div class="pf-row">${fill('', '', 'grow')}</div>
            <div class="pf-sign">
              <div class="pf-row">ลงชื่อ ${fill('', '', 'grow')}</div>
              <div class="pf-center">${esc(CFG.DIRECTOR_TITLE)}</div>
              <div class="pf-row">${blankDate()}</div>
            </div>
          </div>
        </div>
        ${foot(2)}
      </section>`;
    return page1 + page2;
  }

  // Shrink any filled value that is wider than its dotted line (e.g. a long สังกัด name).
  function fitPrintFields(root) {
    root.style.cssText = 'display:block;position:absolute;left:-10000px;top:0;width:182mm'; // A4 minus print margins
    root.querySelectorAll('.pf-fill').forEach((el) => {
      let size = 11;
      while (el.scrollWidth > el.clientWidth + 1 && size > 8) {
        size -= 0.5;
        el.style.fontSize = size + 'pt';
      }
      if (el.scrollWidth > el.clientWidth + 1) { // still too long (e.g. a long ตำแหน่ง): wrap onto 2 lines
        el.classList.add('wrap');
        el.style.fontSize = '9.5pt';
      }
    });
    root.querySelectorAll('.pf-members .cell').forEach((el) => { // table cells: shrink until it fits the row
      let size = 10.5;
      while (el.scrollHeight > el.clientHeight + 1 && size > 7) {
        size -= 0.5;
        el.style.fontSize = size + 'pt';
      }
    });
    root.style.cssText = '';
  }

  // The form prints with page margins; cards print edge to edge so front and back line up when flipped.
  function setPrintMode(mode) {
    let st = $('#print-page-style');
    if (!st) {
      st = document.createElement('style');
      st.id = 'print-page-style';
      document.head.appendChild(st);
    }
    st.textContent = mode === 'cards' ? '@page { size: A4 portrait; margin: 0; }' : '';
    document.body.dataset.print = mode;
  }

  function printApplication(app, members) {
    setPrintMode('form');
    const root = $('#print-root');
    root.innerHTML = renderPrint(app, members);
    const go = () => { fitPrintFields(root); window.print(); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(go); else go();
  }

  // ================================================================== MEMBER CARDS
  // A4 portrait, 2 × 5 cards of 85.6 × 54 mm (บัตรประชาชน / CR80). Sheet 1 = fronts, sheet 2 = backs with each
  // row's two cards swapped, so printing on both sides (flip on long edge) puts every back behind its front.
  const CARD_COLS = 2;
  const CARD_ROWS = 5;
  const CARDS_PER_SHEET = CARD_COLS * CARD_ROWS;
  const RULE_SHORT = String(CFG.RULE_REF).split(' แนวปฏิบัติ')[0];

  const memberNo = (x) => `${x.app_id}-${pad(x.seq)}`;

  function cardFront(x, photo, issued) {
    const out = isOutsider(x);
    const pic = photo ? `<img src="${esc(photo)}" alt="">` : '<span class="cd-nophoto">ติดรูปถ่าย<br>1 นิ้ว</span>';
    return `<div class="cd cd-front ${out ? 't-out' : 't-fam'}">
      <div class="cd-head">
        ${CFG.CARD_LOGO ? `<img class="cd-logo" src="${esc(CFG.CARD_LOGO)}" alt="">` : ''}
        <div class="cd-head-text"><div class="cd-title">${esc(CFG.CARD_TITLE)}</div><div class="cd-org">${esc(CFG.CERTIFIER_UNIT)}</div></div>
      </div>
      <div class="cd-type"><span>${out ? 'ประเภท ๓ · บุคคลภายนอก' : 'ประเภท ๒ · ครอบครัวพนักงาน'}</span><span class="cd-no">${esc(memberNo(x))}</span></div>
      <div class="cd-body">
        <div class="cd-photo">${pic}</div>
        <div class="cd-info">
          <div class="cd-name cd-fit">${esc(x.full_name)}</div>
          <div class="cd-row"><span class="cd-k">${out ? 'ผู้รับรอง' : 'พนักงาน'}</span><span class="cd-v cd-fit">${esc(x.applicant_name)}</span></div>
          <div class="cd-row"><span class="cd-k">ฐานะ</span><span class="cd-v cd-fit">${esc(x.relationship)}</span></div>
          <div class="cd-row"><span class="cd-k">สิทธิ์</span><span class="cd-v cd-fit">${esc(out ? CFG.OUTSIDER_RIGHTS : CFG.FAMILY_RIGHTS)}</span></div>
          ${out ? `<div class="cd-row"><span class="cd-k"></span><span class="cd-v cd-fit">${esc(CFG.OUTSIDER_HOURS)}</span></div>` : ''}
          <div class="cd-dates">
            <div><span class="cd-k">ออกบัตร</span>${esc(thMid(issued))}</div>
            <div class="cd-exp"><span class="cd-k">หมดอายุ</span>${esc(thMid(yearEndISO(x.year_be)))}</div>
          </div>
        </div>
      </div>
    </div>`;
  }

  function cardBack(x) {
    const out = isOutsider(x);
    const rules = [
      'แสดงบัตรต่อเจ้าหน้าที่ทุกครั้งก่อนเข้าใช้บริการ และฝากบัตรไว้กับเจ้าหน้าที่',
      out ? CFG.OUTSIDER_RULES : CFG.FAMILY_RIGHTS + ' ตามวันและเวลาที่กำหนด',
      `บัตรใช้ได้ถึง ${thLong(yearEndISO(x.year_be)).replace(' พ.ศ.', '')} และต้องปฏิบัติตาม${RULE_SHORT}`,
    ];
    return `<div class="cd cd-back ${out ? 't-out' : 't-fam'}">
      <div class="cd-back-head"><div class="cd-back-title">เงื่อนไขการใช้บัตร</div>
        <div class="cd-back-id cd-fit">${esc(memberNo(x))} · ${esc(x.full_name)}</div></div>
      <ol class="cd-rules">${rules.map((r) => `<li>${esc(r)}</li>`).join('')}</ol>
      <div class="cd-sign"><span class="cd-line"></span><span>เจ้าหน้าที่ผู้ออกบัตร</span></div>
      <div class="cd-return">หากพบบัตรนี้ โปรดส่งคืน${esc(CFG.CERTIFIER_UNIT)}${CFG.CARD_CONTACT ? ` · ${esc(CFG.CARD_CONTACT)}` : ''}</div>
    </div>`;
  }

  function cropMarks() {
    const xs = Array.from({ length: CARD_COLS + 1 }, (_, i) => i * 85.6);
    const ys = Array.from({ length: CARD_ROWS + 1 }, (_, i) => i * 54);
    return xs.map((x) => `<i class="cm v" style="left:${x}mm"></i>`).join('') +
      ys.map((y) => `<i class="cm h" style="top:${y}mm"></i>`).join('');
  }

  function renderCards(rows, photos, issued) {
    const sheets = [];
    for (let i = 0; i < rows.length; i += CARDS_PER_SHEET) {
      const chunk = rows.slice(i, i + CARDS_PER_SHEET);
      const slots = Array.from({ length: CARDS_PER_SHEET }, (_, k) => chunk[k]);
      const n = sheets.length / 2 + 1;
      const total = Math.ceil(rows.length / CARDS_PER_SHEET);
      const front = slots.map((x) => (x ? cardFront(x, photos[rowKey(x)] || x.photo_thumb, issued) : '<div class="cd-slot"></div>')).join('');
      const back = [];
      for (let r = 0; r < CARD_ROWS; r++) {
        for (let c = CARD_COLS - 1; c >= 0; c--) { // mirrored: flip on the long edge
          const x = slots[r * CARD_COLS + c];
          back.push(x ? cardBack(x) : '<div class="cd-slot"></div>');
        }
      }
      sheets.push(`<section class="cd-sheet"><div class="cd-grid">${front}${cropMarks()}</div>
        <div class="cd-sheet-note">บัตรสมาชิก · ด้านหน้า · ชุดที่ ${n}/${total} · ${chunk.length} ใบ — พิมพ์สองหน้าแบบกลับด้านยาว ตัดตามเส้น</div></section>`);
      sheets.push(`<section class="cd-sheet"><div class="cd-grid">${back.join('')}</div>
        <div class="cd-sheet-note">บัตรสมาชิก · ด้านหลัง · ชุดที่ ${n}/${total}</div></section>`);
    }
    return `<div class="cd-print">${sheets.join('')}</div>`;
  }

  // Shrink one-line values (long names, long ผู้รับรอง names) until they fit their box.
  function fitCards(root) {
    root.style.cssText = 'display:block;position:absolute;left:-10000px;top:0;width:210mm';
    root.querySelectorAll('.cd-fit').forEach((el) => {
      let size = parseFloat(getComputedStyle(el).fontSize) * 0.75; // px → pt
      while (el.scrollWidth > el.clientWidth + 0.5 && size > 5) {
        size -= 0.25;
        el.style.fontSize = size + 'pt';
      }
    });
    root.style.cssText = '';
  }

  async function printCards() {
    const rows = reg.rows.filter((x) => reg.picked.has(rowKey(x)) && x.status === 'active');
    if (!rows.length) { toast('เลือกสมาชิกที่ต้องการพิมพ์บัตรก่อน', true); return; }
    const btn = $('#print-cards');
    btn.dataset.busy = '1';
    btn.disabled = true;
    btn.textContent = 'กำลังเตรียมบัตร…';
    try {
      const photos = {};
      const withPhoto = rows.filter((x) => x.photo_id);
      for (let i = 0; i < withPhoto.length; i += CARDS_PER_SHEET) {
        const r = await api.photos(kv.get(KEY_STORE, 'session'),
          withPhoto.slice(i, i + CARDS_PER_SHEET).map((x) => ({ appId: x.app_id, seq: x.seq })));
        Object.assign(photos, r.photos || {});
      }
      setPrintMode('cards');
      const root = $('#print-root');
      root.innerHTML = renderCards(rows, photos, todayISO());
      await Promise.all($$('img', root).map((img) => (img.decode ? img.decode().catch(() => {}) : null)));
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      fitCards(root);
      const missing = rows.length - rows.filter((x) => photos[rowKey(x)] || x.photo_thumb).length;
      if (missing) toast(`${missing} คนยังไม่มีรูป — บัตรจะเว้นช่องไว้ติดรูปถ่าย`);
      window.print();
    } catch (err) {
      if (err.code === 401) { kv.del(KEY_STORE, 'session'); showLock('รหัสเจ้าหน้าที่ไม่ถูกต้อง'); }
      else toast(err.message || 'เตรียมบัตรไม่สำเร็จ', true);
    } finally {
      delete btn.dataset.busy;
      updatePickButton();
    }
  }

  // ================================================================== REGISTRY
  const reg = { loaded: false, loading: false, rows: [], apps: [], appsById: {}, membersByApp: {}, picked: new Set() };
  const rowKey = (x) => `${x.app_id}|${x.seq}`;

  function showLock(msg) {
    $('#registry').hidden = true;
    $('#lock').hidden = false;
    const err = $('#lock-error');
    err.textContent = msg || '';
    err.hidden = !msg;
    const input = $('#lock-form').key;
    input.value = '';
    setTimeout(() => input.focus(), 0);
  }

  function openRegistry() {
    if (!DEMO && !kv.get(KEY_STORE, 'session')) { showLock(); return; }
    loadRegistry(false);
  }

  async function loadRegistry(force) {
    $('#lock').hidden = true;
    $('#registry').hidden = false;
    $('#logout').hidden = DEMO;
    if (reg.loaded && !force) { renderRegistry(); return; }
    if (reg.loading) return;
    reg.loading = true;
    $('#reg-table').innerHTML = '<tbody><tr><td class="empty">กำลังโหลดข้อมูล…</td></tr></tbody>';
    try {
      const r = await api.list(kv.get(KEY_STORE, 'session'));
      buildRegistry(r);
      reg.loaded = true;
      renderRegistry();
    } catch (err) {
      if (err.code === 401) {
        kv.del(KEY_STORE, 'session');
        showLock('รหัสเจ้าหน้าที่ไม่ถูกต้อง');
      } else {
        $('#reg-table').innerHTML = `<tbody><tr><td class="empty">${esc(err.message)}</td></tr></tbody>`;
        toast(err.message, true);
      }
    } finally {
      reg.loading = false;
    }
  }

  function buildRegistry(r) {
    const cur = curYearBE();
    reg.apps = (r.applications || []).map((a) => Object.assign({}, a, { app_id: String(a.app_id), year_be: Number(a.year_be) }));
    reg.appsById = {};
    reg.apps.forEach((a) => { reg.appsById[a.app_id] = a; });
    reg.membersByApp = {};
    const rows = (r.members || []).map((m) => {
      const a = reg.appsById[String(m.app_id)] || {};
      const row = Object.assign({}, m, {
        app_id: String(m.app_id), seq: Number(m.seq), year_be: Number(m.year_be || a.year_be),
        applicant_name: m.applicant_name || a.applicant_name || '', department: m.department || a.department || '',
        applicant_type: a.applicant_type || '', form_date: a.form_date || '', position: a.position || '',
      });
      row.pk = norm(row.full_name) + '|' + norm(row.applicant_name);
      (reg.membersByApp[row.app_id] = reg.membersByApp[row.app_id] || []).push(row);
      return row;
    });
    const latest = {};
    rows.forEach((x) => { latest[x.pk] = Math.max(latest[x.pk] || 0, x.year_be); });
    rows.forEach((x) => {
      x.status = x.year_be >= cur ? 'active' : (x.year_be === latest[x.pk] ? 'renew' : 'history');
    });
    rows.sort((a, b) => b.year_be - a.year_be || (a.app_id < b.app_id ? 1 : a.app_id > b.app_id ? -1 : 0) || a.seq - b.seq);
    reg.rows = rows;
    reg.byKey = {};
    rows.forEach((x) => { reg.byKey[rowKey(x)] = x; });
    reg.picked = new Set([...reg.picked].filter((k) => reg.byKey[k] && reg.byKey[k].status === 'active'));

    const keepYear = $('#f-year').value;
    const keepDept = $('#f-dept').value;
    const years = Array.from(new Set(rows.map((x) => x.year_be))).sort((a, b) => b - a);
    const depts = Array.from(new Set(rows.map((x) => x.department).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'th'));
    $('#f-year').innerHTML = '<option value="">ทุกปี</option>' + years.map((y) => `<option value="${y}">${yearLabel(y)}</option>`).join('');
    $('#f-dept').innerHTML = '<option value="">ทุกสังกัด</option>' + depts.map((d) => `<option value="${esc(d)}">${esc(d)}</option>`).join('');
    if (years.includes(Number(keepYear))) $('#f-year').value = keepYear;
    if (depts.includes(keepDept)) $('#f-dept').value = keepDept;
  }

  const STATUS = { active: ['active', 'ใช้งานปีนี้'], renew: ['renew', 'ต้องต่ออายุ'], history: ['history', 'ประวัติ'] };

  function filteredRows() {
    const q = norm($('#f-q').value);
    const year = $('#f-year').value;
    const dept = $('#f-dept').value;
    const status = $('#f-status').value;
    const type = $('#f-type').value;
    return reg.rows.filter((x) =>
      (!year || String(x.year_be) === year) &&
      (!type || x.member_type === type) &&
      (!dept || x.department === dept) &&
      (status === 'all' || x.status === status) &&
      (!q || norm([x.full_name, x.applicant_name, x.department, x.app_id, x.relationship].join(' ')).includes(q)));
  }

  function renderRegistry() {
    const cur = curYearBE();
    const curRows = reg.rows.filter((x) => x.year_be === cur);
    const curApps = reg.apps.filter((a) => a.year_be === cur);
    const renewCount = reg.rows.filter((x) => x.status === 'renew').length;
    const newCount = curRows.filter((x) => x.membership === 'สมัครใหม่').length;
    const fees = curApps.reduce((s, a) => s + Number(a.total_fee || 0), 0);
    const curOut = curRows.filter(isOutsider).length;
    const noPhoto = curRows.filter((x) => !x.photo_thumb).length;
    $('#tiles').innerHTML = `
      <div class="tile"><div class="tile-label">สมาชิก${yearLabel(cur)}</div><div class="tile-value">${curRows.length}</div><div class="tile-sub">ครอบครัว ${curRows.length - curOut} · บุคคลภายนอก ${curOut}</div></div>
      <div class="tile"><div class="tile-label">สมัครใหม่ / ต่ออายุ</div><div class="tile-value">${newCount} / ${curRows.length - newCount}</div><div class="tile-sub">บัตรหมดอายุ ${thMid(yearEndISO(cur))}</div></div>
      <div class="tile${renewCount ? ' warn' : ''}"><div class="tile-label">ต้องต่ออายุ</div><div class="tile-value">${renewCount}</div><div class="tile-sub">สมาชิกปีก่อนที่ยังไม่ต่อ</div></div>
      <div class="tile${noPhoto ? ' warn' : ''}"><div class="tile-label">ยังไม่มีรูปถ่าย</div><div class="tile-value">${noPhoto}</div><div class="tile-sub">สมาชิก${yearLabel(cur)}</div></div>
      <div class="tile"><div class="tile-label">ค่าธรรมเนียม${yearLabel(cur)}</div><div class="tile-value">${baht(fees)}</div><div class="tile-sub">บาท จาก ${curApps.length} ใบสมัคร</div></div>`;

    const rows = filteredRows();
    const LIMIT = 500;
    const shown = rows.slice(0, LIMIT);
    const body = shown.map((x) => {
      const [cls, label] = STATUS[x.status];
      const canRenew = x.year_be < cur;
      const k = rowKey(x);
      const canCard = x.status === 'active';
      return `<tr${reg.picked.has(k) ? ' class="picked"' : ''}>
        <td class="pick-cell"><div class="pick">
          <input type="checkbox" data-pick="${esc(k)}" aria-label="เลือกพิมพ์บัตร ${esc(x.full_name)}"${reg.picked.has(k) ? ' checked' : ''}${canCard ? '' : ' disabled title="พิมพ์บัตรได้เฉพาะสมาชิกปีนี้"'}>
          <button type="button" class="thumb${x.photo_thumb ? '' : ' no-photo'}" data-act="photo" data-key="${esc(k)}"
            title="${x.photo_thumb ? 'เปลี่ยนรูปถ่าย' : 'เพิ่มรูปถ่าย'}">${x.photo_thumb ? `<img src="${esc(x.photo_thumb)}" alt="">` : `${PERSON_ICON}<span class="plus">+</span>`}</button>
        </div></td>
        <td><span class="app-chip">${esc(x.app_id)}</span><span class="sub">ลำดับ ${x.seq} · ${esc(thShort(x.form_date))}</span></td>
        <td><strong>${esc(x.full_name)}</strong><span class="sub">${esc(x.relationship)} · ${esc(x.age)} ปี</span></td>
        <td class="addr">${esc(x.address)}</td>
        <td class="nowrap">${x.member_type ? `<span class="badge ${isOutsider(x) ? 'type-out' : 'type-fam'}">${esc(x.member_type)}</span>` : '—'}<span class="sub">${esc(x.membership)}</span></td>
        <td>${esc(x.applicant_name)}<span class="sub">${esc(x.department)}</span></td>
        <td><span class="badge ${cls}">${label}</span></td>
        <td><div class="row-actions">
          <button type="button" class="btn btn-ghost btn-sm" data-act="print" data-app="${esc(x.app_id)}">พิมพ์</button>
          ${canRenew ? `<button type="button" class="btn btn-ghost btn-sm" data-act="renew" data-app="${esc(x.app_id)}">ต่ออายุ</button>` : ''}
        </div></td></tr>`;
    }).join('');
    const pickable = shown.filter((x) => x.status === 'active');
    const allOn = pickable.length > 0 && pickable.every((x) => reg.picked.has(rowKey(x)));
    $('#reg-table').innerHTML = `
      <thead><tr><th class="pick-cell"><input type="checkbox" id="pick-all" aria-label="เลือกทั้งหมดที่แสดง (สมาชิกปีนี้)"${allOn ? ' checked' : ''}${pickable.length ? '' : ' disabled'}></th>
        <th>เลขที่ใบสมัคร</th><th>สมาชิก</th><th>ที่อยู่ / ที่ทำงาน</th><th>ประเภท / สมาชิกภาพ</th><th>ผู้ยื่น / ผู้รับรอง</th><th>สถานะ</th><th></th></tr></thead>
      <tbody>${body || `<tr><td class="empty" colspan="8">${reg.rows.length ? 'ไม่พบรายการที่ตรงกับตัวกรอง' : 'ยังไม่มีข้อมูลสมาชิก'}</td></tr>`}</tbody>`;
    updatePickButton();
    $('#reg-count').textContent = `แสดง ${Math.min(rows.length, LIMIT).toLocaleString('th-TH')} จาก ${reg.rows.length.toLocaleString('th-TH')} รายการ` +
      (rows.length > LIMIT ? ` (ใช้ตัวกรองเพื่อดูรายการที่เหลือ หรือส่งออก CSV)` : '');
  }

  function exportCsv() {
    const rows = filteredRows();
    if (!rows.length) { toast('ไม่มีข้อมูลให้ส่งออก', true); return; }
    const head = ['เลขที่ใบสมัคร', 'ปี พ.ศ.', 'วันที่ยื่น', 'ลำดับ', 'ชื่อ - สกุลสมาชิก', 'อายุ', 'ที่อยู่ / ที่ทำงาน', 'ฐานะ',
      'ประเภทสมาชิก', 'สมาชิกภาพ', 'ผู้ยื่น', 'สังกัด', 'ตำแหน่งผู้ยื่น', 'สถานะ'];
    const cell = (v) => {
      let s = String(v == null ? '' : v);
      if (/^[=+\-@]/.test(s)) s = "'" + s; // stop formula injection when opened in Excel
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [head].concat(rows.map((x) => [x.app_id, x.year_be, thShort(x.form_date), x.seq, x.full_name, x.age,
    x.address, x.relationship, x.member_type || '', x.membership, x.applicant_name, x.department, x.position, STATUS[x.status][1]]));
    const csv = '﻿' + lines.map((r) => r.map(cell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `member-registry-${todayISO()}.csv` });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function onRegistryClick(e) {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const id = btn.dataset.app;
    if (btn.dataset.act === 'print') {
      const app = reg.appsById[id];
      if (app) printApplication(app, reg.membersByApp[id] || []);
    } else if (btn.dataset.act === 'renew') {
      prefillRenewal(id);
    } else if (btn.dataset.act === 'photo') {
      const x = reg.byKey[btn.dataset.key];
      if (x) pickPhoto((r) => (r ? savePhoto(x, r) : null), x.member_type);
    }
  }

  // Staff adds / replaces a photo from the registry (e.g. one taken at the counter).
  async function savePhoto(x, r) {
    const cell = $(`#reg-table button.thumb[data-key="${CSS.escape(rowKey(x))}"]`);
    if (cell) cell.classList.add('busy');
    try {
      const res = await api.setPhoto(kv.get(KEY_STORE, 'session'), { appId: x.app_id, seq: x.seq, photo: r.photo, thumb: r.thumb });
      x.photo_id = res.photo_id;
      x.photo_thumb = res.photo_thumb;
      renderRegistry();
      toast(`บันทึกรูปของ ${x.full_name} แล้ว`);
    } catch (err) {
      if (cell) cell.classList.remove('busy');
      toast(err.message || 'บันทึกรูปไม่สำเร็จ', true);
    }
  }

  function onRegistryPick(e) {
    const t = e.target;
    if (t.id === 'pick-all') {
      const shown = filteredRows().slice(0, 500).filter((x) => x.status === 'active');
      shown.forEach((x) => { if (t.checked) reg.picked.add(rowKey(x)); else reg.picked.delete(rowKey(x)); });
      renderRegistry();
    } else if (t.dataset.pick) {
      if (t.checked) reg.picked.add(t.dataset.pick); else reg.picked.delete(t.dataset.pick);
      t.closest('tr').classList.toggle('picked', t.checked);
      updatePickButton();
    }
  }

  function updatePickButton() {
    const n = reg.picked.size;
    const btn = $('#print-cards');
    if (btn.dataset.busy) return;
    btn.disabled = !n;
    btn.textContent = n ? `พิมพ์บัตร (${n})` : 'พิมพ์บัตร';
  }

  // ================================================================== wire up
  function init() {
    $('#demo-banner').hidden = !DEMO;
    buildStatic();
    resetForm();

    $$('.tab').forEach((t) => t.addEventListener('click', () => switchView(t.dataset.view)));

    form.addEventListener('submit', onSubmit);
    form.formDate.addEventListener('input', updateDateHint);
    form.department.addEventListener('change', () => {
      form.department.value = canonicalDept(form.department.value);
      updateDeptHint();
    });
    form.position.addEventListener('change', () => {
      form.position.value = canonicalPosition(form.position.value);
      updatePosHint();
    });
    form.addEventListener('input', (e) => {
      $('#form-error').hidden = true;
      if (!e.target.closest('.member')) {
        e.target.classList.remove('invalid');
        const seg = e.target.closest('.seg, .check');
        if (seg) seg.classList.remove('invalid');
      }
    });
    form.addEventListener('change', (e) => {
      if (e.target.name === 'purpose') {
        // switching the overall purpose sets every member to the same membership type
        const v = e.target.value;
        state.members.forEach((m) => { m.membership = v; });
        renderMembers();
        updateRenewLookup();
        if (v === 'ต่ออายุ' && !state.renewedFrom) $('#renew-lookup').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
    form.applicantName.addEventListener('input', updateRenewLookup);
    $('#renew-app').addEventListener('input', () => { delete $('#renew-hint').dataset.sticky; updateRenewLookup(); });
    $('#renew-app').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); if (!$('#renew-fetch').disabled) fetchRenewal(); }
    });
    $('#renew-fetch').addEventListener('click', fetchRenewal);
    $('#members').addEventListener('input', onMembersInput);
    $('#members').addEventListener('change', onMembersInput);
    $('#members').addEventListener('click', onMembersClick);
    $('#add-member').addEventListener('click', addMember);
    $('#reset-form').addEventListener('click', () => { if (confirmReset()) resetForm(); });
    $('#new-form').addEventListener('click', startNewForm);
    $('#print-saved').addEventListener('click', () => { if (lastSaved) printApplication(lastSaved.application, lastSaved.members); });

    $('#lock-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const key = e.target.key.value.trim();
      if (!key) return;
      kv.set(KEY_STORE, key, 'session');
      loadRegistry(true);
    });
    ['#f-q', '#f-year', '#f-dept', '#f-type', '#f-status'].forEach((s) => $(s).addEventListener('input', renderRegistry));
    $('#refresh').addEventListener('click', () => loadRegistry(true));
    $('#export').addEventListener('click', exportCsv);
    $('#logout').addEventListener('click', () => {
      kv.del(KEY_STORE, 'session');
      reg.loaded = false;
      reg.rows = [];
      showLock();
    });
    $('#reg-table').addEventListener('click', onRegistryClick);
    $('#reg-table').addEventListener('change', onRegistryPick);
    $('#print-cards').addEventListener('click', printCards);
    $('#photo-input').addEventListener('change', onPhotoChosen);
    wireEditor();

    if (location.hash === '#registry') switchView('registry');
  }

  // Avoid a native confirm() dialog: reset only when the form is mostly empty, otherwise ask via a second click.
  let resetArmed = 0;
  function confirmReset() {
    const d = collect();
    const filled = d.applicantName || d.department || d.members.some((m) => m.fullName || m.address);
    if (!filled) return true;
    if (Date.now() - resetArmed < 4000) { resetArmed = 0; return true; }
    resetArmed = Date.now();
    toast('กด "ล้างฟอร์ม" อีกครั้งเพื่อยืนยัน');
    return false;
  }

  init();
})();