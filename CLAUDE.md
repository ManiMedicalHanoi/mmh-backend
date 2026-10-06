# mmh-backend — quy tắc cho Claude

Kho riêng tư chứa code Apps Script của **mọi app** MMH (đầu tiên: 7 backend của `ManiMedicalHanoi/MMH-Report`;
`backends.json` ▸ `apps` ghi app nào dùng backend nào). Quy trình đầy đủ: skill `gh-webapp-upgrader` ▸ `references/backend-deploy.md`.
Người dùng là nhân sự MANI Medical Hanoi, không rành kỹ thuật — **trả lời bằng tiếng Việt**.

- Sửa backend = sửa file trong `backends/<key>/` → PR → squash merge `main` ⇒ workflow **Deploy backend** tự deploy
  (cập nhật deployment cũ, URL không đổi). Không gửi file `.gs` cho người dùng dán tay nữa.
- Trước khi sửa: đảm bảo `backends/<key>/` là bản mới nhất. Deploy báo "sửa trực tiếp" ⇒ chạy workflow **Kéo code về**
  (input `backend=<key>`), đợi commit của bot, rồi áp lại thay đổi trên bản mới.
- Không đổi mục `webapp` trong `appsscript.json` (bị chặn). Không tạo deployment mới.
- Thêm app mới: README ▸ "Thêm backend của một app khác" (`tools/scan-app.mjs`).
- Backend dùng chung nhiều app (vd. Training Hub): sửa phải giữ tương thích cho mọi app trong `apps`.
- Trước khi push: `node tools/syntax.mjs`; sửa `tools/` thì chạy thêm `node tools/selftest.mjs`.
- Sau khi gộp: xem kết quả workflow Deploy; đỏ ⇒ đọc log, sửa, gộp lại. Gọi thử lỗi thì web app đã tự quay về phiên bản
  trước — vẫn phải sửa code trong repo.
- Thay đổi backend kèm thay đổi app: gộp backend **trước**, đợi Deploy xanh, rồi mới gộp frontend.
- Việc còn dở / đã hứa: `TODO.md` — đọc trước khi bắt đầu.
- `script.google.com` bị chặn trong môi trường Claude; GitHub Actions thì gọi được.
