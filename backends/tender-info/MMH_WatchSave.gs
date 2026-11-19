/* ════════════════════════════════════════════════════════════════════
   MMH_WatchSave.gs v1.0 (19/11/2026, người dùng: "đưa mọi tài liệu kho tender-docs vào 1 thư mục Drive") —
   botSaveTo {key, folder, name, mime, b64} (CHỈ khoá bot, không nhận phiên email / tiện ích):
   lưu 1 file vào thư mục Drive `folder` — chỉ thư mục nằm trong WTS.ROOTS (hoặc chính nó, ≤ 4 cấp); trùng tên (so NFC) ⇒ bỏ qua.
   Dùng cho workflow "Tender docs ⇒ Drive" (file > 3 MB mà công cụ Drive của phiên Claude không gửi được).
   ════════════════════════════════════════════════════════════════════ */
const WTS = { ROOTS: ['1WhrX1nP96caBbcIGvU6TlNgEyQxbQoGE'] };   // "Bv Mắt Trung ương" — thêm thư mục khác: Script Property WT_SAVE_ROOTS (cách nhau dấu phẩy)

function wtsRoots_() {
  const x = PropertiesService.getScriptProperties().getProperty('WT_SAVE_ROOTS') || '';
  return WTS.ROOTS.concat(x.split(',').map(function (s) { return s.trim(); }).filter(String));
}
function wtsAllowed_(folder) {
  const R = wtsRoots_();
  let f = folder;
  for (let i = 0; i < 5 && f; i++) {
    if (R.indexOf(f.getId()) >= 0) return true;
    const it = f.getParents(); f = it.hasNext() ? it.next() : null;
  }
  return false;
}
function wtsSaveTo_(p) {
  const id = wtS_(p.folder), name = wtS_(p.name).normalize('NFC').replace(/[\\/:*?"<>|]+/g, '_').slice(0, 200);
  if (!id || !name) return { ok: false, error: 'Thiếu folder / name.' };
  let folder;
  try { folder = DriveApp.getFolderById(id); } catch (e) { return { ok: false, error: 'Không mở được thư mục ' + id }; }
  if (!wtsAllowed_(folder)) return { ok: false, error: 'Thư mục không nằm trong vùng được phép ghi.' };
  const it = folder.getFiles();
  while (it.hasNext()) { const f = it.next(); if (String(f.getName()).normalize('NFC') === name && !f.isTrashed()) return { ok: true, skipped: 'exists', id: f.getId(), url: f.getUrl() }; }
  const b64 = wtS_(p.b64);
  if (!b64) return { ok: false, error: 'Thiếu nội dung file.' };
  const blob = Utilities.newBlob(Utilities.base64Decode(b64), wtS_(p.mime) || 'application/octet-stream', name);
  const f = folder.createFile(blob);
  return { ok: true, id: f.getId(), url: f.getUrl(), size: f.getSize() };
}
