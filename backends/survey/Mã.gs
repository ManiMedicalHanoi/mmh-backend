/**
 * PHIẾU KHẢO SÁT Ý KIẾN BÁC SĨ NHÃN KHOA VOS 2026
 * Chỉ khâu trong phẫu thuật lác và treo IOL, dao phẫu thuật trong mổ Phaco
 * MANI Medical Hanoi (MMH)
 *
 * Cách chạy: dán toàn bộ file vào script.google.com, chọn hàm createSurveyForm, bấm Run.
 * Kết quả: 1 Google Form + 1 Google Sheet lưu câu trả lời.
 * Cả Form và Sheet mở cho mọi người có link: trả lời, xem và chỉnh sửa.
 *
 * Quy tắc bắt buộc: tất cả câu hỏi bắt buộc, trừ Phần 2 (phẫu thuật lác).
 * Phần 3 có câu sàng lọc: bác sĩ không thực hiện treo / cố định IOL sẽ được chuyển thẳng sang Phần 4.
 */

function createSurveyForm() {
  var CONFIG = {
    title: "Phiếu khảo sát ý kiến bác sĩ nhãn khoa VOS 2026",
    description:
      "Chủ đề: Chỉ khâu trong phẫu thuật lác và treo thủy tinh thể nhân tạo (IOL), dao phẫu thuật trong mổ Phaco\n" +
      "Đơn vị thực hiện: MANI Medical Hanoi (MMH)\n" +
      "Thời gian trả lời: khoảng 5 phút\n\n" +
      "Kính gửi Quý bác sĩ,\n\n" +
      "MANI Medical Hanoi trân trọng cảm ơn Quý bác sĩ đã dành thời gian tham gia khảo sát. Ý kiến của Quý bác sĩ giúp chúng tôi hiểu rõ hơn thực tế lâm sàng, từ đó cung cấp sản phẩm và hỗ trợ phù hợp hơn với nhu cầu phẫu thuật. Thông tin chỉ dùng cho mục đích nghiên cứu nội bộ và được bảo mật."
  };

  // ===== TẠO FORM =====
  var form = FormApp.create(CONFIG.title);
  form.setTitle(CONFIG.title);
  form.setDescription(CONFIG.description);
  form.setIsQuiz(false);
  form.setCollectEmail(false);          // không bắt đăng nhập, ai có link cũng trả lời được
  form.setLimitOneResponsePerUser(false);
  form.setAllowResponseEdits(false);
  form.setShuffleQuestions(false);
  form.setProgressBar(true);
  form.setShowLinkToRespondAgain(false);
  form.setPublishingSummary(true);      // mở trang thống kê tổng hợp cho mọi người
  form.setConfirmationMessage("MANI Medical Hanoi trân trọng cảm ơn Quý bác sĩ!");

  // ===== PHẦN 1. THÔNG TIN CHUNG =====
  form.addSectionHeaderItem()
    .setTitle("PHẦN 1. THÔNG TIN CHUNG");

  form.addSectionHeaderItem()
    .setTitle("Câu 1. Thông tin Quý bác sĩ");

  addText(form, "Họ và tên", true);

  addPhone(form, "Số điện thoại", true);

  addText(form, "Tên bệnh viện / cơ sở công tác", true);

  addCheckbox(form, "Lĩnh vực chuyên môn chính (có thể chọn nhiều)", [
    "Phẫu thuật đục thủy tinh thể (Phaco) / bán phần trước",
    "Lác và nhãn nhi",
    "Dịch kính võng mạc",
    "Glôcôm",
    "Giác mạc",
    "Tạo hình mi và hốc mắt"
  ], true, true);

  form.addGridItem()
    .setTitle("Câu 2. Trung bình mỗi tháng, Quý bác sĩ trực tiếp thực hiện khoảng bao nhiêu ca?")
    .setRows([
      "Phaco",
      "Phẫu thuật lác",
      "Treo / cố định IOL vào củng mạc"
    ])
    .setColumns([
      "Không thực hiện",
      "Dưới 10 ca",
      "10 đến 50 ca",
      "51 đến 100 ca",
      "Trên 100 ca"
    ])
    .setRequired(true);

  // ===== PHẦN 2. CHỈ KHÂU TRONG PHẪU THUẬT LÁC (KHÔNG BẮT BUỘC) =====
  form.addPageBreakItem()
    .setTitle("PHẦN 2. CHỈ KHÂU TRONG PHẪU THUẬT LÁC")
    .setHelpText("Nếu Quý bác sĩ không thực hiện phẫu thuật lác, xin bấm \"Tiếp\" để chuyển sang Phần 3.");

  form.addSectionHeaderItem()
    .setTitle("Câu 3. Khi khâu cơ vào củng mạc, Quý bác sĩ thường dùng loại chỉ nào?");

  addChoice(form, "Chất liệu chỉ", [
    "Chỉ tự tiêu sợi bện (PGA / Polyglactin)",
    "Chỉ không tiêu (Nylon, Polyester…)"
  ], true, false);

  addChoice(form, "Cỡ chỉ thường dùng", ["5-0", "6-0"], true, false);

  addChoice(form, "Kiểu kim thường dùng", [
    "Kim lục giác",
    "Kim hình thang",
    "Kim tròn",
    "Không rõ / tùy sản phẩm có sẵn"
  ], false, false);

  addChoice(form, "Độ cong kim", ["1/4 vòng", "3/8 vòng"], true, false);

  addText(form, "Hãng đang sử dụng", false);

  addChoice(form, "Quý bác sĩ có áp dụng kỹ thuật khâu chỉ điều chỉnh được (chỉnh lại sau mổ) không?", [
    "Thường xuyên",
    "Thỉnh thoảng",
    "Không áp dụng"
  ], false, false);

  addCheckbox(form, "Câu 4. Trong phẫu thuật lác, Quý bác sĩ thường gặp những khó khăn nào với chỉ khâu? (có thể chọn nhiều)", [
    "Khó kiểm soát độ sâu, kim dễ đi sâu hoặc có nguy cơ thủng củng mạc",
    "Kim không đủ sắc, phải dùng lực nhiều khi xuyên củng mạc",
    "Kim dễ cong hoặc biến dạng sau vài mũi khâu",
    "Chỉ dễ sờn, xơ hoặc đứt khi thắt nút",
    "Nút chỉ dễ trượt hoặc lỏng",
    "Phản ứng mô sau mổ (viêm, u hạt chỉ, nang kết mạc)",
    "Thời gian tiêu chỉ chưa phù hợp (tiêu quá nhanh hoặc quá chậm)",
    "Chiều dài chỉ chưa phù hợp với thao tác",
    "Khó mua đúng cỡ chỉ, kiểu kim mong muốn"
  ], true, false);

  addRanking(form,
    "Câu 5. Khi lựa chọn chỉ cho phẫu thuật lác, Quý bác sĩ ưu tiên những tiêu chí nào nhất?",
    [
      "Kim sắc, xuyên củng mạc nhẹ nhàng",
      "Độ cong kim giúp đi nông, kiểm soát tốt độ sâu",
      "Chỉ giữ đủ lực cho đến khi cơ dính liền với củng mạc",
      "Ít phản ứng mô",
      "Dễ thắt nút, nút chỉ chắc",
      "Giá thành hợp lý",
      "Nguồn cung ổn định, có sẵn trong danh mục thầu của bệnh viện"
    ], false);

  // ===== PHẦN 3. CHỈ KHÂU TRONG TREO / CỐ ĐỊNH IOL =====
  form.addPageBreakItem()
    .setTitle("PHẦN 3. CHỈ KHÂU TRONG TREO / CỐ ĐỊNH IOL");

  // Câu sàng lọc: "Không" → chuyển thẳng sang Phần 4 (gán điều hướng ở cuối, sau khi tạo Phần 4)
  var gateIOL = form.addMultipleChoiceItem()
    .setTitle("Quý bác sĩ có thực hiện treo / cố định IOL không?")
    .setRequired(true);

  form.addPageBreakItem()
    .setTitle("PHẦN 3. CHỈ KHÂU TRONG TREO / CỐ ĐỊNH IOL (tiếp)");

  form.addGridItem()
    .setTitle("Câu 6. Với mắt không còn bao đỡ thủy tinh thể nhân tạo, Quý bác sĩ thường chọn phương pháp nào?")
    .setHelpText("Xin chọn mức tỷ lệ áp dụng ước tính cho từng phương pháp.")
    .setRows([
      "Khâu cố định IOL vào củng mạc bằng chỉ",
      "Cố định càng IOL trong củng mạc không khâu (Yamane hoặc tương tự)",
      "Đặt IOL tiền phòng",
      "Cố định IOL vào mống mắt",
      "Phương pháp khác"
    ])
    .setColumns([
      "Không áp dụng",
      "Dưới 25%",
      "25% đến 50%",
      "51% đến 75%",
      "Trên 75%"
    ])
    .setRequired(true);

  form.addSectionHeaderItem()
    .setTitle("Câu 7. Khi khâu cố định IOL, Quý bác sĩ thường dùng loại chỉ nào?");

  addChoice(form, "Chất liệu chỉ", [
    "Polypropylene",
    "Nylon",
    "Chỉ PTFE (Gore-Tex)"
  ], true, true);

  addChoice(form, "Cỡ chỉ", ["9-0", "10-0"], true, true);

  addChoice(form, "Dạng chỉ và kim", [
    "Cặp chỉ hai đầu kim (kim thẳng kèm kim cong)",
    "Chỉ có vòng sẵn gắn vào kim",
    "Chỉ một đầu kim cong dài"
  ], true, true);

  addText(form, "Hãng đang sử dụng", true);

  addCheckbox(form, "Câu 8. Khi treo / cố định IOL bằng chỉ, Quý bác sĩ quan ngại hoặc thường gặp những vấn đề nào? (có thể chọn nhiều)", [
    "Lo ngại đứt chỉ hoặc chỉ thoái hóa sau nhiều năm",
    "Lộ chỉ hoặc lộ nút chỉ qua kết mạc",
    "IOL nghiêng hoặc lệch tâm sau mổ",
    "Kim khó xuyên đúng điểm ra ở phía đối diện",
    "Kim cong hoặc biến dạng khi xuyên củng mạc",
    "Chỉ quá ngắn hoặc quá dài, khó thao tác",
    "Sản phẩm không có sẵn tại cơ sở, phải đặt riêng",
    "Giá thành cao so với mức thanh toán"
  ], true, true);

  // ===== PHẦN 4. DAO PHẪU THUẬT TRONG MỔ PHACO =====
  var part4 = form.addPageBreakItem()
    .setTitle("PHẦN 4. DAO PHẪU THUẬT TRONG MỔ PHACO");

  form.addSectionHeaderItem()
    .setTitle("Câu 9. Trong một ca Phaco thường quy, Quý bác sĩ sử dụng những loại dao nào?")
    .setHelpText("Có thể chọn nhiều đáp án ở mỗi mục.");

  addCheckbox(form, "Tạo cổng bên", [
    "Dao tạo cổng bên 1,0 mm",
    "Dao thẳng 15°",
    "Dao MVR"
  ], true, true);

  addCheckbox(form, "Đường rạch chính", [
    "Dao rạch lưỡi phẳng",
    "Dao rạch lưỡi cong (dạng vòm)"
  ], true, true);

  addCheckbox(form, "Cỡ đường rạch chính thường dùng", [
    "2,2 mm",
    "2,4 mm",
    "2,6 đến 2,75 mm",
    "2,8 đến 3,0 mm"
  ], true, true);

  addCheckbox(form, "Dao khác", [
    "Dao mở rộng vết mổ khi đặt IOL",
    "Dao lưỡi liềm (khi mổ đường hầm củng mạc)",
    "Không sử dụng dao khác"
  ], true, true);

  addChoice(form, "Tổng số dao dùng cho một ca", [
    "1 dao",
    "2 dao",
    "3 dao trở lên"
  ], false, true);

  addText(form, "Hãng dao đang sử dụng", true);

  addChoice(form, "Tại cơ sở của Quý bác sĩ, một con dao thường được sử dụng cho:", [
    "1 ca",
    "1 buổi mổ (nhiều ca)",
    "Nhiều buổi mổ (có tiệt trùng lại)"
  ], false, true);

  addCheckbox(form, "Câu 10. Quý bác sĩ thường gặp những vấn đề nào khi sử dụng dao trong mổ Phaco? (có thể chọn nhiều)", [
    "Lực cản lớn khi xuyên giác mạc, phải ấn mạnh tay",
    "Dao giảm độ sắc nhanh ở các ca sau trong cùng buổi mổ",
    "Mép đường rạch không gọn, đường rạch rộng hơn cỡ dao",
    "Đường rạch không tự kín, phải bơm phù nhu mô nhiều hoặc phải khâu",
    "Vào tiền phòng sớm, đường hầm ngắn hơn mong muốn",
    "Lưỡi dao phản chiếu ánh sáng kính hiển vi, gây chói khi thao tác",
    "Khó thao tác ở mắt sâu, khe mi hẹp (dao vướng vành mi hoặc khăn phủ)",
    "Cỡ dao không khớp với đầu Phaco hoặc dụng cụ bơm IOL",
    "Chất lượng không đồng đều giữa các con dao hoặc các lô"
  ], true, true);

  addText(form, "Trong các vấn đề trên, vấn đề nào ảnh hưởng nhiều nhất đến Quý bác sĩ?", true);

  addRanking(form,
    "Câu 11. Khi lựa chọn dao, Quý bác sĩ ưu tiên những tiêu chí nào nhất?",
    [
      "Độ sắc, xuyên mô nhẹ nhàng",
      "Chất lượng đồng đều giữa các con dao",
      "Kích thước lưỡi chính xác, đường rạch đúng cỡ",
      "Lưỡi chống chói dưới kính hiển vi",
      "Đầu dao ngắn, dễ thao tác ở mắt sâu, khe mi hẹp",
      "Có vạch đánh dấu độ sâu trên lưỡi",
      "Dao an toàn có nắp chắn bảo vệ lưỡi",
      "Giá thành hợp lý",
      "Có sẵn trong danh mục thầu của bệnh viện"
    ], true);

  // ===== GÁN ĐIỀU HƯỚNG CHO CÂU SÀNG LỌC PHẦN 3 =====
  gateIOL.setChoices([
    gateIOL.createChoice("Có", FormApp.PageNavigationType.CONTINUE),
    gateIOL.createChoice("Không (chuyển sang Phần 4)", part4)
  ]);

  // ===== PHÁT HÀNH FORM =====
  try { form.setPublished(true); } catch (e) { /* tài khoản cũ không cần bước này */ }

  // ===== GOOGLE SHEET LƯU CÂU TRẢ LỜI =====
  var ss = SpreadsheetApp.create(CONFIG.title + " (Kết quả)");
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());

  // ===== MỞ QUYỀN SỬA / XEM CHO MỌI NGƯỜI CÓ LINK =====
  var shareNotes = [];
  shareNotes.push(openToAnyone(ss.getId(), "Google Sheet kết quả"));
  shareNotes.push(openToAnyone(form.getId(), "File Google Form"));

  // ===== LOG LINK =====
  var formUrl = form.getPublishedUrl();
  var shortUrl = formUrl;
  try { shortUrl = form.shortenFormUrl(formUrl); } catch (e) {}
  var summaryUrl = formUrl.replace("/viewform", "/viewanalytics");

  Logger.log("========================================");
  Logger.log("FORM ĐÃ TẠO THÀNH CÔNG");
  Logger.log("========================================");
  Logger.log("Link khảo sát: " + shortUrl);
  Logger.log("Link kết quả: " + ss.getUrl());
  Logger.log("Link chỉnh sửa: " + form.getEditUrl());
  Logger.log("Link thống kê: " + summaryUrl);
  Logger.log("----------------------------------------");
  shareNotes.forEach(function (n) { Logger.log(n); });
  Logger.log("========================================");
}

