function onEdit(e) {
  const sheet = e.range.getSheet();
  const row   = e.range.getRow();
  const col   = e.range.getColumn();

  // Cột N = 14 (Status), Cột O = 15 (Actual Finish)
  // Điều chỉnh số cột nếu khác
  const STATUS_COL = 14;
  const ACTUAL_COL = 15;

  if (col !== STATUS_COL || row < 7) return;

  const status     = e.range.getValue();
  const actualCell = sheet.getRange(row, ACTUAL_COL);

  if (status === "Completed" && actualCell.getValue() === "") {
    actualCell.setValue(Utilities.formatDate(
      new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy"
    ));
  }
  // Nếu đổi lại từ Completed → trạng thái khác, xóa ngày
  if (status !== "Completed") {
    actualCell.clearContent();
  }
}