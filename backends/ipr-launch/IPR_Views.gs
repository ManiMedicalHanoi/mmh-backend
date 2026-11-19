/* IPR_Views.gs — các tab UPDATE (Samples, Surveys, Sales), FILES, VIEW (Timeline, Overview), Start here. Xem đầu IPR_SOP.gs. */

/* ══ UPDATE · Samples ═════════════════════════════════════════════════════════════════════ */
function buildSamples_(ss) {
  var R0 = SM.r0, n = SM.n, R1 = R0 + n - 1;
  var sh = prep_(ss, T.smp, [210, 120, 110, 50, 170, 170, 84, 90, 200, 96, 140, 220], K.acc, R1 + 2);
  title_(sh, 'UPDATE · SAMPLES', 'One row per clinic shipment: request → owner approves → send → feedback. Sampling opens only when all conditions are met.',
    'Sales team / PIC · owner approves', 'PIC: green columns · Owner: Approved by', 12);
  section_(sh, 5, 2, 7, 'Conditions to send samples');
  header_(sh, 6, 2, ['Condition', '', '', '', 'Checked from', '', 'Met']);
  sh.getRange(6, 2, 1, 4).merge(); sh.getRange(6, 6, 1, 2).merge();
  var tb = q_(T.tasks), col = function (k) { return tb + '$' + CL_(TC[k]) + '$' + TK.r0 + ':$' + CL_(TC[k]) + '$' + TK.r1; };
  var cond = [['Product registration / import licence confirmed', 'UPDATE · Tasks · task 1.8', '=IF(SUMPRODUCT((' + col('no') + '="1.8")*(' + col('st') + '="Done"))>0,"Met","Not met")'],
    ['Trial feedback survey ready (form link filled)', 'UPDATE · Surveys', '=IF(COUNTIFS(' + q_(T.sv) + '$D$' + SV.r0 + ':$D$' + (SV.r0 + SV.n - 1) + ',"Trial feedback",' + q_(T.sv) + '$G$' + SV.r0 + ':$G$' + (SV.r0 + SV.n - 1) + ',"<>")>0,"Met","Not met")'],
    ['Within sample budget', 'SETUP · Team & plan', '=IF(OR(' + q_(T.setup) + '$I$' + (SU.plan0 + 7) + '="",SUMIFS($E$' + R0 + ':$E$' + R1 + ',$H$' + R0 + ':$H$' + R1 + ',"<>")<=' + q_(T.setup) + '$I$' + (SU.plan0 + 7) + '),"Met","Not met")']];
  cond.forEach(function (c, i) {
    var r = 7 + i;
    sh.getRange(r, 2, 1, 4).merge().setValue(c[0]); sh.getRange(r, 6, 1, 2).merge().setValue(c[1]); sh.getRange(r, 8).setFormula(c[2]).setHorizontalAlignment('center');
  });
  grid_(sh, 7, 2, 3, 7); autoCols_(sh, 7, 3, [2, 3, 4, 5, 6, 7, 8]);
  sh.getRange(10, 2).setValue('Sampling').setFontWeight('bold').setFontColor(K.navy).setFontSize(12);
  sh.getRange(10, 3, 1, 2).merge().setFormula('=IF(AND(H7="Met",H8="Met",H9="Met"),"OPEN","CLOSED")').setFontSize(13).setFontWeight('bold').setHorizontalAlignment('center');
  sh.getRange(10, 5, 1, 4).merge().setValue('Sent date is refused while sampling is CLOSED.').setFontColor(K.mut).setFontSize(9);
  sh.setRowHeight(10, 30);
  statusCF_(sh, ['H7:H9', 'C10:D10'], ['Met', 'Not met', 'OPEN', 'CLOSED']);
  section_(sh, 5, 10, 4, 'Summary');
  var kp = [['Clinics', '=COUNTA($B$' + R0 + ':$B$' + R1 + ')', '0'], ['Packs sent', '=SUMIFS($E$' + R0 + ':$E$' + R1 + ',$H$' + R0 + ':$H$' + R1 + ',"<>")', '0'],
    ['Rows without quantity', '=COUNTIFS($B$' + R0 + ':$B$' + R1 + ',"<>",$E$' + R0 + ':$E$' + R1 + ',"")', '0'], ['Feedback received', '=COUNTIF($L$' + R0 + ':$L$' + R1 + ',"Feedback received")', '0'],
    ['Feedback rate', '=IF(M6=0,0,M9/M6)', '0%'], ['Follow-up overdue', '=COUNTIF($L$' + R0 + ':$L$' + R1 + ',"Follow-up overdue")', '0']];
  kp.forEach(function (k, i) {
    var r = 6 + i;
    sh.getRange(r, 10, 1, 3).merge().setValue(k[0]).setFontWeight('bold').setFontColor(K.navy);
    sh.getRange(r, 13).setFormula(k[1]).setNumberFormat(k[2]).setHorizontalAlignment('center').setFontWeight('bold').setFontSize(12);
  });
  grid_(sh, 6, 10, 6, 4);
  cfFormula_(sh, ['M11'], '=M11>0', null, K.badFg, true); cfFormula_(sh, ['M8'], '=M8>0', null, K.waitFg, true);
  section_(sh, 13, 2, 12, 'Sample log', 'Add a new shipment in the next empty row');
  ribbon_(sh, 14, [[2, 5, 'pic'], [7, 1, 'owner', 'OWNER APPROVES'], [8, 1, 'pic'], [9, 1, 'auto'], [10, 2, 'pic'], [12, 1, 'auto'], [13, 1, 'pic']]);
  header_(sh, 15, 2, ['Clinic', 'Segment', 'City', 'Qty', 'Requested by', 'Approved by', 'Sent date', 'Feedback due', 'Survey', 'Feedback date', 'Status', 'Notes'], [9, 12]);
  var rows = [];
  if (SNAP && SNAP.smp) rows = SNAP.smp.map(function (r) { return [r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[9], r[10], r[12]]; });
  else sampleSeed_().forEach(function (x) { rows.push([x[0], x[1], x[2], x[3], ROLES.hsm, ROLES.hsm, D_('30/06/2025'), x[4] ? 'Khảo sát sau dùng thử IPR-01EF' : '', D_(x[5]), x[6]]); });
  if (!SNAP) rows[0][9] = (rows[0][9] ? rows[0][9] + ' · ' : '') + 'Sent date 30/06/2025 recorded at tracker setup.';
  var data = [];
  for (var i = 0; i < n; i++) {
    var r = R0 + i, x = rows[i] || ['', '', '', '', '', '', '', '', '', ''];
    data.push([x[0], x[1], x[2], x[3], x[4], x[5], x[6], '=IF(H' + r + '="","",H' + r + '+' + q_(T.setup) + '$I$' + (SU.plan0 + 6) + ')', x[7], x[8],
      '=IF(B' + r + '="","",IF(K' + r + '<>"","Feedback received",IF(H' + r + '<>"",IF(TODAY()>I' + r + ',"Follow-up overdue","Sent · waiting feedback"),IF(G' + r + '<>"","Approved · to send","Waiting approval"))))', x[9]]);
  }
  sh.getRange(R0, 2, n, 12).setValues(data);
  grid_(sh, R0, 2, n, 12); sh.getRange(R0, 2, n, 12).setFontSize(9.5);
  autoCols_(sh, R0, n, [9, 12]);
  sh.getRange(R0, 2, n, 1).setFontWeight('bold');
  [8, 9, 11].forEach(function (c) { sh.getRange(R0, c, n, 1).setNumberFormat('dd/mm/yy').setHorizontalAlignment('center'); });
  sh.getRange(R0, 5, n, 1).setHorizontalAlignment('center');
  var setup = ss.getSheetByName(T.setup);
  sh.getRange(R0, 3, n, 1).setDataValidation(dvRange_(setup.getRange(SU.list0, 10, SU.listN, 1)));
  sh.getRange(R0, 6, n, 1).setDataValidation(dvRange_(setup.getRange(SU.team0, 2, SU.teamN, 1)));
  sh.getRange(R0, 7, n, 1).setDataValidation(dvRange_(setup.getRange(SU.plan0 + 2, 9, 1, 1), true));
  sh.getRange(R0, 8, n, 1).setDataValidation(dvCustom_('=AND($C$10="OPEN",$G' + R0 + '<>"")', 'Not allowed: sampling must be OPEN and the row approved by the project owner.'));
  sh.getRange(R0, 10, n, 1).setDataValidation(dvRange_(ss.getSheetByName(T.sv).getRange(SV.r0, 2, SV.n, 1)));
  sh.getRange(R0, 11, n, 1).setDataValidation(dvDate_());
  statusCF_(sh, ['L' + R0 + ':L' + R1], ['Feedback received', 'Follow-up overdue', 'Sent · waiting feedback', 'Approved · to send', 'Waiting approval']);
  cfFormula_(sh, ['E' + R0 + ':E' + R1], '=AND($B' + R0 + '<>"",$E' + R0 + '="")', K.waitBg, null, false);
  protectWarn_(sh, sh.getRange(R0, 9, n, 1)); protectWarn_(sh, sh.getRange(R0, 12, n, 1)); protectWarn_(sh, sh.getRange(6, 2, 6, 12));
  sh.setFrozenRows(15); sh.setFrozenColumns(2);
}

