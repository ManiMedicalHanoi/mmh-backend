# Mẫu file Excel dự trù cho NPP

`Mau_Excel.gs` (base64 của file .xlsx mẫu) được dựng từ thư mục này — không sửa tay:

```
python3 -I build_tpl.py /tmp/template.xlsx        # bố cục, công thức, chữ {{…}} (script thay khi xuất)
python3 -I mk_mau.py /tmp/template.xlsx ../Mau_Excel.gs
```

- Sheet DỮ LIỆU (ẩn) do `Mã.gs` ▸ `dlSheetXml_` ghi lại toàn bộ; công thức trong mẫu đọc tới dòng `R0 + MAXR − 1` (3.000 mã).
- Chữ `{{T}}`, `{{NPP}}`, `{{HAN}}`, `{{LASTP}}`, `{{HM1}}…{{HM10}}`… được thay trong `buildXlsx_`.
- Khi nhập, file NPP được nhận diện bằng ký hiệu `MMH_DUTRU_NPP_V1` ở ô A1:B1 của sheet ẩn và tiêu đề cột
  "Mã hàng (chọn trong danh sách)" / "SỐ DỰ TRÙ…" — không phụ thuộc tên sheet, tên file.
- Cần `openpyxl`. Kiểm thử (ngoài repo): mock SpreadsheetApp + LibreOffice tính lại công thức.
