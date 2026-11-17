/*************************************************************************************************
 * TH_Mention.gs — @TAG A COLLEAGUE IN A CUSTOMER TASK · v1.0 (17/11/2026, Yong: "when I visit a clinic with Man san / Sui san,
 * can I tag them so they know, and it is in their report too?")
 * IDENTICAL in crm-thai and crm-thai-dental (edit one ⇒ copy to the other).
 *
 * · The app offers "@Name" while typing in Task Result / Plan / Next action (only names of this team: USERS with team = CFG.TEAM_LABEL).
 * · saveWeekly_ ⇒ menNotify_: people NEWLY tagged (not tagged in the text before, not the writer) get 1 line in RH_Notify of the
 *   Training Master (App "CRM", Kind "mention") ⇒ bell "Mentions" in CRM / Report Hub; link opens the task read-only in the CRM
 *   (#tag=<team>:<row>:<date>). No e-mail.
 * · weeklyHtml_ ⇒ menTagged_: tasks of OTHER people of the week that tag this PIC are added to his / her weekly report,
 *   marked "Joint · logged by …". KPI counts are NOT changed (a visit still counts once, for the PIC who logged it).
 *************************************************************************************************/
var MEN = { MASTER_ID: '1byCL6NjhqBuEcd-K5pxYRrQj2XXs6GMIvR79x45mHRQ', CRM_URL: 'https://manimedicalhanoi.github.io/MMH-CRM/' };
function menTeamKey_(){ return (CFG && CFG.KEY) ? CFG.KEY : (/dental/i.test(String(CFG && CFG.TEAM || '')) ? 'thaid' : 'thai'); }
/* names that can be tagged: people of this team (lead + PIC), longest first so "Nguyen Ha"-style names win over a prefix */
function menPeople_(){
  return Object.keys(USERS).filter(function(n){ return USERS[n] && USERS[n].team === CFG.TEAM_LABEL; })
    .sort(function(a, b){ return b.length - a.length; });
}
/* "@Man", "@man", "@Man," … ⇒ ['Man'] (only known names, no duplicates) */
function menNames_(text){
  var t = String(text || ''), out = [];
  if(t.indexOf('@') < 0) return out;
  menPeople_().forEach(function(n){
    var re = new RegExp('(^|[^A-Za-z0-9_@])@' + n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+') + '(?![A-Za-z0-9_])', 'i');
    if(re.test(t) && out.indexOf(n) < 0) out.push(n);
  });
  return out;
}
function menText_(o){ o = o || {}; return [o.plan, o.result, o.nextAction, o.feedback].map(function(x){ return x == null ? '' : String(x); }).join('\n'); }
/* short text of the result for the notice: without the 4 headings */
function menSnippet_(s){
  return String(s || '').replace(/^\s*[1-4]\s*[.)]\s*(Actions Taken|Current Situation|Customer Feedback|Opportunities\s*\/\s*Next Steps)\s*:?/gim, '')
    .replace(/\s+/g, ' ').trim().slice(0, 220);
}
function menNotify_(user, d, cur, row){
  var merged = {}; ['plan', 'result', 'nextAction', 'feedback', 'account', 'start', 'typeAction', 'pic'].forEach(function(k){
    merged[k] = (d && d[k] !== undefined && d[k] !== null) ? d[k] : (cur ? cur[k] : ''); });
  var now = menNames_(menText_(merged)), before = cur ? menNames_(menText_(cur)) : [];
  var me = str_(user && user.pic), owner = str_(merged.pic) || me;
  var fresh = now.filter(function(n){ return before.indexOf(n) < 0 && !picEq_(n, me) && !picEq_(n, owner); });
  if(!fresh.length) return [];
  if(typeof tmOn_ === 'function' && tmOn_()) return [];                        /* Admin TEST mode: no notice for real people */
  var acc = parseAcc_(merged.account || '').name || ('row ' + row), date = iso_(merged.start || '');
  var title = me + ' tagged you · ' + acc + (date ? ' · ' + dmy_(date) : '');
  var text = (str_(merged.typeAction) ? str_(merged.typeAction) + ' — ' : '') + (menSnippet_(merged.result) || menSnippet_(merged.plan));
  var url = MEN.CRM_URL + '#tag=' + menTeamKey_() + ':' + row + ':' + date;
  var HDR = ['Id', 'At', 'To', 'App', 'Kind', 'Title', 'Text', 'Url', 'By', 'EventId', 'TaskId', 'SeenAt'], at = new Date();
  var rows = fresh.map(function(n){ return ['N' + Utilities.getUuid().replace(/-/g, '').slice(0, 12), at, n, 'CRM', 'mention', title.slice(0, 300), text.slice(0, 900), url, me, '', menTeamKey_() + ':' + row, '']; });
  var book = SpreadsheetApp.openById(MEN.MASTER_ID), sh = book.getSheetByName('RH_Notify');
  if(!sh){ sh = book.insertSheet('RH_Notify'); sh.getRange(1, 1, 1, HDR.length).setValues([HDR]).setFontWeight('bold'); sh.setFrozenRows(1); }
  sh.getRange(sh.getLastRow() + 1, 1, rows.length, HDR.length).setValues(rows);
  return fresh;
}
/* tasks of other people in [from, to] that tag `pic` ⇒ rows for his / her weekly report */
function menTagged_(pic, from, to){
  return weeklyRows_().filter(function(w){
    return !picEq_(w.pic, pic) && spanHit_(w.start, w.finish, from, to) && menNames_(menText_(w)).some(function(n){ return picEq_(n, pic); });
  }).map(function(w){
    var o = {}; for(var k in w) o[k] = w[k];
    o.result = 'Joint · logged by ' + w.pic + (w.result ? '\n' + w.result : '');
    if(!w.result && w.plan) o.plan = 'Joint · planned by ' + w.pic + '\n' + w.plan;
    return o;
  });
}