/* ══ UPDATE · Surveys ═════════════════════════════════════════════════════════════════════ */
function surveySeed_() {
  return [['Khảo sát sau dùng thử IPR-01EF', 'Phòng khám đã nhận mẫu', 'Trial feedback', ROLES.ptl, ROLES.hsm, hl_(L.form, 'Google Form'), D_('14/08/2025'), D_('25/08/2025'), 21, 3,
    '', 'Responses: IPR Surveys _MMH (link in FILES · Documents) · chính xác tốt trở lên 3/3 · giảm rung 3/3 · bề mặt mịn 3/3 · cần cải thiện độ bền 2/3'],
  ['Khảo sát hình dạng mũi IPR mới (cho MANI)', 'Góp ý dòng IPR-04 / IPR-05', 'Product idea', ROLES.ptl, ROLES.hsm, hl_(L.shapeDoc, 'Bộ câu hỏi'), D_('22/09/2026'), D_('23/09/2026'), 8, 8,
    hl_(L.shapeRes, 'Results file'), 'Bác sĩ chỉnh nha 6/8 · ưa mũi ô có đầu nhọn 6/8 · đang dùng MANI 4/8 · sẽ mua khi ra mắt 8/8'],
  ['Khảo sát khách hàng lần 2', 'Sau 12 tháng bán hàng', 'Satisfaction', '', '', '', '', '', '', '', '', '']];
}
function buildSurveys_(ss) {
  var R0 = SV.r0, n = SV.n, R1 = R0 + n - 1, F0 = SV.f0;
  var sh = prep_(ss, T.sv, [240, 190, 110, 150, 160, 120, 76, 76, 56, 72, 56, 130, 260], K.acc, F0 + n + 2);
  title_(sh, 'UPDATE · SURVEYS', 'One row per survey: trial feedback, market research, product ideas. Several surveys can run; each keeps its own status.',
    'Product Team Leader · owner approves questions', 'PIC: green columns · Owner: Owner, Questions approved by · Findings: bottom table', 13);
  var flow = [['Draft', 'name and purpose'], ['Questions approved', 'owner approves'], ['Open', 'open date + form link'], ['Closed', 'close date passed'], ['Report done', 'findings file attached']];
  flow.forEach(function (f, i) {
    sh.getRange(5, 2 + i * 2, 1, 1).setValue(f[0] + '  →  ' + f[1]).setFontSize(9).setFontWeight('bold').setFontColor(K.navy)
      .setBorder(true, true, true, true, null, null, K.line, SpreadsheetApp.BorderStyle.SOLID);
  });
  sh.getRange(5, 12, 1, 3).merge().setValue('Open date is refused until questions are approved and the form link is filled.').setFontColor(K.badFg).setFontSize(9).setWrap(true);
  sh.setRowHeight(5, 30);
  ribbon_(sh, 7, [[2, 3, 'pic'], [5, 2, 'owner'], [7, 5, 'pic'], [12, 3, 'auto']]);
  header_(sh, 8, 2, ['Survey', 'Purpose', 'Type', 'Owner', 'Questions approved by', 'Form link', 'Open', 'Close', 'Target', 'Responses', 'Rate', 'Status', 'What is missing'], [12, 13, 14]);
  var seed = surveySeed_(), reg = [], fnd = [];
  if (SNAP && SNAP.sv) { reg = SNAP.sv.map(function (r) { return r.slice(1, 11); }); fnd = (SNAP.svf || []).map(function (r) { return [r[2], r[3]]; }); }
  else { reg = seed.map(function (s) { return s.slice(0, 10); }); fnd = seed.map(function (s) { return [s[10], s[11]]; }); }
  var data = [];
  for (var i = 0; i < n; i++) {
    var r = R0 + i, x = reg[i] || ['', '', '', '', '', '', '', '', '', ''], fr = F0 + i;
    data.push(x.concat(['=IF(OR(J' + r + '="",K' + r + '="",J' + r + '=0),"",K' + r + '/J' + r + ')',
      '=IF(B' + r + '="","",IF($C$' + fr + '<>"","Report done",IF(AND(I' + r + '<>"",I' + r + '<TODAY()),"Closed",IF(H' + r + '<>"","Open",IF(F' + r + '<>"","Questions approved","Draft")))))',
      '=IF(B' + r + '="","",IF(M' + r + '="Draft",IF(E' + r + '="","Owner, approved questions and form link needed","Approved questions and form link needed"),IF(M' + r + '="Questions approved",IF(G' + r + '="","Form link and open date needed","Open date needed"),IF(M' + r + '="Closed","Attach the findings file (bottom table)",""))))']));
  }
  sh.getRange(R0, 2, n, 13).setValues(data);
  grid_(sh, R0, 2, n, 13); sh.getRange(R0, 2, n, 13).setFontSize(9.5);
  autoCols_(sh, R0, n, [12, 13, 14]);
  sh.getRange(R0, 2, n, 1).setFontWeight('bold');
  sh.getRange(R0, 7, n, 1).setFontColor(K.link);
  [8, 9].forEach(function (c) { sh.getRange(R0, c, n, 1).setNumberFormat('dd/mm/yy').setHorizontalAlignment('center'); });
  sh.getRange(R0, 10, n, 3).setHorizontalAlignment('center'); sh.getRange(R0, 12, n, 1).setNumberFormat('0%');
  sh.getRange(R0, 14, n, 1).setFontColor(K.badFg).setFontSize(9);
  var setup = ss.getSheetByName(T.setup);
  sh.getRange(R0, 4, n, 1).setDataValidation(dvRange_(setup.getRange(SU.list0, 12, SU.listN, 1)));
  sh.getRange(R0, 5, n, 2).setDataValidation(dvRange_(setup.getRange(SU.team0, 2, SU.teamN, 1)));
  sh.getRange(R0, 8, n, 1).setDataValidation(dvCustom_('=AND($F' + R0 + '<>"",$G' + R0 + '<>"",OR($D' + R0 + '<>"Trial feedback",COUNTIF(INDIRECT("\'' + T.smp + '\'!H' + SM.r0 + ':H' + (SM.r0 + SM.n - 1) + '"),">0")>0))',
    'Not allowed: questions must be approved and the form link filled; a Trial feedback survey also needs at least one sample sent.'));
  sh.getRange(R0, 9, n, 1).setDataValidation(dvDate_());
  statusCF_(sh, ['M' + R0 + ':M' + R1], ['Report done', 'Closed', 'Open', 'Questions approved', 'Draft']);
  cfFormula_(sh, ['E' + R0 + ':F' + R1], '=AND($B' + R0 + '<>"",E' + R0 + '="")', K.waitBg, null, false);
  // kết quả
  section_(sh, F0 - 2, 2, 13, 'Findings', 'One row per survey above (same order)');
  header_(sh, F0 - 1, 2, ['Survey', 'Findings file', 'Key findings'], [2]);
  var fd = [];
  for (var j = 0; j < n; j++) { var y = fnd[j] || ['', '']; fd.push(['=IF(B' + (R0 + j) + '="","",B' + (R0 + j) + ')', y[0], y[1]]); }
  sh.getRange(F0, 2, n, 3).setValues(fd);
  for (var k = 0; k < n; k++) sh.getRange(F0 + k, 4, 1, 10).merge();
  grid_(sh, F0, 2, n, 13); sh.getRange(F0, 2, n, 13).setFontSize(9.5);
  autoCols_(sh, F0, n, [2]); sh.getRange(F0, 3, n, 1).setFontColor(K.link);
  protectWarn_(sh, sh.getRange(R0, 12, n, 3)); protectWarn_(sh, sh.getRange(F0, 2, n, 1));
  sh.setFrozenRows(8); sh.setFrozenColumns(2);
}

