/**
 * Ngân hàng câu hỏi — bài kiểm tra đối tác (NPP, đại lý) sau 2 bài đào tạo nha khoa (16/11/2026).
 * Người dùng duyệt 20 câu / bài trong tài liệu "Đào tạo đối tác nha khoa MMH: kịch bản 2 bài" (Claude Docs).
 * Mỗi lượt rút n câu rải đều theo chương (c). o = 4 đáp án, a = chỉ số đáp án đúng (0..3), x = giải thích hiện sau khi trả lời.
 * Không đưa kế hoạch sản phẩm sắp ra mắt / thông tin thị trường vào đây (người dùng yêu cầu).
 */
var PQ_BANK = {
  'nha-khoa-1': {
    title: 'Dụng cụ nội nha và mũi khoan MANI',
    sub: 'Bài kiểm tra · Bài 1',
    perQ: 20, n: 10, pass: 8,
    qs: [
      { c: 1, q: 'Mũi khoan chuôi FG lắp vào loại tay khoan nào?', o: ['Contra-angle', 'Turbine hơi', 'Máy nội nha', 'Tay khoan thẳng'], a: 1, x: 'Chuôi FG đường kính 1,6 mm, dùng với turbine hơi.' },
      { c: 1, q: 'Chuôi CA có đường kính bao nhiêu?', o: ['1,6 mm', '3,0 mm', '2,35 mm', '1,0 mm'], a: 2, x: 'Chuôi CA 2,35 mm, lắp tay khoan contra-angle.' },
      { c: 3, q: 'Biểu tượng hình tròn trên đầu cán là trâm gì?', o: ['K-File', 'Reamer', 'D Finder', 'H-File'], a: 3, x: 'Tam giác là Reamer, vuông là K-File, tròn là H-File.' },
      { c: 3, q: 'Màu cán trâm tay cho biết điều gì?', o: ['Cỡ trâm', 'Chiều dài', 'Vật liệu', 'Hạn dùng'], a: 0, x: 'Màu cán theo chuẩn ISO cho biết cỡ; màu vòng chặn cho biết chiều dài.' },
      { c: 3, q: 'H-File được thao tác thế nào?', o: ['Xoay liên tục', 'Xoay 1/4 vòng rồi kéo', 'Chỉ kéo lên, đẩy xuống', 'Xoay ngược chiều'], a: 2, x: 'H-File cắt mạnh, xoay sẽ dễ gãy.' },
      { c: 3, q: 'Kỹ thuật 8-10 phối hợp hai trâm nào?', o: ['K-File #08 + H-File #10', 'Reamer #08 + RT File #10', 'JIZAI I + JIZAI II', 'D Finder #08 + Glide Finder #10'], a: 3, x: 'Luân phiên D Finder #08 và Glide Finder #10 cho ống tủy vôi hoá, cong.' },
      { c: 4, q: 'Ba giá trị cốt lõi của JIZAI?', o: ['Nhanh · Rẻ · Nhẹ', 'Bền bỉ · Linh hoạt · Đơn giản', 'Cứng · Thẳng · Dài', 'Mỏng · Sắc · Bóng'], a: 1, x: 'Bền bỉ, linh hoạt, đơn giản.' },
      { c: 4, q: 'JIZAI có mấy trâm tạo hình chính?', o: ['3', '2', '6', '10'], a: 0, x: 'JIZAI I, II, III cho hầu hết các ca.' },
      { c: 4, q: 'Cài máy cho JIZAI Glider ở tốc độ nào?', o: ['150 vòng/phút', '300 vòng/phút', '500 vòng/phút', '1.000 vòng/phút'], a: 1, x: 'Glider 300 vòng/phút, 1,0 N·cm; các trâm khác 500 vòng/phút.' },
      { c: 4, q: 'Ống tủy vôi hoá, cong nhiều: thêm trâm nào sau Glider?', o: ['Orifice Opener', 'JIZAI III', 'JIZAI 020/04', 'H-File'], a: 2, x: '020/04 đặt giữa Glider và JIZAI I, giảm 56% lực cắt lên JIZAI I (thử nghiệm MANI).' },
      { c: 4, q: 'Thông điệp chính của EndoCompath?', o: ['Thăm dò xong tạo hình ngay', 'Chỉ cần trâm máy', 'Tạo đường trượt rồi mới tạo hình', 'Bỏ bước thăm dò'], a: 2, x: 'Thăm dò thông chưa đủ: cần tạo đường trượt để giảm gãy trâm.' },
      { c: 5, q: 'Vì sao mũi kim cương cắt men răng hiệu quả?', o: ['Kim cương cứng hơn men', 'Men mềm hơn ngà', 'Nhờ quay chậm', 'Nhờ không phun nước'], a: 0, x: 'Thang Mohs: kim cương 10, men răng 7.' },
      { c: 5, q: 'Vòng màu vàng trên DIA-BURS là hạt gì?', o: ['Siêu thô', 'Tiêu chuẩn', 'Mịn', 'Siêu mịn'], a: 3, x: 'Đen siêu thô, xanh lá thô, xanh dương tiêu chuẩn, đỏ mịn, vàng siêu mịn.' },
      { c: 5, q: 'Trong mã TR-13EF, "EF" là gì?', o: ['Hình dạng đầu', 'Độ hạt siêu mịn', 'Chiều dài chuôi', 'Tốc độ tối đa'], a: 1, x: 'Mã đọc: hình dạng (TR) · số model (13) · độ hạt (EF).' },
      { c: 6, q: 'Cần tháo mão kim loại cũ, gợi ý mũi nào?', o: ['Carbide #330, #330P', 'MI Stainless', 'IPR-01EF', 'DIA-BURS CD'], a: 0, x: 'Carbide cắt bằng lưỡi, phù hợp cắt kim loại.' },
      { c: 6, q: 'Surgical Burs 25 / 28 mm dùng tay khoan nào?', o: ['Turbine hơi', 'Bất kỳ tay khoan', 'Tay khoan thẳng', 'Chỉ contra-angle'], a: 3, x: 'Chỉ contra-angle, tối đa 120.000 vòng/phút.' },
      { c: 6, q: 'MI Stainless Burs cắt chọn lọc thế nào?', o: ['Cắt cả ngà lành', 'Cắt ngà mềm, giữ ngà lành', 'Chỉ cắt men', 'Dùng mài mão sứ'], a: 1, x: 'Lưỡi cắt qua ngà mềm nhiễm khuẩn, không cắt ngà cứng còn lành.' },
      { c: 7, q: 'Carbide Bur 1559L dùng để làm gì?', o: ['Mài kẽ răng', 'Mở buồng tủy', 'Chia cắt răng ngầm', 'Hoàn tất bề mặt'], a: 2, x: 'Mũi khoan chia cắt răng ngầm, chiều dài làm việc 6 mm.' },
      { c: 7, q: 'Đầu mũi IPR-01EF có đường kính bao nhiêu?', o: ['0,19 mm', '0,5 mm', '1,0 mm', '1,4 mm'], a: 0, x: '0,19 mm, hạt siêu mịn, đi vào kẽ răng chật.' },
      { c: 8, q: 'Bác sĩ phục hình muốn định độ sâu khi mài cùi, gợi ý mã nào?', o: ['DIA-BURS CD', 'MI Stainless', 'IPR-01EF', 'DIA-BURS DM'], a: 3, x: 'DM (Depth Marker) tạo rãnh định hướng độ sâu trước khi sửa soạn cùi.' }
    ]
  },
  'nha-khoa-2': {
    title: 'Vật liệu phục hồi và thẩm mỹ MANI',
    sub: 'Bài kiểm tra · Bài 2',
    perQ: 20, n: 10, pass: 8,
    qs: [
      { c: 1, q: 'Chọn màu composite lúc nào?', o: ['Khi răng còn ẩm', 'Sau khi thổi khô lâu', 'Sau khi chiếu đèn', 'Sau khi đánh bóng'], a: 0, x: 'Răng khô lâu sẽ sáng hơn thật, chọn màu dễ sai.' },
      { c: 1, q: 'Phục hồi gián tiếp là gì?', o: ['Trám tại ghế một lần', 'Chỉ dùng cho răng sữa', 'Làm ngoài miệng rồi gắn vào răng', 'Không cần keo dán'], a: 2, x: 'Inlay, onlay, veneer, mão làm ngoài miệng rồi gắn bằng keo dán.' },
      { c: 3, q: 'Co ngót trùng hợp thấp giúp gì?', o: ['Màu sáng hơn', 'Ít hở bờ miếng trám', 'Chiếu đèn nhanh hơn', 'Dễ đánh bóng'], a: 1, x: 'Khối trám co ít khi chiếu đèn nên bờ miếng trám khít hơn.' },
      { c: 3, q: 'Cản quang cao giúp gì?', o: ['Trám nhanh hơn', 'Ít dính dụng cụ', 'Không cần keo', 'Hiện rõ trên phim X-quang'], a: 3, x: 'Giúp bác sĩ phát hiện sâu tái phát quanh miếng trám.' },
      { c: 4, q: 'Mani Bulk đặt được lớp dày tối đa bao nhiêu?', o: ['2 mm', '3 mm', '4 mm', '6 mm'], a: 2, x: 'Bulk-fill cho răng sau, 4 mm một lần, chiếu 20 giây.' },
      { c: 4, q: 'Composite chảy lỏng độ nhớt cao, không nhỏ giọt?', o: ['Mani Flo-V', 'Mani Nano', 'Mani Micro', 'Mani EG'], a: 0, x: 'Dùng trám bít hố rãnh, xoang V, xoang nhỏ.' },
      { c: 4, q: 'Dùng Mani Bulk ở xoang II, bác sĩ cần làm gì thêm?', o: ['Không cần gì', 'Chiếu đèn lâu hơn', 'Đánh bóng ngay', 'Phủ composite dạng đặc lên trên'], a: 3, x: 'Ở xoang II, Bulk là lớp lót đáy; phải phủ composite dạng đặc (theo IFU).' },
      { c: 4, q: 'Smart Shade là đặc điểm của dòng nào?', o: ['Mani Bulk', 'Mani Micro', 'Mani Flo-V', 'Mani EG'], a: 1, x: 'Màu tự thích ứng với răng xung quanh, dùng ít màu vẫn thẩm mỹ.' },
      { c: 4, q: 'Dòng nào co ngót thấp nhất, cản quang cao nhất?', o: ['Mani Bulk', 'Mani EG', 'Mani Nano', 'Mani Flo-V'], a: 2, x: 'Mani Nano: co ngót 1,66%, cản quang 220%.' },
      { c: 4, q: 'Mani EG dễ thao tác vì sao?', o: ['Ít dính dụng cụ, không xệ', 'Chảy lỏng như Flo-V', 'Không cần chiếu đèn', 'Chỉ dùng răng sữa'], a: 0, x: 'Giữ được hình khi tạo múi răng, không bám bay trám.' },
      { c: 5, q: 'Mani Bond đóng gói thế nào?', o: ['2 lọ, thế hệ 5', 'Bột và nước', 'Ống tiêm 2 g', '1 lọ 5 ml, thế hệ 7'], a: 3, x: 'Xoi mòn, lót, dán dính trong một lọ.' },
      { c: 5, q: 'Bôi Mani Bond xong, để phản ứng bao lâu?', o: ['5 giây', '20 giây', '60 giây', '120 giây'], a: 1, x: 'Bôi, chờ 20 giây, thổi nhẹ đến khi bóng.' },
      { c: 5, q: 'Chiếu đèn Mani Bond bao lâu?', o: ['10 giây', '30 giây', '60 giây', '90 giây'], a: 0, x: '10 giây với đèn 500 đến 1.200 mW/cm².' },
      { c: 5, q: 'Khi dùng Mani Bond, nên tránh việc gì?', o: ['Thổi nhẹ đến khi bóng', 'Chiếu đèn 10 giây', 'Xoi mòn acid trên ngà', 'Bôi một lớp'], a: 2, x: 'Xoi mòn acid trên ngà làm lực dán giảm; acid chỉ dùng trên men.' },
      { c: 6, q: 'Gel Bleach Office chứa bao nhiêu hydrogen peroxide?', o: ['10%', '35%', '50%', '70%'], a: 1, x: '35%, pH trung tính 7,3, ống trộn tự động 4:1.' },
      { c: 6, q: 'Mỗi lần bôi gel tẩy trắng giữ bao lâu?', o: ['1 phút, 10 lần', '30 phút, 1 lần', '5 phút, 5 lần', '10 phút, tối đa 3 lần'], a: 3, x: 'Kiểm tra bảo vệ nướu và màu răng sau mỗi lần.' },
      { c: 6, q: 'Gingiva Protector dùng để làm gì?', o: ['Làm trắng nướu', 'Giảm ê buốt', 'Che, bảo vệ nướu', 'Gắn mắc cài'], a: 2, x: 'Phủ lên nướu, chiếu đèn cho cứng, trước khi bôi gel.' },
      { c: 7, q: 'Bleach Office bảo quản ở nhiệt độ nào?', o: ['3 đến 9°C, không đông đá', 'Dưới 0°C', '25 đến 35°C', 'Không cần lưu ý'], a: 0, x: 'Bảo quản lạnh, không để đông đá.' },
      { c: 7, q: 'Miếng trám ngả vàng so với bảng màu thường do đâu?', o: ['Đèn quá mạnh', 'Răng quá ẩm', 'Dùng quá ít keo', 'Chiếu đèn chưa đủ'], a: 3, x: 'Chiếu lại đủ thời gian theo IFU (ví dụ Mani EG 20 giây, màu tối 40 giây).' },
      { c: 8, q: 'Bác sĩ cần gắn phục hình sứ zirconia, gợi ý sản phẩm nào?', o: ['Mani Flo-V', 'Mani Bond', 'After Bleach Care', 'Mani Bulk'], a: 1, x: 'Lực dán trên zirconia 40,3 MPa, tiêu chuẩn ISO 29022 yêu cầu từ 10 MPa.' }
    ]
  }
};