// ===================== HÀM HỖ TRỢ =====================

function addChoice(form, title, options, hasOther, required) {
  var item = form.addMultipleChoiceItem().setTitle(title);
  item.setChoices(options.map(function (o) { return item.createChoice(o); }));
  if (hasOther) item.showOtherOption(true);
  item.setRequired(required);
  return item;
}

function addCheckbox(form, title, options, hasOther, required) {
  var item = form.addCheckboxItem().setTitle(title);
  item.setChoices(options.map(function (o) { return item.createChoice(o); }));
  if (hasOther) item.showOtherOption(true);
  item.setRequired(required);
  return item;
}

function addText(form, title, required) {
  return form.addTextItem().setTitle(title).setRequired(required);
}

// SĐT Việt Nam: bắt đầu bằng 0 hoặc +84, cho phép dấu cách / dấu chấm giữa các số
function addPhone(form, title, required) {
  var v = FormApp.createTextValidation()
    .setHelpText("Vui lòng nhập số điện thoại hợp lệ, ví dụ 0912 345 678.")
    .requireTextMatchesPattern("^(0|\\+84)[0-9 .]{8,13}$")
    .build();
  return form.addTextItem().setTitle(title).setValidation(v).setRequired(required);
}

// Câu tiêu chí ưu tiên: checkbox, chọn tối đa 3
function addRanking(form, title, criteria, required) {
  var item = form.addCheckboxItem()
    .setTitle(title + " (chọn tối đa 3)")
    .setChoiceValues(criteria);
  var v = FormApp.createCheckboxValidation()
    .setHelpText("Xin chọn tối đa 3 tiêu chí.")
    .requireSelectAtMost(3)
    .build();
  item.setValidation(v);
  item.setRequired(required);
  return item;
}

function openToAnyone(fileId, label) {
  try {
    DriveApp.getFileById(fileId)
      .setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.EDIT);
    return "Đã mở quyền chỉnh sửa cho mọi người có link: " + label;
  } catch (e) {
    return "Chưa mở được quyền cho " + label + ", vui lòng mở thủ công trong nút Chia sẻ. Lý do: " + e.message;
  }
}