/* ══ UPDATE · Sales ═══════════════════════════════════════════════════════════════════════ */
function buildSales_(ss) {
  var R0 = SA.r0, n = SA.n, R1 = R0 + n - 1;
  var sh = prep_(ss, T.sales, [90, 170, 80, 120, 230, 160, 30, 90, 80, 120, 120], K.acc, R1 + 2);
  title_(sh, 'UPDATE · SALES', 'One row per month and distributor from the distributor report. A row counts only when it has a source file.',
    'Sales team / Product Team Leader', 'All columns of the sales log', 11);
  section_(sh, 5, 2, 6, 'Sales log'); section_(sh, 5, 9, 4, 'Monthly summary');
  sh.getRange(6, 2, 1, 6).merge().setValue('Example: 01/08/2025 · Nam Dung · 10 · 2,500,000 · link to the distributor report · Sales team').setFontStyle('italic').setFontColor('#9AA6B2').setFontSize(9);
  header_(sh, 7, 2, ['Month', 'Distributor', 'Packs', 'Value (VND)', 'Source file', 'Entered by']);
  header_(sh, 7, 9, ['Month', 'Packs', 'Value (VND)', 'Cumulative packs'], [9, 10, 11, 12]);
  if (SNAP && SNAP.sales && SNAP.sales.length) {
    var rows = SNAP.sales.map(function (r) { return r.slice(1, 7); }).filter(function (r) { return r.some(function (x) { return x !== ''; }); });
    if (rows.length) sh.getRange(R0, 2, Math.min(rows.length, n), 6).setValues(rows.slice(0, n));
  }
  grid_(sh, R0, 2, n, 6);
  sh.getRange(R0, 2, n, 1).setNumberFormat('mm/yyyy').setHorizontalAlignment('center').setDataValidation(dvDate_());
  sh.getRange(R0, 4, n, 2).setNumberFormat('#,##0');
  sh.getRange(R0, 6, n, 1).setFontColor(K.link);
  var setup = ss.getSheetByName(T.setup);
  sh.getRange(R0, 3, n, 1).setDataValidation(dvRange_(setup.getRange(SU.list0, 8, SU.listN, 1)));
  sh.getRange(R0, 7, n, 1).setDataValidation(dvRange_(setup.getRange(SU.team0, 2, SU.teamN, 1)));
  var sm = [], rng = function (c) { return '$' + c + '$' + R0 + ':$' + c + '$' + R1; };
  for (var i = 0; i < 24; i++) {
    var r = R0 + i;
    sm.push(['=DATE(2025,8+' + i + ',1)', '=SUMIFS(' + rng('D') + ',' + rng('B') + ',">="&I' + r + ',' + rng('B') + ',"<="&EOMONTH(I' + r + ',0),' + rng('F') + ',"<>")',
      '=SUMIFS(' + rng('E') + ',' + rng('B') + ',">="&I' + r + ',' + rng('B') + ',"<="&EOMONTH(I' + r + ',0),' + rng('F') + ',"<>")', '=SUM($J$' + R0 + ':J' + r + ')']);
  }
  sh.getRange(R0, 9, 24, 4).setValues(sm);
  sh.getRange(R0 + 24, 9, 1, 4).setValues([['Total', '=SUM(J' + R0 + ':J' + (R0 + 23) + ')', '=SUM(K' + R0 + ':K' + (R0 + 23) + ')', '']]).setFontWeight('bold');
  grid_(sh, R0, 9, 25, 4); autoCols_(sh, R0, 25, [9, 10, 11, 12]);
  sh.getRange(R0, 9, 25, 1).setNumberFormat('mm/yyyy').setHorizontalAlignment('center');
  sh.getRange(R0, 10, 25, 3).setNumberFormat('#,##0');
  protectWarn_(sh, sh.getRange(R0, 9, 25, 4));
  sh.setFrozenRows(7);
}

