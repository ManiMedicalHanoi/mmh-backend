/* ════════════════════════════════════════════════════════════════════
   MMH KPI FY68  ·  KpiThdFix.gs                                   v1.0 (11/11/2026)
   KPI DENTAL THAILAND theo file "20261104_MMH_KPI_Dental_Thailand_FY68_v3_OY_Filled" (Owen san điền sau buổi họp 04/11/2026;
   chị Nguyen Ha yêu cầu cập nhật vào file KPI công ty + file quản lý của nhóm Thailand Dental).
   ────────────────────────────────────────────────────────────────────
   ?action=thdKpi&key=<8 ký tự cuối ID file KPI>[&op=status|dry|run|sync]
     · status (mặc định) — CHỈ ĐỌC: dòng 3. Detail KPI + trọng số 5A của Yong · Man · Sui
     · dry  — liệt kê ô sẽ đổi (không ghi)
     · run  — ghi: 3. Detail KPI (tên · đơn vị · cách cộng · file tham chiếu · Target 12 tháng + FY), 2. MMH KPI (C16),
              3B. KPI Source Map, 4. Rule (khối DENTAL THAILAND). Số Actual cũ của C2-02 (tỷ lệ % của KPI cũ) bị xoá.
     · sync — đọc lại nguồn Sự kiện Dental Thái + CRM Thailand Dental và GHI ĐÈ cả tháng đã chốt (1 lần, như menu 🔓)
   Trọng số (5A) đã đúng với file của Owen san ⇒ không đổi. KBI (L3-20/21/22) không đổi.
   ════════════════════════════════════════════════════════════════════ */
