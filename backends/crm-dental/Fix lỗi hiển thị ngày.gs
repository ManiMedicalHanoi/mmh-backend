/**
 * Fix cột Start Date theo Start Month – sheet "6. WEEKLY REPORT"
 * Chạy fixStartDate_Preview() trước để xem log, sau đó chạy fixStartDate() để ghi.
 */
const WR_SHEET = '6. WEEKLY REPORT';

function fixStartDate_Preview() { _fixStartDate(false); }
function fixStartDate()         { _fixStartDate(true);  }

function _fixStartDate(apply) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(WR_SHEET);
  if (!sh) throw new Error('Không tìm thấy sheet ' + WR_SHEET);
  const tz = ss.getSpreadsheetTimeZone();
  const lastRow = sh.getLastRow(), lastCol = sh.getLastColumn();

  // Tìm dòng header chứa "Start Month" & "Start Date" (mặc định D/E, header dòng 1)
  let hdr = 0, cM = 3, cD = 4;
  const top = sh.getRange(1, 1, Math.min(10, lastRow), lastCol).getDisplayValues();
  for (let r = 0; r < top.length; r++) {
    const row = top[r].map(s => String(s).trim().toLowerCase());
    const m = row.indexOf('start month'), d = row.indexOf('start date');
    if (m > -1 && d > -1) { hdr = r + 1; cM = m; cD = d; break; }
  }
  const startRow = hdr + 1, n = lastRow - hdr;
  if (n < 1) return;

  const months = sh.getRange(startRow, cM + 1, n, 1).getValues();
  const dRange = sh.getRange(startRow, cD + 1, n, 1);
  const vals = dRange.getValues();

  const valid = (y, m, d) => m >= 1 && m <= 12 && d >= 1 && d <= new Date(y, m, 0).getDate();
  const mk = (y, m, d) => new Date(y, m - 1, d, 12); // 12h trưa để tránh lệch múi giờ

  let fixed = [], unresolved = [];
  const out = vals.map((r, i) => {
    const v = r[0], rowNo = startRow + i;
    const ym = String(months[i][0]).replace(/\D/g, '');
    if (v === '' || v === null || ym.length !== 6) return [v];
    const mo = +ym.slice(4, 6);

    let y, a, b; // a = ngày, b = tháng (theo cách Sheets đang hiểu)
    if (v instanceof Date) {
      const p = Utilities.formatDate(v, tz, 'yyyy-M-d').split('-').map(Number);
      y = p[0]; b = p[1]; a = p[2];
    } else {
      const p = String(v).trim().match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
      if (!p) { unresolved.push(rowNo + ': ' + v); return [v]; }
      a = +p[1]; b = +p[2]; y = +p[3];            // giả định text đang là dd/MM
    }

    if (b === mo && valid(y, b, a)) {             // tháng đã đúng
      return [v instanceof Date ? v : mk(y, b, a)];
    }
    if (a === mo && valid(y, a, b)) {             // bị đảo → đổi lại
      fixed.push(`${rowNo}: ${v instanceof Date ? Utilities.formatDate(v, tz, 'dd/MM/yyyy') : v} → ${('0'+b).slice(-2)}/${('0'+a).slice(-2)}/${y}`);
      return [mk(y, a, b)];
    }
    unresolved.push(`${rowNo}: ${v} (Start Month ${ym})`);
    return [v];
  });

  Logger.log('Sẽ sửa %s dòng:\n%s', fixed.length, fixed.join('\n'));
  Logger.log('Không tự xử lý được %s dòng:\n%s', unresolved.length, unresolved.join('\n'));

  if (apply) {
    dRange.setValues(out).setNumberFormat('dd/MM/yyyy');
    SpreadsheetApp.getUi().alert(`Đã sửa ${fixed.length} dòng.\nCần kiểm tra tay ${unresolved.length} dòng (xem Log).`);
  }
}