/* ══ FILES · Documents ════════════════════════════════════════════════════════════════════ */
function buildFiles_(ss) {
  var rows = [];
  if (SNAP && SNAP.files && SNAP.files.length) {
    SNAP.files.forEach(function (r) {
      var isBand = !r[1] && r[2] && !r[3] && !r[4];
      rows.push(isBand ? { band: r[2] } : { v: [r[1], r[2], r[3], r[4]] });
    });
  } else {
    var last = -1;
    docSeed_().forEach(function (d) {
      if (d[0] !== last) { rows.push({ band: d[0] === 0 ? 'Project folders' : 'Phase ' + d[0] + ' · ' + PHASES[d[0] - 1][0] }); last = d[0]; }
      rows.push({ v: [d[1], d[2], d[3], hl_(L[d[4]], 'Open')] });
    });
  }
  var n = rows.length + 25;
  var sh = prep_(ss, T.files, [100, 420, 420, 90], K.filesG, n + 8);
  title_(sh, 'FILES · DOCUMENTS', 'Map of every project file on Drive, grouped by phase. Evidence links in UPDATE · Tasks point to these files.',
    'Any PIC', 'One row per new file with its Drive link', 4);
  header_(sh, 6, 2, ['Type', 'Document', 'Purpose', 'Open']);
  var data = [], bands = [];
  for (var i = 0; i < n; i++) {
    var it = rows[i];
    if (it && it.band) { data.push(['', it.band, '', '']); bands.push(7 + i); }
    else data.push(it ? it.v : ['', '', '', '']);
  }
  sh.getRange(7, 2, n, 4).setValues(data);
  grid_(sh, 7, 2, n, 4); sh.getRange(7, 2, n, 4).setFontSize(9.5);
  sh.getRange(7, 3, n, 1).setFontWeight('bold'); sh.getRange(7, 2, n, 1).setFontColor(K.mut); sh.getRange(7, 4, n, 1).setFontColor(K.mut);
  sh.getRange(7, 5, n, 1).setFontColor(K.link).setHorizontalAlignment('center');
  bands.forEach(function (r) { band_(sh, r, 2, 4); });
  sh.setFrozenRows(6);
}

/* ══ VIEW · Timeline ══════════════════════════════════════════════════════════════════════ */
function buildTimeline_(ss) {
  var n = TK.r1 - TK.r0 + 1, R0 = TL.r0, R1 = R0 + n - 1, G0 = TL.g0, NP = TL.np, GL = CL_(G0), off = R0 - TK.r0;
  var W = [40, 270, 150, 76, 110, 60, 60, 60, 60]; for (var i = 0; i < NP; i++) W.push(36);
  var sh = prep_(ss, T.tl, W, K.navy, R1 + 2);
  title_(sh, 'VIEW · TIMELINE', 'Plan against actual for every task. Bars and deadline marks come from UPDATE · Tasks; only View and Start from are typed here.',
    'Anyone · view controls only', 'View (Week / Month / Quarter / Year) and Start from', 9 + NP);
  var view = 'Month', start = D_('01/05/2025');
  if (SNAP && SNAP.tlCtl) { if (SNAP.tlCtl[0]) view = SNAP.tlCtl[0]; if (SNAP.tlCtl[1]) start = SNAP.tlCtl[1]; }
  sh.getRange('B5').setValue('View').setFontWeight('bold').setFontColor(K.navy);
  sh.getRange('C5').setValue(view).setFontWeight('bold').setBorder(true, true, true, true, null, null, '#BCD4E6', SpreadsheetApp.BorderStyle.SOLID)
    .setDataValidation(dvList_(['Week', 'Month', 'Quarter', 'Year'], true));
  sh.getRange('D5').setValue('Start from').setFontWeight('bold').setFontColor(K.navy).setHorizontalAlignment('right');
  sh.getRange('E5').setValue(start).setNumberFormat('dd/mm/yyyy').setHorizontalAlignment('center').setBorder(true, true, true, true, null, null, '#BCD4E6', SpreadsheetApp.BorderStyle.SOLID).setDataValidation(dvDate_());
  sh.getRange('F5').setFormula('="Today "&TEXT(TODAY(),"dd/mm/yyyy")').setFontColor(K.mut);
  var LEG = [[K.bD, 'Done'], [K.bP, 'In progress'], [K.bO, 'Overdue'], [K.bB, 'Blocked'], [K.bC, 'To confirm'], [K.bN, 'Planned'], [K.today, 'Today']];
  LEG.forEach(function (l, i) { var c = G0 + i * 3; sh.getRange(5, c).setBackground(l[0]); sh.getRange(5, c + 1, 1, 2).merge().setValue(l[1]).setFontSize(8.5).setFontColor(K.mut); });
  sh.getRange(5, G0 + 21, 1, 3).merge().setValue('| plan end   · baseline end').setFontSize(8.5).setFontColor(K.mut);
  var MODE = 'MATCH($C$5,{"Week","Month","Quarter","Year"},0)', S = '$E$5', st = [], en = [], lb = [];
  for (var g = 0; g < NP; g++) {
    var L_ = CL_(G0 + g);
    st.push('=CHOOSE(' + MODE + ',' + S + '-WEEKDAY(' + S + ',2)+1+7*' + g + ',DATE(YEAR(' + S + '),MONTH(' + S + ')+' + g + ',1),DATE(YEAR(' + S + '),INT((MONTH(' + S + ')-1)/3)*3+1+3*' + g + ',1),DATE(YEAR(' + S + ')+' + g + ',1,1))');
    en.push('=CHOOSE(' + MODE + ',' + L_ + '7+6,EOMONTH(' + L_ + '7,0),EOMONTH(' + L_ + '7,2),DATE(YEAR(' + L_ + '7),12,31))');
    lb.push('=CHOOSE(' + MODE + ',TEXT(' + L_ + '7,"dd/mm"),TEXT(' + L_ + '7,"mm/yy"),"Q"&INT((MONTH(' + L_ + '7)-1)/3+1)&"/"&RIGHT(YEAR(' + L_ + '7),2),YEAR(' + L_ + '7)&"")');
  }
  sh.getRange(7, G0, 1, NP).setFormulas([st]).setNumberFormat('dd/mm/yy');
  sh.getRange(8, G0, 1, NP).setFormulas([en]).setNumberFormat('dd/mm/yy');
  header_(sh, 9, 2, ['No.', 'Task', 'PIC', 'Plan end', 'Status', 'Bar start', 'Bar end', 'Flag', 'Baseline end']);
  sh.getRange(9, G0, 1, NP).setFormulas([lb]).setFontWeight('bold').setFontColor(K.navy).setBackground(K.head).setHorizontalAlignment('center').setFontSize(8.5)
    .setBorder(true, true, true, true, true, true, K.grid, SpreadsheetApp.BorderStyle.SOLID);
  sh.hideRows(7, 2);
  var tb = q_(T.tasks), data = [];
  for (var i2 = 0; i2 < n; i2++) {
    var r = R0 + i2, s = r - off, B = 'B' + r, row = [
      '=IF(' + tb + 'B' + s + '="","",' + tb + 'B' + s + ')',
      '=IF(' + tb + 'B' + s + '="",IF(LEFT(' + tb + 'D' + s + ',6)="Phase ",' + tb + 'D' + s + ',""),' + tb + 'D' + s + ')',
      '=IF(' + B + '="","",' + tb + 'E' + s + '&"")', '=IF(OR(' + B + '="",' + tb + 'I' + s + '=""),"",' + tb + 'I' + s + ')', '=IF(' + B + '="","",' + tb + 'J' + s + ')',
      '=IF(' + B + '="","",' + tb + CL_(TC.bstart) + s + ')', '=IF(' + B + '="","",' + tb + CL_(TC.bend) + s + ')', '=IF(' + B + '="","",' + tb + 'N' + s + '&"")',
      '=IF(OR(' + B + '="",' + tb + 'Q' + s + '=""),"",' + tb + 'Q' + s + ')'];
    for (var g2 = 0; g2 < NP; g2++) {
      var L2 = CL_(G0 + g2);
      row.push('=IF(OR($B' + r + '="",$E' + r + '=""),"",IF(AND($E' + r + '>=' + L2 + '$7,$E' + r + '<=' + L2 + '$8),"|",IF(AND($J' + r + '<>"",$J' + r + '>=' + L2 + '$7,$J' + r + '<=' + L2 + '$8),"·","")))');
    }
    data.push(row);
  }
  sh.getRange(R0, 2, n, 9 + NP).setValues(data);
  sh.getRange(R0, 2, n, 9).setFontSize(9).setBorder(true, true, true, true, true, true, K.grid, SpreadsheetApp.BorderStyle.SOLID);
  sh.getRange(R0, 5, n, 1).setNumberFormat('dd/mm/yy').setHorizontalAlignment('center');
  sh.getRange(R0, 7, n, 2).setNumberFormat('dd/mm/yy'); sh.getRange(R0, 10, n, 1).setNumberFormat('dd/mm/yy');
  sh.getRange(R0, 2, n, 1).setHorizontalAlignment('center'); sh.getRange(R0, 6, n, 1).setHorizontalAlignment('center').setFontWeight('bold');
  sh.getRange(R0, G0, n, NP).setHorizontalAlignment('center').setFontWeight('bold').setFontSize(9)
    .setBorder(true, true, true, true, true, true, '#EDF0F3', SpreadsheetApp.BorderStyle.SOLID);
  sh.setRowHeights(R0, n, 20);
  var GR = GL + R0 + ':' + CL_(G0 + NP - 1) + R1, K_ = GL;
  var span = function (a, b) { return a + '<>"",' + b + '<>"",' + a + '<=' + K_ + '$8,' + b + '>=' + K_ + '$7'; };
  var bandR = 'B' + R0 + ':' + CL_(G0 + NP - 1) + R1;
  cfFormula_(sh, [bandR], '=AND($B' + R0 + '="",$C' + R0 + '<>"")', K.band, K.navy, true);
  [['=AND($F' + R0 + '="Done",' + span('$G' + R0, '$H' + R0) + ')', K.bD, K.white],
    ['=AND($I' + R0 + '="Overdue",' + span('$G' + R0, '$H' + R0) + ')', K.bO, K.white],
    ['=AND(OR($I' + R0 + '="Blocked",$I' + R0 + '="Phase locked"),' + span('$G' + R0, '$H' + R0) + ')', K.bB, K.ink],
    ['=AND(OR($F' + R0 + '="In progress",$F' + R0 + '="Waiting approval"),' + span('$G' + R0, '$H' + R0) + ')', K.bP, K.white],
    ['=AND($F' + R0 + '="To confirm",' + span('$G' + R0, '$H' + R0) + ')', K.bC, K.ink],
    ['=AND($F' + R0 + '<>"Done",' + span('$G' + R0, '$H' + R0) + ')', K.bN, K.ink],
    ['=AND(TODAY()>=' + K_ + '$7,TODAY()<=' + K_ + '$8)', K.today, K.ink]].forEach(function (x) { cfFormula_(sh, [GR], x[0], x[1], x[2], true); });
  cfFormula_(sh, [GL + '9:' + CL_(G0 + NP - 1) + '9'], '=AND(TODAY()>=' + GL + '7,TODAY()<=' + GL + '8)', K.gold, K.white, true);
  statusCF_(sh, ['F' + R0 + ':F' + R1]);
  sh.hideColumns(7, 4);
  var p = protectWarn_(sh, null); if (p) try { p.setUnprotectedRanges([sh.getRange('C5'), sh.getRange('E5')]); } catch (_) {}
  sh.setFrozenRows(9); sh.setFrozenColumns(6);
}