var KTD = {
  KEY: '1m3F8NEI1QuvzFnpHVrvQ903R1lNQvm_qRkgSI5mBkx0',
  /* 3. Detail KPI — Target 12 tháng (09/2026 → 08/2027) đúng file của Owen san */
  DETAIL: {
    'F4-00': { t: [0, 0, 62559, 71118, 79677, 142336, 150895, 159454, 219913, 228472, 237031, 265572] },
    'C2-01': { t: [2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3], fy: 30 },
    'C2-02': { name: 'Number of Visits to Distributor Key Accounts – Dental Thailand', unit: 'Times', agg: 'SUM',
               ref: 'Thailand Dental - Sale Action Report FY68 (CUSTOMER TASK · key accounts = ACCOUNT TRACKING ▸ Key account = Yes)',
               t: [6, 6, 6, 6, 9, 9, 9, 9, 9, 9, 9, 9], fy: 96, clearActual: true },
    'C4-01': { ref: 'Thailand Dental - Sale Action Report FY68 (visit type: Co-visiting with distributor · Event/Co-visiting with distributor)',
               t: [15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15], fy: 180 },
    'C4-03': { ref: 'Thailand Dental - Sale Action Report FY68 (visit type: Co-visiting with distributor · days with at least 5 visits)',
               t: [6, 6, 6, 6, 7, 7, 7, 7, 7, 7, 7, 7], fy: 80 },
    'C11-02': { ref: 'Thailand Dental - Action & Event Report FY68 (PRODUCT PRESENTATION) + 2. Thailand - Dental Event Report (MMH-led events)',
                t: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3], fy: 25 },
    'C11-03': { t: [0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6], fy: 0.6 },
    'C14-00': { ref: '2. Thailand - Dental Event Report (REPORT_EVENT) + PRODUCT PRESENTATION sessions not in the event file',
                t: [2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3], fy: 30 },
    'C16-00': { name: 'Number of Participants in T&E Events – Dental Thailand', unit: 'Participants', agg: 'SUM',
                ref: '2. Thailand - Dental Event Report (REPORT_EVENT ▸ Actual Participant)',
                t: [20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20], fy: 240, clearActual: true },
    'C17-07': { t: [6, 6, 6, 6, 8, 8, 8, 8, 10, 10, 12, 12], fy: 108 }
  },
  /* 3B. KPI Source Map — [Actual Source, Calculation Method / Status] */
  SRC: {
    'C2-01': ['CRM Thailand Dental · NEW ACCOUNT & SKU', 'Cases of key accounts (DSO, dental university, hospital) by PIC + month of the first order. Required information fixed (4 Nov 2026), evidence = distributor confirmation by email, no approval request to Owen san.'],
    'C2-02': ['CRM Thailand Dental · CUSTOMER TASK + ACCOUNT TRACKING', 'Visits of Yong (Visiting / Co-visiting / Event/Co-visiting, not Cancel / Not Started) to the accounts with Key account = Yes in ACCOUNT TRACKING (list defined by Yong). Detailed counting rule to be confirmed.'],
    'C4-01': ['CRM Thailand Dental · CUSTOMER TASK', 'Visits of Yong with visit type "Co-visiting with distributor" or "Event/Co-visiting with distributor", not Cancel / Not Started, date ≤ today.'],
    'C4-03': ['CRM Thailand Dental · CUSTOMER TASK', 'Days of Man with at least 5 visits of type "Co-visiting with distributor" (a day with fewer than 5 visits does not count).'],
    'C11-02': ['Event Dental Thailand (REPORT_EVENT) + CRM Thailand Dental · PRODUCT PRESENTATION', 'MMH-led events of the event file + PRODUCT PRESENTATION sessions (Actual > 0) not on the date of an event of the event file — counted once.'],
    'C11-03': ['CRM Thailand Dental · PRODUCT TEST', 'Pass ÷ tests with a result, from the start of the FY (one row = one test of one distributor sales rep, Google Form result link as evidence). Target 60%.'],
    'C14-00': ['Event Dental Thailand (REPORT_EVENT) + CRM Thailand Dental · PRODUCT PRESENTATION', 'Events led by KOLs, MMH members and exhibitions (Action Status As planned / Additional / Change schedule) + PRODUCT PRESENTATION sessions not in the event file.'],
    'C16-00': ['Event Dental Thailand (REPORT_EVENT ▸ Actual Participant)', 'Sum of Actual Participant of the counted events, by Month. Working rule until the detailed rule is confirmed.'],
    'C17-07': ['Thailand Dental - Digital Plan FY68 (typed in the KPI file)', 'Content items published, sum of the months. Monthly targets fixed by Owen san (4 Nov 2026).']
  },
  MARK: 'agreed 4 Nov 2026'
};
/* khối DENTAL THAILAND của 4. Rule (cột E, tiếng Anh) */
KTD.RULE = {
  C2: 'DENTAL THAILAND  ·  C2-01 Key Accounts (Yong)\n1. Explanation\n• Key account = DSO, dental university or hospital (private / public).\n' +
      '• New key account = opened by DDI, Promptdent or VRP in FY68 with Yong\'s support.\n2. Conditions\n' +
      '• Required information is fixed (agreed 4 Nov 2026). No approval request to Owen san.\n' +
      '• Evidence: data exported monthly and confirmed by the distributor via email.\n• Counted by PIC and month of the first order. Max 130% (month, quarter, FY).\n\n' +
      'DENTAL THAILAND  ·  C2-02 Visits to Distributor Key Accounts (Yong)\n1. Explanation\n' +
      '• Replaces "Key Account Profiling Coverage Rate – Top 20% Distributor Key Accounts" (agreed 4 Nov 2026).\n' +
      '• Counts visits to the distributor key accounts. The key account list is defined by Yong (CRM ▸ ACCOUNT TRACKING ▸ Key account = Yes).\n' +
      '2. Conditions\n• Recorded in the Sale Action Report (CUSTOMER TASK), visit type Visiting, Co-visiting with distributor or Event/Co-visiting with distributor.\n' +
      '• Detailed counting rule to be confirmed. Max 130% (month, quarter, FY).',
  C4: 'DENTAL THAILAND  ·  C4-01 Co-visits, commercial support (Yong)\n1. Explanation\n' +
      '• Co-visit = customer visit TOGETHER WITH a distributor rep; Yong gives the rep commercial training.\n' +
      '• Focus: manage the distributors and push sell-in. Field visits with customers approached at events also count.\n2. Conditions\n' +
      '• Recorded in the Sale Action Report with visit type "Co-visiting with distributor" or "Event/Co-visiting with distributor" (agreed 4 Nov 2026; not an end-user visit).\n' +
      '• Max 130% (month, quarter, FY).\n\n' +
      'DENTAL THAILAND  ·  C4-03 Co-visiting days, field training (Man)\n1. Explanation\n' +
      '• Co-visiting day = a full field day with ONE distributor rep, at least 5 customer visits.\n' +
      '• Goal: train the rep, focus on sell-out (Yong\'s co-visits focus on sell-in).\n2. Conditions\n• A day with fewer than 5 visits does not count.\n' +
      '• Recorded in the Sale Action Report, visit type "Co-visiting with distributor".\n• Counted in DAYS, not visits. Max 130% (month, quarter, FY).',
  C11: 'DENTAL THAILAND  ·  C11-02 · C11-03 (Man) · C14-00 (Sui)\n' +
      '• C11-02 = T&E events led by MMH members: product presentation, product demonstration or case demonstration. Log them in PRODUCT PRESENTATION (CRM); ' +
      'training for internal staff, distributors or dealers goes to the MMH Training file. MMH-led events of the Dental Event Report also count; a session in both places on the same date is counted once.\n' +
      '• C11-03 = Pass ÷ tests with a result (PRODUCT TEST: one row = one test of one distributor sales rep, Result Pass / Fail, Google Form result as evidence), from the start of the FY. Target 60%.\n' +
      '• C14-00 = T&E events led by KOLs, MMH members and exhibitions (Dental Event Report) + the C11-02 sessions. Each event has ONE main type and is counted ONCE. Target fixed at 30 first, adjusted from Q2 (agreed 4 Nov 2026).\n' +
      'Max 130% (month, quarter, FY).',
  C16: 'DENTAL THAILAND  ·  C16-00 Participants in T&E events (Sui)\n1. Explanation\n' +
      '• Replaces "Number of New Product Categories Launched" (agreed 4 Nov 2026). Weight unchanged (30%).\n' +
      '• Counts participants in the T&E events of Dental Thailand.\n2. Conditions\n' +
      '• Working rule until the detailed rule is confirmed: sum of "Actual Participant" of the counted events in REPORT_EVENT of the Dental Event Report (Action Status As planned / Additional / Change schedule), by Month.\n' +
      '• Max 130% (month, quarter, FY).',
  C17: 'DENTAL THAILAND  ·  C17-07 Product content items published (Sui)\n' +
      '• Counted only from the plan and report file Thailand Dental - Digital Plan FY68; count = sum of the months. Monthly targets fixed by Owen san (4 Nov 2026). Max 130% (month, quarter, FY).'
};

