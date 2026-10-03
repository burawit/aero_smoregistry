/* ใบสมัครสมาชิกวิทยุการบิน — front end (vanilla JS, no build step) */
(function () {
  'use strict';

  // ------------------------------------------------------------------ config
  const CFG = Object.assign({
    API_URL: '', MEMBER_FEE: 100, CARD_FEE: 20, CARD_FEE_ON_RENEW: true, MAX_MEMBERS: 6,
    ADDRESSEE: 'ผศช.บภ 2.', DIRECTOR_TITLE: 'ผู้อำนวยการศูนย์ควบคุมการบินเชียงใหม่',
    COMPANY_NAME: 'บริษัท วิทยุการบินแห่งประเทศไทย จำกัด', DEPARTMENTS: [], RELATIONSHIPS: [],
    // ระเบียบ ส่วนที่ ๒ ข้อ ๖ — keep in sync with FEES / RULES in Code.gs
    FACILITY_FEE: 0,                       // ค่าบริการสนามคิดรายชั่วโมงเมื่อใช้บริการ (ข้อ ๑๖) จึงไม่เก็บในใบสมัคร
    RULE_REF: 'ประกาศ ที่ ปก/ศช.บภ ๒-๑๘๙๙/๒๕๖๙ แนวปฏิบัติเกี่ยวกับการใช้สถานที่การกีฬาของศูนย์ควบคุมการบินเชียงใหม่ พ.ศ. ๒๕๖๙',
    OUTSIDER_RULES: 'ใช้ได้เฉพาะสนามเทนนิสและสนามแบดมินตัน ทุกวัน ยกเว้นวันอาทิตย์ เวลา 15.30–20.30 น. ' +
      'และชำระค่าบริการสนามเมื่อใช้ (เทนนิส 100 บาท/คน/ชม. แบดมินตัน 60 บาท/คน/ชม.)',
    MAX_OUTSIDERS: 3,                      // บุคคลภายนอกที่พนักงาน 1 ท่านรับรองได้
    OUTSIDER_CERTIFIER_TYPES: ['พนักงาน'], // ผู้ยื่นที่รับรองบุคคลภายนอกได้
    CERTIFIER_UNIT: 'ศูนย์ควบคุมการบินเชียงใหม่',
    OUTSIDER_RELATIONSHIPS: ['เพื่อน', 'เพื่อนร่วมงาน', 'คนรู้จัก'],
  }, window.APP_CONFIG || {});
  const DEMO = !CFG.API_URL;

  const APPLICANT_TYPES = ['พนักงาน', 'ลูกจ้าง', 'พนักงานเกษียณอายุ'];
  const MEMBERSHIP = ['สมัครใหม่', 'ต่ออายุ'];
  const PURPOSES = [['สมัครใหม่', 'สมัครเข้าเป็นสมาชิกใหม่'], ['ต่ออายุ', 'ต่ออายุสมาชิก']];
  const TH_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
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
  const certText = (seqs) => `ข้าพเจ้าเป็นพนักงาน${CFG.CERTIFIER_UNIT} ขอรับรองว่าข้อความข้างต้นของผู้สมัครประเภทบุคคลภายนอก` +
    `${seqs && seqs.length ? ` ลำดับที่ ${seqs.join(', ')}` : ''} เป็นความจริง โดยผู้สมัครที่ข้าพเจ้านำมาสมัครนี้` +
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
  const curYearBE = () => new Date().getFullYear() + 543;
  const thLong = (iso) => { const p = parts(iso); return p ? `${p.d} ${TH_MONTHS[p.m - 1]} พ.ศ. ${p.y + 543}` : ''; };
  const thShort = (iso) => { const p = parts(iso); return p ? `${p.d}/${p.m}/${p.y + 543}` : ''; };
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

  // Same outsider rules as Code.gs (the server re-checks across all applications).
  function outsiderRuleError(applicantType, outsiderCount) {
    if (!outsiderCount) return '';
    if (!CFG.OUTSIDER_CERTIFIER_TYPES.includes(applicantType)) {
      return `สมาชิกประเภทบุคคลภายนอกต้องมี${CFG.OUTSIDER_CERTIFIER_TYPES.join('/')}${CFG.CERTIFIER_UNIT}เป็นผู้รับรองและยื่นสมัคร`;
    }
    if (outsiderCount > CFG.MAX_OUTSIDERS) return `พนักงาน 1 ท่านรับรองบุคคลภายนอกได้สูงสุด ${CFG.MAX_OUTSIDERS} คน`;
    return '';
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
    const empty = () => ({ applications: [], members: [], seq: {} });
    const load = () => {
      if (mem) return mem;
      try { mem = JSON.parse(kv.get(DEMO_STORE)) || empty(); } catch (e) { mem = empty(); }
      return mem;
    };
    const save = (db) => { mem = db; kv.set(DEMO_STORE, JSON.stringify(db)); };
    return {
      submit(d) {
        const db = load();
        const yearBE = parts(d.formDate).y + 543;
        const outs = d.members.filter(isOutsider);
        const ruleErr = outsiderRuleError(d.applicantType, outs.length);
        if (ruleErr) throw new Error(ruleErr);
        if (outs.length) {
          const key = (s) => String(s || '').replace(/\s+/g, '').toLowerCase();
          const already = new Set(db.members.filter((r) => r.member_type === OUTSIDER && r.year_be === yearBE &&
            key(r.applicant_name) === key(d.applicantName)).map((r) => key(r.full_name)));
          const total = new Set([...already, ...outs.map((m) => key(m.fullName))]);
          if (total.size > CFG.MAX_OUTSIDERS) {
            throw new Error(`พนักงาน 1 ท่านรับรองบุคคลภายนอกได้สูงสุด ${CFG.MAX_OUTSIDERS} คนต่อปี — ปี ${yearBE} ` +
              `ท่านรับรองไปแล้ว ${already.size} คน (รับรองเพิ่มได้อีก ${Math.max(0, CFG.MAX_OUTSIDERS - already.size)} คน)`);
          }
        }
        db.seq[yearBE] = (db.seq[yearBE] || 0) + 1;
        const appId = `${yearBE}-${String(db.seq[yearBE]).padStart(4, '0')}`;
        const f = computeFees(d.members);
        const createdAt = new Date().toISOString();
        const application = {
          app_id: appId, year_be: yearBE, form_date: d.formDate, applicant_name: d.applicantName,
          applicant_type: d.applicantType, department: d.department, position: d.position, purpose: d.purpose,
          member_count: f.count, family_count: f.familyCount, outsider_count: f.outsiderCount,
          new_count: f.newCount, renew_count: f.renewCount, photo_count: d.photoCount,
          member_fee: f.memberFee, card_fee: f.cardFee, facility_fee: f.facilityFee,
          total_fee: f.total, renewed_from: d.renewedFrom || '', created_at: createdAt,
        };
        const members = d.members.map((m, i) => ({
          app_id: appId, seq: i + 1, full_name: m.fullName, age: m.age, address: m.address,
          relationship: m.relationship, member_type: m.memberType, membership: m.membership, year_be: yearBE,
          applicant_name: d.applicantName, department: d.department, created_at: createdAt,
        }));
        db.applications.push(application);
        db.members.push(...members);
        save(db);
        return { ok: true, appId, application, members };
      },
      list() {
        const db = load();
        return { ok: true, applications: db.applications.slice(), members: db.members.slice() };
      },
    };
  })();

  const api = {
    submit: (data) => (DEMO ? Promise.resolve(demo.submit(data)) : call('submit', { data })),
    list: (key) => (DEMO ? Promise.resolve(demo.list()) : call('list', { key })),
  };

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

  function typeCards(name, selected) {
    return MEMBER_TYPE_CARDS.map(([value, title, sub]) =>
      `<label><input type="radio" name="${name}" value="${esc(value)}"${value === selected ? ' checked' : ''}>` +
      `<span class="opt-text"><span class="opt-title">${esc(title)}</span><span class="opt-sub">${esc(sub)}</span></span></label>`).join('');
  }

  function buildStatic() {
    $('#applicant-type').innerHTML = radios('applicantType', APPLICANT_TYPES.map((t) => [t, t]), 'พนักงาน');
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
    form.querySelector('input[name=applicantType][value="พนักงาน"]').checked = true;
    form.querySelector('input[name=purpose][value="สมัครใหม่"]').checked = true;
    delete form.photoCount.dataset.touched;
    $('#renew-note').hidden = true;
    $('#form-error').hidden = true;
    $$('.invalid', form).forEach((el) => el.classList.remove('invalid'));
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
          <span class="member-label">สมาชิกลำดับที่ ${i + 1}</span>
          <div class="member-tools">
            ${i > 0 ? '<button type="button" class="link-btn" data-act="copy-address">ใช้ที่อยู่เดียวกับลำดับที่ 1</button>' : ''}
            ${state.members.length > 1 ? `<button type="button" class="icon-btn" data-act="remove" aria-label="ลบสมาชิกลำดับที่ ${i + 1}">&times;</button>` : ''}
          </div>
        </div>
        <div class="grid">
          <fieldset class="field span-3"><legend class="label">ประเภทสมาชิก</legend>
            <div class="seg cards" data-k="memberType">${typeCards(`mtype-${i}`, m.memberType)}</div>
          </fieldset>
          <label class="field span-2"><span class="label">ชื่อ - สกุล</span>
            <input data-k="fullName" value="${esc(m.fullName)}" maxlength="150" required></label>
          <label class="field"><span class="label">อายุ (ปี)</span>
            <input data-k="age" type="number" min="0" max="120" inputmode="numeric" value="${esc(m.age)}" required></label>
          <label class="field span-3"><span class="label">สถานที่อยู่อาศัย / ทำงานในปัจจุบัน (ที่สามารถติดต่อได้)</span>
            <textarea data-k="address" rows="2" maxlength="400" required>${esc(m.address)}</textarea></label>
          <fieldset class="field span-3"><legend class="label">ฐานะที่เกี่ยวข้องกับผู้ยื่น</legend>
            <div class="seg small chips" data-k="relationship">${radios(`rel-${i}`,
              relOptions(m).map((v) => [v, v]).concat([[REL_OTHER, 'อื่น ๆ']]), relChoice(m))}</div>
            <input data-k="relationshipOther" class="rel-other" placeholder="ระบุฐานะที่เกี่ยวข้อง" maxlength="150"
              value="${relChoice(m) === REL_OTHER ? esc(m.relationship) : ''}"${relChoice(m) === REL_OTHER ? '' : ' hidden'}>
          </fieldset>
          <fieldset class="field span-3"><legend class="label">สมาชิกภาพ</legend>
            <div class="seg small" data-k="membership">${radios(`membership-${i}`, MEMBERSHIP.map((v) => [v, v]), m.membership)}</div>
          </fieldset>
        </div>
      </div>`).join('');
    $('#add-member').hidden = state.members.length >= max;
    updateCountsAndFees();
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
    if (!form.photoCount.dataset.touched) form.photoCount.value = n * 2;
    const f = computeFees(state.members);
    $('#fees').innerHTML = `
      <tr><td>ค่าจัดทำบัตรสมาชิก <span class="calc">${CFG.CARD_FEE} บาท/คน/ปี × ${f.cardPeople} คน${CFG.CARD_FEE_ON_RENEW ? '' : ' (เฉพาะสมัครใหม่)'}</span></td><td>${baht(f.cardFee)} บาท</td></tr>
      <tr><td>เงินค่าสมาชิก <span class="calc">${CFG.MEMBER_FEE} บาท/คน/ปี × ${f.outsiderCount} คน (เฉพาะบุคคลภายนอก)</span></td><td>${baht(f.memberFee)} บาท</td></tr>
      ${CFG.FACILITY_FEE ? `<tr><td>ค่าบริการสถานที่การกีฬา <span class="calc">${CFG.FACILITY_FEE} บาท/คน × ${f.outsiderCount} คน (เฉพาะบุคคลภายนอก)</span></td><td>${baht(f.facilityFee)} บาท</td></tr>` : ''}
      <tr class="total"><td>รวมทั้งสิ้น</td><td>${baht(f.total)} บาท</td></tr>`;
    $('#member-count').textContent = `${n} / ${CFG.MAX_MEMBERS} คน` +
      (f.outsiderCount ? ` · บุคคลภายนอก ${f.outsiderCount}/${CFG.MAX_OUTSIDERS}` : '');
    // คำรับรอง is only for outsiders (ข้อ ๖.๓)
    const seqs = state.members.map((m, i) => (isOutsider(m) ? i + 1 : 0)).filter(Boolean);
    $('#cert-card').hidden = !seqs.length;
    $('#cert-text').textContent = certText(seqs);
    if (!seqs.length) form.agree.checked = false;
    updateTypeHint();
  }

  // Warn early when the chosen ประเภทผู้ยื่น cannot certify outsiders.
  function updateTypeHint() {
    const type = (form.querySelector('input[name=applicantType]:checked') || {}).value || '';
    const hasOut = state.members.some(isOutsider);
    const hint = $('#type-hint');
    const msg = hasOut && !CFG.OUTSIDER_CERTIFIER_TYPES.includes(type) ? outsiderRuleError(type, 1) : '';
    hint.textContent = msg;
    hint.hidden = !msg;
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
        $('#applicant-type').classList.remove('invalid');
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
          if (!m.memberType && FAMILY_RELATIONSHIPS.includes(t.value)) { // picking คู่สมรส/บุตร… implies family
            m.memberType = FAMILY;
            renderMembers();
          }
        }
      } else {
        m.membership = t.value;
        updateCountsAndFees();
      }
      return;
    }
    const k = t.dataset.k;
    if (k === 'relationshipOther') m.relationship = t.value;
    else if (k) m[k] = t.value;
  }

  function onMembersClick(e) {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const i = Number(btn.closest('.member').dataset.i);
    if (btn.dataset.act === 'remove') {
      state.members.splice(i, 1);
      renderMembers();
    } else if (btn.dataset.act === 'copy-address') {
      state.members[i].address = state.members[0].address;
      const ta = btn.closest('.member').querySelector('[data-k=address]');
      ta.value = state.members[i].address;
      ta.classList.remove('invalid');
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
      applicantType: checked('applicantType'),
      department: canonicalDept(form.department.value),
      position: canonicalPosition(form.position.value),
      purpose: checked('purpose'),
      photoCount: int(form.photoCount.value),
      renewedFrom: state.renewedFrom || '',
      members: state.members.map((m) => ({
        fullName: String(m.fullName).trim(), age: int(m.age), address: String(m.address).trim(),
        relationship: String(m.relationship).trim(), memberType: m.memberType, membership: m.membership,
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
    if (!d.applicantType) bad($('#applicant-type'), 'กรุณาเลือกประเภทผู้ยื่น');
    if (!d.department) bad(form.department, 'กรุณากรอกสังกัด');
    if (!d.purpose) bad($('#purpose'), 'กรุณาเลือกความประสงค์');
    d.members.forEach((m, i) => {
      const card = $(`.member[data-i="${i}"]`);
      const f = (k) => card.querySelector(`[data-k=${k}]`);
      const n = i + 1;
      if (!m.fullName) bad(f('fullName'), `กรุณากรอกชื่อ - สกุล สมาชิกลำดับที่ ${n}`);
      if (m.age === '' || !Number.isInteger(m.age) || m.age < 0 || m.age > 120) bad(f('age'), `อายุของสมาชิกลำดับที่ ${n} ไม่ถูกต้อง`);
      if (!m.address) bad(f('address'), `กรุณากรอกที่อยู่ของสมาชิกลำดับที่ ${n}`);
      if (!m.relationship) {
        bad(relChoice(state.members[i]) === REL_OTHER ? f('relationshipOther') : f('relationship'),
          `กรุณาเลือกฐานะของสมาชิกลำดับที่ ${n}`);
      }
      if (!MEMBER_TYPES.some(([v]) => v === m.memberType)) bad(f('memberType'), `กรุณาเลือกประเภทสมาชิกลำดับที่ ${n}`);
      if (!MEMBERSHIP.includes(m.membership)) bad(f('membership'), `กรุณาเลือกสมาชิกภาพลำดับที่ ${n}`);
    });
    const outsiderCount = d.members.filter(isOutsider).length;
    const ruleErr = outsiderRuleError(d.applicantType, outsiderCount);
    if (ruleErr && !CFG.OUTSIDER_CERTIFIER_TYPES.includes(d.applicantType)) bad($('#applicant-type'), ruleErr);
    else if (ruleErr) errors.push({ el: $('#members'), msg: ruleErr });
    [['photoCount', 'จำนวนรูปถ่าย']].forEach(([k, label]) => {
      if (!Number.isInteger(d[k]) || d[k] < 0 || d[k] > 100) bad(form[k], `${label}ไม่ถูกต้อง`);
    });
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

  function prefillRenewal(appId) {
    const app = reg.appsById[appId];
    if (!app) return;
    const ms = (reg.membersByApp[appId] || []).slice().sort((a, b) => a.seq - b.seq).slice(0, CFG.MAX_MEMBERS);
    const diff = Math.max(0, curYearBE() - Number(app.year_be));
    startNewForm();
    form.applicantName.value = app.applicant_name || '';
    const t = form.querySelector(`input[name=applicantType][value="${app.applicant_type}"]`);
    if (t) t.checked = true;
    form.department.value = canonicalDept(app.department);
    updateDeptHint();
    form.position.value = canonicalPosition(app.position);
    updatePosHint();
    form.querySelector('input[name=purpose][value="ต่ออายุ"]').checked = true;
    state.members = ms.map((m) => ({
      fullName: m.full_name, age: m.age === '' ? '' : Number(m.age) + diff, address: m.address,
      relationship: m.relationship, membership: 'ต่ออายุ',
      memberType: MEMBER_TYPES.some(([v]) => v === m.member_type) ? m.member_type : '',
    }));
    if (!state.members.length) state.members = [blankMember('ต่ออายุ')];
    state.renewedFrom = appId;
    renderMembers();
    const note = $('#renew-note');
    note.textContent = `ต่ออายุจากใบสมัครเลขที่ ${appId} (ปี ${app.year_be})` +
      (diff ? ` · ปรับอายุสมาชิกเพิ่ม ${diff} ปีแล้ว` : '') + ' — ตรวจสอบข้อมูลก่อนบันทึก';
    note.hidden = false;
    switchView('form');
    toast('โหลดข้อมูลสำหรับต่ออายุแล้ว');
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
    const outSeqs = ms.filter(isOutsider).map((m) => m.seq);
    const rows = Array.from({ length: CFG.MAX_MEMBERS }, (_, i) => {
      const m = ms[i];
      const types = [[FAMILY, 'ครอบครัว'], [OUTSIDER, 'บุคคลภายนอก']]
        .map(([v, l]) => `<span class="opt">${box(m && m.member_type === v)}${l}</span>`).join('');
      const rel = `<span class="sep"></span><span class="val">${m ? esc(m.relationship) : ''}</span>`;
      const opts = MEMBERSHIP.map((v) => `<span class="opt">${box(m && m.membership === v)}${v}</span>`).join('');
      return m
        ? `<tr><td class="c">${i + 1}.</td><td class="val">${esc(m.full_name)}</td><td class="c val">${esc(m.age)}</td>
             <td class="val">${esc(m.address)}</td><td>${types}${rel}</td><td>${opts}</td><td></td></tr>`
        : `<tr><td class="c">${i + 1}.</td><td></td><td></td><td></td><td>${types}${rel}</td><td>${opts}</td><td></td></tr>`;
    }).join('');

    const page1 = `
      <section class="pf-page">
        <div class="pf-title">ใบสมัครสมาชิกวิทยุการบิน</div>
        <div class="pf-subtitle">ตาม${esc(CFG.RULE_REF)}</div>
        <div class="pf-top">
          <div class="pf-top-left">
            <div class="pf-row">วันที่ ${fill(p.d, '14mm')} เดือน ${fill(TH_MONTHS[p.m - 1], '32mm')} พ.ศ. ${fill(p.y ? p.y + 543 : '', '18mm')}</div>
            <div class="pf-row">ชื่อ - สกุล ${fill(app.applicant_name, '', 'grow')}</div>
            <div class="pf-row">${APPLICANT_TYPES.map((t) => `<span class="pf-opt">${box(app.applicant_type === t)}${t}</span>`).join('')}</div>
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
          <colgroup><col style="width:7%"><col style="width:20%"><col style="width:7%"><col style="width:23%"><col style="width:17%"><col style="width:13%"><col style="width:13%"></colgroup>
          <thead><tr><th>ลำดับ</th><th>ชื่อ - สกุล</th><th>อายุ</th><th>สถานที่อยู่อาศัย /<br>ทำงานในปัจจุบัน<br>(ที่สามารถติดต่อได้)</th>
            <th>ประเภท /<br>ฐานะที่เกี่ยวข้อง<br>กับผู้ยื่น</th><th>สมาชิกภาพ</th><th>ลายมือชื่อ<br>ผู้สมัคร</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        ${foot(1)}
      </section>`;

    const page2 = `
      <section class="pf-page">
        ${outSeqs.length ? `<div class="pf-h2">คำรับรองของพนักงานผู้รับรอง (สมาชิกประเภทที่ ๓ บุคคลภายนอก)</div>
        <p class="pf-cert">${esc(certText(outSeqs))}</p>` : '<div class="pf-h2">รูปถ่ายและค่าธรรมเนียม</div>'}
        <p class="pf-cert">พร้อมนี้ ข้าพเจ้าได้แนบรูปถ่ายและค่าธรรมเนียมในการสมัครเป็นสมาชิก มาดังนี้</p>
        <table class="pf-attach">
          <tr><td class="n">1.</td><td>รูปถ่ายขนาด 1 นิ้ว หน้าตรง ไม่สวมหมวก ของผู้สมัครคนละ 2 รูป</td><td class="amt">จำนวน ${fill(app.photo_count, '26mm')} ใบ</td></tr>
          <tr><td class="n">2.</td><td>ค่าจัดทำบัตรสมาชิก ${CFG.CARD_FEE} บาท/คน/ปี (สมาชิกประเภท ๒ และ ๓)</td><td class="amt">รวมเป็นเงิน ${fill(baht(app.card_fee), '26mm')} บาท</td></tr>
          <tr><td class="n">3.</td><td>ค่าสมาชิก ${CFG.MEMBER_FEE} บาท/คน/ปี (เฉพาะสมาชิกประเภท ๓)</td><td class="amt">รวมเป็นเงิน ${fill(baht(app.member_fee), '26mm')} บาท</td></tr>
          ${Number(app.facility_fee) ? `<tr><td class="n">4.</td><td>ค่าบริการสถานที่การกีฬา (เฉพาะสมาชิกประเภท ๓)</td><td class="amt">รวมเป็นเงิน ${fill(baht(app.facility_fee), '26mm')} บาท</td></tr>` : ''}
        </table>
        <p class="pf-note">หมายเหตุ: ${esc(usageNote(outSeqs.length > 0))}</p>
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
    root.style.cssText = '';
  }

  function printApplication(app, members) {
    const root = $('#print-root');
    root.innerHTML = renderPrint(app, members);
    const go = () => { fitPrintFields(root); window.print(); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(go); else go();
  }

  // ================================================================== REGISTRY
  const reg = { loaded: false, loading: false, rows: [], apps: [], appsById: {}, membersByApp: {} };

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

    const keepYear = $('#f-year').value;
    const keepDept = $('#f-dept').value;
    const years = Array.from(new Set(rows.map((x) => x.year_be))).sort((a, b) => b - a);
    const depts = Array.from(new Set(rows.map((x) => x.department).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'th'));
    $('#f-year').innerHTML = '<option value="">ทุกปี</option>' + years.map((y) => `<option value="${y}">ปี ${y}</option>`).join('');
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
    $('#tiles').innerHTML = `
      <div class="tile"><div class="tile-label">สมาชิกปี ${cur}</div><div class="tile-value">${curRows.length}</div><div class="tile-sub">ครอบครัว ${curRows.length - curOut} · บุคคลภายนอก ${curOut}</div></div>
      <div class="tile"><div class="tile-label">สมัครใหม่ / ต่ออายุ</div><div class="tile-value">${newCount} / ${curRows.length - newCount}</div><div class="tile-sub">ปี ${cur}</div></div>
      <div class="tile${renewCount ? ' warn' : ''}"><div class="tile-label">ต้องต่ออายุ</div><div class="tile-value">${renewCount}</div><div class="tile-sub">สมาชิกปีก่อนที่ยังไม่ต่อ</div></div>
      <div class="tile"><div class="tile-label">ค่าธรรมเนียมปี ${cur}</div><div class="tile-value">${baht(fees)}</div><div class="tile-sub">บาท จาก ${curApps.length} ใบสมัคร</div></div>`;

    const rows = filteredRows();
    const LIMIT = 500;
    const body = rows.slice(0, LIMIT).map((x) => {
      const [cls, label] = STATUS[x.status];
      const canRenew = x.year_be < cur;
      return `<tr>
        <td><span class="app-chip">${esc(x.app_id)}</span><span class="sub">ลำดับ ${x.seq} · ${esc(thShort(x.form_date))}</span></td>
        <td><strong>${esc(x.full_name)}</strong><span class="sub">${esc(x.relationship)} · ${esc(x.age)} ปี</span></td>
        <td class="addr">${esc(x.address)}</td>
        <td class="nowrap">${x.member_type ? `<span class="badge ${isOutsider(x) ? 'type-out' : 'type-fam'}">${esc(x.member_type)}</span>` : '—'}<span class="sub">${esc(x.membership)}</span></td>
        <td>${esc(x.applicant_name)}<span class="sub">${esc(x.applicant_type)} · ${esc(x.department)}</span></td>
        <td><span class="badge ${cls}">${label}</span></td>
        <td><div class="row-actions">
          <button type="button" class="btn btn-ghost btn-sm" data-act="print" data-app="${esc(x.app_id)}">พิมพ์</button>
          ${canRenew ? `<button type="button" class="btn btn-ghost btn-sm" data-act="renew" data-app="${esc(x.app_id)}">ต่ออายุ</button>` : ''}
        </div></td></tr>`;
    }).join('');
    $('#reg-table').innerHTML = `
      <thead><tr><th>เลขที่ใบสมัคร</th><th>สมาชิก</th><th>ที่อยู่ / ที่ทำงาน</th><th>ประเภท / สมาชิกภาพ</th><th>ผู้ยื่น / ผู้รับรอง</th><th>สถานะ</th><th></th></tr></thead>
      <tbody>${body || `<tr><td class="empty" colspan="7">${reg.rows.length ? 'ไม่พบรายการที่ตรงกับตัวกรอง' : 'ยังไม่มีข้อมูลสมาชิก'}</td></tr>`}</tbody>`;
    $('#reg-count').textContent = `แสดง ${Math.min(rows.length, LIMIT).toLocaleString('th-TH')} จาก ${reg.rows.length.toLocaleString('th-TH')} รายการ` +
      (rows.length > LIMIT ? ` (ใช้ตัวกรองเพื่อดูรายการที่เหลือ หรือส่งออก CSV)` : '');
  }

  function exportCsv() {
    const rows = filteredRows();
    if (!rows.length) { toast('ไม่มีข้อมูลให้ส่งออก', true); return; }
    const head = ['เลขที่ใบสมัคร', 'ปี พ.ศ.', 'วันที่ยื่น', 'ลำดับ', 'ชื่อ - สกุลสมาชิก', 'อายุ', 'ที่อยู่ / ที่ทำงาน', 'ฐานะ',
      'ประเภทสมาชิก', 'สมาชิกภาพ', 'ผู้ยื่น', 'ประเภทผู้ยื่น', 'สังกัด', 'ตำแหน่งผู้ยื่น', 'สถานะ'];
    const cell = (v) => {
      let s = String(v == null ? '' : v);
      if (/^[=+\-@]/.test(s)) s = "'" + s; // stop formula injection when opened in Excel
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [head].concat(rows.map((x) => [x.app_id, x.year_be, thShort(x.form_date), x.seq, x.full_name, x.age,
    x.address, x.relationship, x.member_type || '', x.membership, x.applicant_name, x.applicant_type, x.department, x.position, STATUS[x.status][1]]));
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
    }
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
      if (e.target === form.photoCount) e.target.dataset.touched = '1';
      if (!e.target.closest('.member')) {
        e.target.classList.remove('invalid');
        const seg = e.target.closest('.seg, .check');
        if (seg) seg.classList.remove('invalid');
      }
    });
    form.addEventListener('change', (e) => {
      if (e.target.name === 'applicantType') updateTypeHint();
      if (e.target.name === 'purpose') {
        // switching the overall purpose sets every member to the same membership type
        const v = e.target.value;
        state.members.forEach((m) => { m.membership = v; });
        renderMembers();
      }
    });
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