/* ══ VIEW · Overview (lưới ô 16 px — thanh tiến độ tô theo ô như prototype) ═══════════════ */
var OVW = 86, OVHELP = 88;
function ovPut_(sh, r, c, nc, v, o) {
  o = o || {};
  var rg = sh.getRange(r, c, o.nr || 1, nc);
  if (nc > 1 || (o.nr || 1) > 1) rg.merge();
  var cell = sh.getRange(r, c);
  if (v !== undefined && v !== null && v !== '') { if (String(v).charAt(0) === '=') cell.setFormula(v); else cell.setValue(v); }
  if (o.size) rg.setFontSize(o.size); if (o.bold) rg.setFontWeight('bold'); if (o.color) rg.setFontColor(o.color); if (o.bg) rg.setBackground(o.bg);
  if (o.h) rg.setHorizontalAlignment(o.h); if (o.fmt) rg.setNumberFormat(o.fmt); if (o.wrap) rg.setWrap(true); if (o.v) rg.setVerticalAlignment(o.v);
  return rg;
}
function ovBar_(sh, r, c, N, refs) {
  var t = '(' + refs.join('+') + ')', f = [];
  for (var k = 1; k <= N; k++) {
    var acc = [], expr = '';
    var parts = ['#d', '#p', '#o', '#c'];
    expr = '"#n"';
    for (var j = 3; j >= 0; j--) { var sum = refs.slice(0, j + 1).join('+'); expr = 'IF(' + k + '<=ROUND((' + sum + ')/' + t + '*' + N + ',0),"' + parts[j] + '",' + expr + ')'; }
    f.push('=IF(' + t + '=0,"#n",' + expr + ')');
  }
  sh.getRange(r, c, 1, N).setFormulas([f]);
}
function buildOverview_(ss) {
  var W = []; for (var i = 0; i < OVW; i++) W.push(16); W.push(24, 40, 40);
  var sh = prep_(ss, T.ov, W, K.navy, 60);
  sh.getRange(1, 1, 60, OVW + 4).setFontSize(9.5);
  var cc = function (r, c) { return q_(T.calc) + '$' + c + '$' + r; };
  title_(sh, 'IPR-01EF LAUNCH · OVERVIEW', '', 'Nobody · read only', 'Nothing — update the UPDATE tabs; this page recalculates', OVW);
  sh.getRange(2, 2).setFormula('="Calculated from the UPDATE and APPROVE tabs.   Project owner: "&' + q_(T.setup) + '$I$' + (SU.plan0 + 2) + '&"   ·   Approver: "&' + q_(T.setup) + '$I$' + (SU.plan0 + 3) + '&"   ·   Updated "&TEXT(TODAY(),"dd/mm/yyyy")');
  // tiến độ chung (hàng 5–8)
  var x0 = 16, NB = 72;
  ovPut_(sh, 5, 2, 13, 'PROJECT PROGRESS', { size: 8.5, bold: true, color: K.mut });
  ovPut_(sh, 6, 2, 13, '=' + cc(28, 'B'), { nr: 2, size: 30, bold: true, color: K.navy, fmt: '0%', v: 'middle' });
  ovPut_(sh, 8, 2, 13, '=' + cc(23, 'B') + '&" of "&' + cc(22, 'B') + '&" tasks done"', { color: K.mut });
  ovBar_(sh, 6, x0, NB, [cc(23, 'B'), cc(24, 'B'), cc(25, 'B'), cc(26, 'B'), cc(27, 'B')]);
  sh.setRowHeight(6, 24);
  var leg = [['#d', 'Done', 23], ['#p', 'In progress', 24], ['#o', 'Overdue / blocked', 25], ['#c', 'To confirm', 26], ['#n', 'Not started', 27]];
  leg.forEach(function (l, i) { var c = x0 + i * 13; sh.getRange(7, c).setValue(l[0]); ovPut_(sh, 7, c + 1, 11, '="' + l[1] + '  "&' + cc(l[2], 'B'), { size: 9, color: '#3B4650' }); });
  ovPut_(sh, 8, x0, 8, '="Time used "&TEXT(' + cc(34, 'B') + ',"0%")', { size: 9, color: K.mut });
  var tf = []; for (var k = 1; k <= 46; k++) tf.push('=IF(' + k + '<=ROUND(' + cc(34, 'B') + '*46,0),"#t","#e")');
  sh.getRange(8, x0 + 8, 1, 46).setFormulas([tf]);
  ovPut_(sh, 8, x0 + 55, 17, '=' + cc(35, 'B'), { size: 9, color: K.mut, h: 'right' });
  sh.getRange(5, 2, 4, OVW).setBorder(true, true, true, true, null, null, K.line, SpreadsheetApp.BorderStyle.SOLID);
  // ô KPI (hàng 10–12)
  var kp = [['CURRENT PHASE', '="Phase "&' + cc(29, 'B'), '=' + cc(30, 'B'), K.navy], ['OVERDUE', '=' + cc(31, 'B'), 'past plan end, not done', K.badFg],
    ['BLOCKED', '=' + cc(32, 'B'), 'waiting for another task or phase', K.badFg], ['TO CONFIRM', '=' + cc(26, 'B'), 'old records without result', K.waitFg],
    ['WAITING APPROVAL', '=' + cc(33, 'B'), 'phases and tasks', K.navy]];
  kp.forEach(function (x, i) {
    var c = 2 + i * 17 + (i > 0 ? 1 : 0) * 0, w = 16; c = 2 + i * 17;
    ovPut_(sh, 10, c, w, x[0], { size: 8.5, bold: true, color: K.mut });
    ovPut_(sh, 11, c, w, x[1], { size: 18, bold: true, color: x[3] });
    ovPut_(sh, 12, c, w, x[2], { size: 9, color: K.mut });
    sh.getRange(10, c, 3, w).setBorder(true, true, true, true, null, null, K.line, SpreadsheetApp.BorderStyle.SOLID);
  });
  sh.setRowHeight(11, 30);
  // 4 phase (hàng 14–31)
  ovPut_(sh, 14, 2, 30, 'LAUNCH FLOW', { size: 10.5, bold: true, color: K.navy });
  for (var p = 1; p <= 4; p++) {
    var s = 2 + (p - 1) * 22, pr = 15 + p;
    ovPut_(sh, 15, s, 20, '="PHASE ' + p + '"&IF(' + cc(29, 'B') + '=' + p + '," · CURRENT","")', { size: 8.5, bold: true, color: K.white, bg: K.navy });
    ovPut_(sh, 16, s, 20, '=' + cc(pr, 'B'), { size: 12, bold: true, color: K.white, bg: K.navy });
    cfFormula_(sh, [A1_(15, s) + ':' + A1_(16, s + 19)], '=INDIRECT("_calc!B29")=' + p, K.acc, K.white, true);
    ovPut_(sh, 17, s, 4, '=' + cc(pr, 'G'), { size: 11, bold: true, color: K.navy, fmt: '0%' });
    ovPut_(sh, 17, s + 5, 8, '=' + cc(pr, 'F'), { size: 8.5, bold: true, h: 'center' });
    ovPut_(sh, 17, s + 13, 7, '=' + cc(pr, 'D') + '&" / "&' + cc(pr, 'C') + '&" tasks"', { size: 9, color: K.mut, h: 'right' });
    ovBar_(sh, 18, s, 20, [cc(pr, 'N'), cc(pr, 'O'), cc(pr, 'P'), cc(pr, 'Q'), cc(pr, 'R')]);
    sh.setRowHeight(18, 12);
    var idx = []; STEPS.forEach(function (st, i) { if (st[1] === p) idx.push(i); });
    idx.forEach(function (si, j) {
      var b = 20 + j * 4, cr = 3 + si;
      ovPut_(sh, b, s, 16, '=' + cc(cr, 'A'), { size: 9.5, bold: true });
      ovPut_(sh, b, s + 16, 4, '=' + cc(cr, 'D') + '&" / "&' + cc(cr, 'C'), { size: 9, color: K.mut, h: 'right' });
      ovPut_(sh, b + 1, s, 12, '=' + cc(cr, 'M'), { size: 8.5, color: K.mut });
      ovPut_(sh, b + 1, s + 12, 8, '=' + cc(cr, 'K'), { size: 8, bold: true, h: 'center' });
      ovBar_(sh, b + 2, s, 20, [cc(cr, 'N'), cc(cr, 'O'), cc(cr, 'P'), cc(cr, 'Q'), cc(cr, 'R')]);
    });
    ovPut_(sh, 32, s, 10, 'Phase ' + p + ' approval', { size: 9, bold: true, color: K.navy, bg: K.auto });
    ovPut_(sh, 32, s + 10, 10, '=IF(' + cc(pr, 'H') + '="Approved","Approved · "&TEXT(' + cc(pr, 'I') + ',"dd/mm/yyyy"),' + cc(pr, 'H') + ')', { size: 8.5, bold: true, h: 'center' });
    sh.getRange(15, s, 18, 20).setBorder(true, true, true, true, null, null, K.line, SpreadsheetApp.BorderStyle.SOLID);
  }
  for (var rr = 20; rr <= 31; rr++) sh.setRowHeight(rr, (rr - 20) % 4 === 2 ? 8 : ((rr - 20) % 4 === 3 ? 6 : 19));
  // việc tồn đọng (hàng 34–45) + ai đang làm gì
  var tb = q_(T.tasks), TR = function (k) { return tb + '$' + CL_(TC[k]) + '$' + TK.r0 + ':$' + CL_(TC[k]) + '$' + TK.r1; };
  ovPut_(sh, 34, 2, 52, 'PENDING & BLOCKED · NEEDS ACTION NOW', { size: 10.5, bold: true, color: K.navy });
  var PC = [[2, 20, 'Task'], [22, 7, 'Why'], [29, 15, 'What to do'], [44, 10, 'Waiting for']];
  PC.forEach(function (h) { ovPut_(sh, 35, h[0], h[1], h[2], { size: 9, bold: true, color: K.navy, bg: K.head }); });
  var HC = OVHELP;
  for (var i3 = 0; i3 < 10; i3++) {
    var r = 36 + i3, m = '$' + CL_(HC) + r;
    sh.getRange(r, HC).setFormula('=IFERROR(MATCH(' + (i3 + 1) + ',' + TR('rank') + ',0),"")');
    ovPut_(sh, r, 2, 20, '=IF(' + m + '="","",INDEX(' + TR('no') + ',' + m + ')&"  "&INDEX(' + TR('task') + ',' + m + '))', { size: 9, bold: true });
    ovPut_(sh, r, 22, 7, '=IF(' + m + '="","",IF(INDEX(' + TR('flag') + ',' + m + ')="",INDEX(' + TR('st') + ',' + m + '),INDEX(' + TR('flag') + ',' + m + ')))', { size: 8.5, bold: true, h: 'center' });
    ovPut_(sh, r, 29, 15, '=IF(' + m + '="","",IF(V' + r + '="Overdue","Update status or set a new plan end",IF(V' + r + '="Blocked","Finish first: "&INDEX(' + TR('dep') + ',' + m + '),IF(V' + r + '="Phase locked","Wait for previous phase approval",IF(V' + r + '="No PIC","Owner to assign a PIC",IF(V' + r + '="Missing file","Attach the evidence file",IF(V' + r + '="To confirm","Confirm done, re-plan or cancel","Approver to review")))))))', { size: 9, color: K.mut });
    ovPut_(sh, r, 44, 10, '=IF(' + m + '="","",IF(V' + r + '="Waiting approval",INDEX(' + TR('ab') + ',' + m + '),IF(INDEX(' + TR('pic') + ',' + m + ')="","no PIC",INDEX(' + TR('pic') + ',' + m + '))))', { size: 9 });
    sh.getRange(r, 2, 1, 52).setBorder(null, null, true, null, null, null, K.grid, SpreadsheetApp.BorderStyle.SOLID);
  }
  ovPut_(sh, 34, 57, 31, 'WHO IS DOING WHAT', { size: 10.5, bold: true, color: K.navy });
  var WC = [[57, 12, 'PIC'], [69, 4, 'Open'], [73, 4, 'Overdue'], [77, 5, 'To approve'], [82, 6, 'Next deadline']];
  WC.forEach(function (h) { ovPut_(sh, 35, h[0], h[1], h[2], { size: 9, bold: true, color: K.navy, bg: K.head, h: h[0] > 57 ? 'center' : null }); });
  for (var i4 = 0; i4 < 8; i4++) {
    var r4 = 36 + i4, role = '$BE' + r4, ap = q_(T.appr);
    ovPut_(sh, r4, 57, 12, '=' + q_(T.setup) + '$B$' + (SU.team0 + i4) + '&""', { size: 9, bold: true });
    ovPut_(sh, r4, 69, 4, '=IF(' + role + '="","",COUNTIFS(' + TR('pic') + ',' + role + ',' + TR('no') + ',"<>",' + TR('st') + ',"<>Done",' + TR('st') + ',"<>Cancelled"))', { size: 9, h: 'center' });
    ovPut_(sh, r4, 73, 4, '=IF(' + role + '="","",COUNTIFS(' + TR('pic') + ',' + role + ',' + TR('flag') + ',"Overdue"))', { size: 9, h: 'center' });
    ovPut_(sh, r4, 77, 5, '=IF(' + role + '="","",COUNTIFS(' + TR('ab') + ',' + role + ',' + TR('st') + ',"Waiting approval")+COUNTIFS(' + ap + '$C$' + AP.ph0 + ':$C$' + (AP.ph0 + 3) + ',' + role + ',' + ap + '$J$' + AP.ph0 + ':$J$' + (AP.ph0 + 3) + ',"Waiting approval"))', { size: 9, h: 'center' });
    var mi = 'MINIFS(' + TR('pe') + ',' + TR('pic') + ',' + role + ',' + TR('st') + ',"<>Done",' + TR('st') + ',"<>Cancelled",' + TR('pe') + ',">0")';
    ovPut_(sh, r4, 82, 6, '=IF(OR(' + role + '="",N(BQ' + r4 + ')=0),"",IFERROR(IF(' + mi + '=0,"",' + mi + '),""))', { size: 9, h: 'center', fmt: 'dd/mm/yyyy', color: K.mut });
    sh.getRange(r4, 57, 1, 31).setBorder(null, null, true, null, null, null, K.grid, SpreadsheetApp.BorderStyle.SOLID);
  }
  cfFormula_(sh, ['BU36:BX43'], '=N($BU36)>0', null, K.badFg, true);
  // hạn sắp tới (hàng 47–56)
  ovPut_(sh, 47, 2, 52, '="DEADLINES IN THE NEXT "&' + q_(T.setup) + '$I$' + (SU.plan0 + 8) + '&" DAYS"', { size: 10.5, bold: true, color: K.navy });
  var DC = [[2, 20, 'Task'], [22, 11, 'PIC'], [33, 6, 'Plan end'], [39, 5, 'Left'], [44, 10, 'Status']];
  DC.forEach(function (h) { ovPut_(sh, 48, h[0], h[1], h[2], { size: 9, bold: true, color: K.navy, bg: K.head }); });
  for (var i5 = 0; i5 < 8; i5++) {
    var r5 = 49 + i5, m5 = '$' + CL_(HC + 1) + r5;
    sh.getRange(r5, HC + 1).setFormula('=IFERROR(MATCH(SMALL(' + TR('dkey') + ',' + (i5 + 1) + '),' + TR('dkey') + ',0),"")');
    ovPut_(sh, r5, 2, 20, '=IF(' + m5 + '="","",INDEX(' + TR('no') + ',' + m5 + ')&"  "&INDEX(' + TR('task') + ',' + m5 + '))', { size: 9, bold: true });
    ovPut_(sh, r5, 22, 11, '=IF(' + m5 + '="","",INDEX(' + TR('pic') + ',' + m5 + ')&"")', { size: 9 });
    ovPut_(sh, r5, 33, 6, '=IF(' + m5 + '="","",INDEX(' + TR('pe') + ',' + m5 + '))', { size: 9, h: 'center', fmt: 'dd/mm/yyyy' });
    ovPut_(sh, r5, 39, 5, '=IF(' + m5 + '="","",INDEX(' + TR('pe') + ',' + m5 + ')-TODAY()&" days")', { size: 9, h: 'center' });
    ovPut_(sh, r5, 44, 10, '=IF(' + m5 + '="","",INDEX(' + TR('st') + ',' + m5 + '))', { size: 8.5, bold: true, h: 'center' });
    sh.getRange(r5, 2, 1, 52).setBorder(null, null, true, null, null, null, K.grid, SpreadsheetApp.BorderStyle.SOLID);
  }
  // màu ô thanh (#d #p #o #c #n #t #e) + nhãn trạng thái
  var all = sh.getRange(1, 2, 60, OVW), rules = sh.getConditionalFormatRules();
  [['#d', K.bD], ['#p', K.bP], ['#o', K.bO], ['#c', K.bC], ['#n', K.bN], ['#t', K.bT], ['#e', K.bE]].forEach(function (t) {
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(t[0]).setBackground(t[1]).setFontColor(t[1]).setRanges([all]).build());
  });
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextStartsWith('Approved ·').setBackground(K.doneBg).setFontColor(K.doneFg).setBold(true).setRanges([all]).build());
  sh.setConditionalFormatRules(rules);
  statusCF_(sh, ['B1:' + CL_(OVW + 1) + '60']);
  sh.hideColumns(OVHELP, 2);
  protectWarn_(sh, null);
}