function kscThdApi_(p) {
  if (String(p.key || '') !== KTD.KEY.slice(-8)) return { ok: false, error: 'key' };
  var op = String(p.op || 'status'), ss = SpreadsheetApp.getActive() || SpreadsheetApp.openById(KTD.KEY);
  if (op === 'sync') return ktdSync_(ss);
  if (op === 'status') return ktdStatus_(ss);
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return { ok: false, error: 'busy' };
  try { return ktdPatch_(ss, op !== 'run'); } finally { lock.releaseLock(); }
}

/* ── ĐỌC: dòng 3. Detail KPI + 5A của 3 bạn ── */
function ktdStatus_(ss) {
  var ctx = kscCtx_(ss), L = ctx.L, H = L.H, out = { ok: true, rows: {}, weights: [] };
  var cN = H['detail kpi'], cU = H['unit'], cA = H['agg'], cR = H['reference file for calculation'];
  Object.keys(KTD.DETAIL).concat(['L3-20', 'L3-21', 'L3-22']).forEach(function (code) {
    var r = L.rows[code]; if (r == null) { out.rows[code] = 'không có dòng'; return; }
    out.rows[code] = { name: String(L.V[r][cN]).trim(), unit: L.V[r][cU], agg: L.V[r][cA], ref: cR == null ? '' : L.V[r][cR],
      t: L.months.map(function (m) { return L.V[r][L.tCol[m]]; }), a: L.months.map(function (m) { return L.V[r][L.aCol[m]]; }),
      fyT: L.fyT >= 0 ? (L.F[r][L.fyT] ? 'formula' : L.V[r][L.fyT]) : '' };
  });
  try {
    var w = ss.getSheetByName('5A. KPI Weight Input'), V = w.getRange(5, 2, w.getLastRow() - 4, 10).getValues(), who = '';
    V.forEach(function (x) { var m = String(x[0] || '').trim(); if (m) who = m; if (['Yong', 'Man', 'Sui'].indexOf(who) >= 0 && (x[9] || x[1])) out.weights.push([who, String(x[9] || x[1]), x[4], x[5], x[6], x[7]]); });
  } catch (e) { out.weightsErr = String(e); }
  out.done = PropertiesService.getScriptProperties().getProperty('KTD_DONE') || '';
  return out;
}