/* ══ Start here ═══════════════════════════════════════════════════════════════════════════ */
function tabLink_(ss, name) { var s = ss.getSheetByName(name); return s ? '=HYPERLINK("#gid=' + s.getSheetId() + '","' + name + '")' : name; }
function buildStart_(ss) {
  var sh = prep_(ss, T.start, [200, 330, 200, 430, 270], K.navy, 46);
  title_(sh, 'START HERE · WHERE DO I UPDATE?', 'One tracker for the IPR-01EF launch. Tabs are named by what you do there: VIEW to read, UPDATE to record work, APPROVE to decide, SETUP once.',
    'Nobody · read me first', 'Nothing', 5);
  var G = [['VIEW', 'VIEW · Overview  ·  VIEW · Timeline', 'Read only. Everything is calculated from the UPDATE and APPROVE tabs.', K.navy],
    ['UPDATE', 'UPDATE · Tasks · Samples · Surveys · Sales', 'Where the work is recorded. White cells only.', K.acc],
    ['APPROVE', 'APPROVE · Phases', 'General Director decides each phase. History of approvals and emails.', K.gold],
    ['SETUP', 'SETUP · Team & plan', 'Owner sets people, emails, baseline dates and lists once.', K.setG],
    ['FILES', 'FILES · Documents', 'File map of the project on Drive.', K.filesG]];
  G.forEach(function (g, i) {
    var c = 2 + i;
    sh.getRange(5, c).setValue(g[0]).setFontSize(8.5).setFontWeight('bold').setFontColor(g[3]);
    sh.getRange(6, c).setValue(g[1]).setFontWeight('bold').setWrap(true);
    sh.getRange(7, c).setValue(g[2]).setFontColor(K.mut).setFontSize(9).setWrap(true).setVerticalAlignment('top');
    sh.getRange(5, c, 3, 1).setBorder(true, true, true, true, null, null, K.line, SpreadsheetApp.BorderStyle.SOLID)
      .setBorder(true, null, null, null, null, null, g[3], SpreadsheetApp.BorderStyle.SOLID_THICK);
  });
  sh.setRowHeight(6, 34); sh.setRowHeight(7, 40);
  section_(sh, 9, 2, 5, 'Find your job', 'Column ribbons: blue = owner fills · green = PIC fills · yellow = approver fills · grey = auto');
  header_(sh, 10, 2, ['I am', 'I want to', 'Go to tab', 'Fill these columns', 'What happens next']);
  var J = [['b', 'Head of Sales & Marketing · project owner'],
    ['Project owner', 'Add a task and assign the PIC', T.tasks, 'No. · Step · Task · PIC · Approval by · Depends on · Needs file · Plan end · Start', 'Menu: Send assignment emails'],
    ['Project owner', 'Set the baseline plan (once)', T.tasks, 'Baseline end; lock date in SETUP · Team & plan', 'Later changes go to Plan end only'],
    ['Project owner', 'Approve a sample shipment', T.smp, 'Approved by', 'Sent date can be entered'],
    ['Project owner', 'Approve survey questions', T.sv, 'Questions approved by', 'Open date can be entered'],
    ['Project owner', 'Approve a task (Approval by = owner)', T.tasks, 'Select the row ▸ menu: Approve selected task', 'Approved on filled, PIC informed by email'],
    ['Project owner', 'Submit a phase for approval', T.appr, 'Menu: Submit a phase for approval (all required criteria met)', 'General Director receives the request'],
    ['b', 'PIC · person in charge of a task'],
    ['PIC', 'Update my task', T.tasks, 'Status · Actual end · Evidence file · Notes', 'Overview and Timeline update'],
    ['PIC', 'Ask for approval of my task', T.tasks, 'Select the row ▸ menu: Submit selected task for approval', 'Approver receives an email'],
    ['PIC', 'Record a sample shipment', T.smp, 'Clinic · Segment · City · Qty · Requested by · Sent date · Survey · Feedback date', 'Feedback due and status are calculated'],
    ['PIC', 'Record a survey', T.sv, 'Survey · Purpose · Type · Form link · Open · Close · Target · Responses; findings at the bottom', 'Status moves Draft → Report done'],
    ['PIC', 'Record monthly sales', T.sales, 'Month · Distributor · Packs · Value · Source file · Entered by', 'Monthly summary updates'],
    ['b', 'General Director · phase approver'],
    ['Approver', 'Approve or return a phase', T.appr, 'Menu: Review & decide a phase (or Decision · Decision date · Comment)', 'Next phase opens; PICs receive an email'],
    ['b', 'Back Office'],
    ['Back Office', 'Confirm registration / import licence', T.tasks, 'Task 1.8: Status · Actual end · Evidence file', 'Sampling opens'],
    ['b', 'Everyone'],
    ['Everyone', 'See progress, who is doing what, what is stuck', T.ov, 'Nothing to fill', ''],
    ['Everyone', 'See plan dates and deadlines by week / month / quarter / year', T.tl, 'View and Start from', '']];
  var r = 11;
  J.forEach(function (j) {
    if (j[0] === 'b') { sh.getRange(r, 2, 1, 5).merge().setValue(j[1]); band_(sh, r, 2, 5); }
    else {
      sh.getRange(r, 2, 1, 5).setValues([[j[0], j[1], tabLink_(ss, j[2]), j[3], j[4]]]);
      sh.getRange(r, 4).setFontWeight('bold').setFontColor(K.navy);
      sh.getRange(r, 5).setWrap(true);
    }
    r++;
  });
  grid_(sh, 11, 2, J.length, 5); sh.getRange(11, 2, J.length, 5).setFontSize(9.5);
  r += 1;
  section_(sh, r, 2, 3, 'Rules that stop the next step'); section_(sh, r, 5, 2, 'Status words'); r++;
  var rules = ['A task cannot be finished before the tasks in "Depends on" are Done.', 'Tasks of a phase cannot start before the previous phase is approved.',
    'A task with "Needs file" = Yes counts only when the evidence file is attached.', 'A phase can be approved only when all required criteria are met, and only by the General Director.',
    'Samples can be sent only after registration is confirmed and the shipment is approved.', 'A survey can open only after its questions are approved and the form link is filled.',
    'Grey cells are calculated: editing them shows a warning and breaks the formulas.'];
  var sw = [['Not started', 'Planned, no work yet'], ['In progress', 'Work has started'], ['Waiting approval', 'Finished, approver to confirm'], ['Done', 'Finished: actual end and file filled'],
    ['To confirm', 'Old record without result'], ['Overdue', 'Plan end passed (flag)'], ['Blocked', 'Waiting for another task (flag)']];
  for (var i = 0; i < 7; i++) {
    sh.getRange(r + i, 2, 1, 3).merge().setValue(rules[i]).setFontSize(9.5);
    sh.getRange(r + i, 5).setValue(sw[i][0]).setHorizontalAlignment('center').setFontWeight('bold');
    sh.getRange(r + i, 6).setValue(sw[i][1]).setFontColor(K.mut).setFontSize(9.5);
    sh.getRange(r + i, 2, 1, 5).setBorder(null, null, true, null, null, null, '#EEF1F4', SpreadsheetApp.BorderStyle.SOLID);
  }
  statusCF_(sh, ['E' + r + ':E' + (r + 6)]);
  sh.getRange(r + 8, 2, 1, 5).merge().setValue('Menu IPR Launch (top bar): assignments, approvals, weekly reminder and rebuild. Emails go out only when someone uses the menu or turns the weekly reminder on.')
    .setFontColor(K.mut).setFontSize(9);
  protectWarn_(sh, null);
  sh.setFrozenRows(3);
}