/* ── GHI (dry = chỉ liệt kê) ── */
function ktdPatch_(ss, dry) {
  var ctx = kscCtx_(ss), L = ctx.L, H = L.H, sh = ctx.sh, ch = [];
  var cN = H['detail kpi'], cU = H['unit'], cA = H['agg'], cR = H['reference file for calculation'];
  function put(rg, v, what) {
    var cur = rg.getValue(), f = rg.getFormula();
    if (f) { ch.push(what + ': giữ công thức'); return; }
    if (String(cur) === String(v)) return;
    ch.push(what + ': ' + String(cur).slice(0, 50) + ' → ' + String(v).slice(0, 60));
    if (!dry) rg.setValue(v);
  }
  /* ① 3. Detail KPI */
  Object.keys(KTD.DETAIL).forEach(function (code) {
    var d = KTD.DETAIL[code], r = L.rows[code];
    if (r == null) { ch.push(code + ': ⚠ không có dòng ở 3. Detail KPI'); return; }
    if (d.name) { var pre = (String(L.V[r][cN]).match(/^\s*/) || [''])[0]; put(sh.getRange(r + 1, cN + 1), pre + d.name, code + ' tên'); }
    if (d.unit) put(sh.getRange(r + 1, cU + 1), d.unit, code + ' đơn vị');
    if (d.agg) put(sh.getRange(r + 1, cA + 1), d.agg, code + ' Agg');
    if (d.ref && cR != null) put(sh.getRange(r + 1, cR + 1), d.ref, code + ' file tham chiếu');
    if (d.t) L.months.forEach(function (m, i) { if (d.t[i] != null && L.tCol[m] != null) put(sh.getRange(r + 1, L.tCol[m] + 1), d.t[i], code + ' Target ' + m); });
    if (d.fy != null && L.fyT >= 0) put(sh.getRange(r + 1, L.fyT + 1), d.fy, code + ' FY68 Target');
    if (d.clearActual) L.months.forEach(function (m) {
      var c = L.aCol[m]; if (c == null) return;
      var v = L.V[r][c], f = L.F[r][c];
      if (!f && v !== '' && v !== null) { ch.push(code + ' Actual ' + m + ': ' + v + ' (KPI cũ) → trống'); if (!dry) sh.getRange(r + 1, c + 1).setValue(''); }
    });
  });
  /* ② 2. MMH KPI — dòng nhóm C16 */
  try {
    var k2 = ss.getSheetByName('2. MMH KPI'), V2 = k2.getRange(1, 1, Math.min(k2.getLastRow(), 80), 12).getValues(), hr = -1, C2 = {};
    V2.forEach(function (x, i) { if (hr < 0 && x.some(function (y) { return kscNorm_(y) === 'kpi measure'; })) { hr = i; x.forEach(function (y, k) { C2[kscNorm_(y)] = k; }); } });
    V2.forEach(function (x, i) {
      if (i <= hr || String(x[C2['code']] || '').trim() !== 'C16') return;
      put(k2.getRange(i + 1, C2['kpi measure'] + 1), 'Number of Participants in T&E Events – Dental Thailand', '2. MMH KPI C16 measure');
      put(k2.getRange(i + 1, C2['unit'] + 1), 'Participants', '2. MMH KPI C16 unit');
    });
  } catch (e2) { ch.push('2. MMH KPI: ⚠ ' + e2); }
  /* ③ 3B. KPI Source Map */
  try {
    var sm = ss.getSheetByName('3B. KPI Source Map'), V3 = sm.getRange(1, 1, sm.getLastRow(), 5).getValues();
    V3.forEach(function (x, i) {
      var s = KTD.SRC[String(x[1] || '').trim()]; if (!s || i < 4) return;
      put(sm.getRange(i + 1, 4), s[0], '3B ' + x[1] + ' nguồn');
      put(sm.getRange(i + 1, 5), s[1], '3B ' + x[1] + ' cách tính');
    });
  } catch (e3) { ch.push('3B: ⚠ ' + e3); }
  /* ④ 4. Rule — khối DENTAL THAILAND */
  try {
    var ru = ss.getSheetByName('4. Rule'), V4 = ru.getRange(1, 1, Math.min(ru.getLastRow(), 60), 6).getValues();
    V4.forEach(function (x, i) {
      var grp = String(x[2] || ''), D = String(x[3] || ''), E = String(x[4] || ''), nE = E, nD = D;
      if (/^Sales – New Customer Accounts/.test(grp)) {
        nD = D.replace(/C2-02\s+Key Account Profiling Coverage Rate[^\n]*/, 'C2-02  Visits to Distributor Key Accounts – Dental Thailand');
        nE = E.indexOf('DENTAL THAILAND  ·  C2-01') >= 0 ? E.slice(0, E.indexOf('DENTAL THAILAND  ·  C2-01')) + KTD.RULE.C2 : E + '\n\n' + KTD.RULE.C2;
      } else if (/^Sales – Customer Visits/.test(grp)) {
        nE = E.indexOf('DENTAL THAILAND  ·  C4-01') >= 0 ? E.slice(0, E.indexOf('DENTAL THAILAND  ·  C4-01')) + KTD.RULE.C4 : E + '\n\n' + KTD.RULE.C4;
      } else if (/^Marketing – Event Number/.test(grp)) {
        nE = E.indexOf('DENTAL THAILAND  ·  C11-02') >= 0 ? E.slice(0, E.indexOf('DENTAL THAILAND  ·  C11-02')) + KTD.RULE.C11 : E.replace(/\s+$/, '') + '\n\n' + KTD.RULE.C11;
      } else if (/^Marketing – New Product Launch/.test(grp)) {
        nD = D.replace(/C16-00\s+New Product Categories Launched[^\n]*/, 'C16-00  Participants in T&E Events – Dental Thailand');
        nE = KTD.RULE.C16;
      } else if (/^Marketing – Digital & Design/.test(grp)) {
        nE = E.indexOf('DENTAL THAILAND  ·  C17-07') >= 0 ? E.slice(0, E.indexOf('DENTAL THAILAND  ·  C17-07')) + KTD.RULE.C17 : E.replace(/\s+$/, '') + '\n\n' + KTD.RULE.C17;
      } else return;
      nE = nE.replace(/\n{3,}/g, '\n\n');
      if (nD !== D) put(ru.getRange(i + 1, 4), nD, '4. Rule ' + grp.split('\n')[0] + ' (danh sách mã)');
      if (nE !== E) put(ru.getRange(i + 1, 5), nE, '4. Rule ' + grp.split('\n')[0] + ' (rule)');
    });
  } catch (e4) { ch.push('4. Rule: ⚠ ' + e4); }
  if (!dry) {
    SpreadsheetApp.flush();
    var stamp = Utilities.formatDate(new Date(), KSC.TZ, 'dd/MM/yyyy HH:mm') + ' · ' + ch.length + ' thay đổi';
    PropertiesService.getScriptProperties().setProperty('KTD_DONE', stamp);
    try { kscLog_(ss, 'KpiThdFix', 'patch', 'KPI Dental Thailand theo file 04/11/2026 (Owen san): ' + ch.length + ' ô'); } catch (eL) {}
    try { CacheService.getScriptCache().remove('rkv:data:n'); } catch (eC) {}
  }
  return { ok: true, dry: dry, changes: ch.length, list: ch.slice(0, 120) };
}

/* ── đọc lại 2 nguồn Dental Thái, ghi đè cả tháng đã chốt (1 lần) ── */
function ktdSync_(ss) {
  var P = PropertiesService.getScriptProperties(), lock = LockService.getScriptLock(), out = { ok: true, res: [] };
  if (!lock.tryLock(60000)) return { ok: false, error: 'busy' };
  try {
    P.setProperty('KSC_UNLOCK', '1');
    var ctx = kscCtx_(ss);
    ['th_dent', 'crm:thaid'].forEach(function (src) {
      var r = kscRunSource_(ctx, src, 'manual');
      out.res.push({ src: src, status: r.status, msg: String(r.msg || '').slice(0, 900), details: (r.details || []).slice(0, 60) });
    });
    kscLog_(ss, 'KpiThdFix', 'unlock', 'Dental Thailand: đọc lại th_dent + crm:thaid, ghi đè tháng đã chốt (1 lần)');
  } finally { P.deleteProperty('KSC_UNLOCK'); lock.releaseLock(); }
  try { CacheService.getScriptCache().remove('rkv:data:n'); } catch (eC) {}
  var st = ktdStatus_(ss); out.rows = st.rows;
  return out;
}
