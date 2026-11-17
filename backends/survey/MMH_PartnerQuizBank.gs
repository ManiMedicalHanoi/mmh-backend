/**
 * Ngân hàng câu hỏi — bài kiểm tra đối tác (NPP, đại lý) sau 2 bài đào tạo nha khoa.
 * v2 (16/11/2026, người dùng yêu cầu): Bài 1 hỏi về JIZAI, mũi khoan mới (1559L, IPR-01EF), công nghệ lõi và khái niệm của MANI
 * về mũi khoan, trâm nội nha; Bài 2 trọng tâm composite. Nội dung lấy đúng theo 2 file PPT đào tạo (External Training Dental / MMG).
 * Mỗi lượt rút n câu rải đều theo nhóm (c): Bài 1 có 3 nhóm JIZAI trên 5 nhóm ⇒ 6/10 câu về JIZAI.
 * o = 4 đáp án (thứ tự được trộn khi phát), a = chỉ số đáp án đúng (0..3), x = giải thích hiện sau khi trả lời.
 * v2.1 (17/11/2026): 2 bài gộp thành 1 buổi đào tạo (Phần 1 dụng cụ, Phần 2 vật liệu); đạt từ 6/10 câu; top 3 mỗi phần nhận túi cói MANI.
 * Không đưa kế hoạch sản phẩm sắp ra mắt / thông tin thị trường vào đây (người dùng yêu cầu).
 */
var PQ_BANK = {
  'nha-khoa-1': {
    title: 'Dụng cụ nội nha và mũi khoan MANI',
    sub: 'Bài kiểm tra · Phần 1',
    perQ: 20, n: 10, pass: 6, prize: 'Top 3 điểm cao nhất nhận túi cói MANI',
    qs: [
      // 1. JIZAI · tên, giá trị, thiết kế
      { c: 1, q: 'JIZAI (自在) trong tiếng Nhật nghĩa là gì?', o: ['Tốc độ', 'Tự tại', 'Sắc bén', 'Bền vững'], a: 1, x: 'JIZAI nghĩa là "tự tại": ung dung, làm chủ mọi chuyển động.' },
      { c: 1, q: 'Ba giá trị cốt lõi của JIZAI, đúng thứ tự?', o: ['Linh hoạt · Bền bỉ · Đơn giản', 'Đơn giản · Linh hoạt · Bền bỉ', 'Bền bỉ · Linh hoạt · Đơn giản', 'Bền bỉ · Đơn giản · Linh hoạt'], a: 2, x: 'Bền bỉ, linh hoạt, đơn giản.' },
      { c: 1, q: 'Lõi trâm JIZAI chiếm khoảng bao nhiêu thiết diện?', o: ['35 đến 40%', '45 đến 50%', '55 đến 60%', '70 đến 75%'], a: 2, x: 'Lõi 55 đến 60%: đủ bền ở vùng chóp, đủ linh hoạt ở đoạn cong.' },
      { c: 1, q: 'Vùng đệm (radial land) trên thiết diện cắt ngang JIZAI giúp gì?', o: ['Tăng tốc độ quay', 'Giảm hiệu ứng vặn vít', 'Tăng độ thuôn', 'Đổi màu cán trâm'], a: 1, x: 'Vùng đệm giảm hiệu ứng vặn vít (screw-in effect); điểm cắt đơn giảm ứng suất.' },
      // 2. JIZAI · xử lý nhiệt, cách dùng
      { c: 2, q: 'JIZAI Glider có tính chất gì sau xử lý nhiệt?', o: ['Ghi nhớ hình dạng', 'Siêu đàn hồi: thả tay tự bật thẳng', 'Không xử lý nhiệt', 'Cứng, không uốn được'], a: 1, x: 'Glider siêu đàn hồi; Orifice Opener, 020/04, JIZAI I, II, III ghi nhớ hình dạng.' },
      { c: 2, q: 'Trâm JIZAI ghi nhớ hình dạng trở về hình ban đầu khi nào?', o: ['Khi ngâm nước muối', 'Khi để nơi khô ráo', 'Khi hấp tiệt khuẩn', 'Khi quay nhanh hơn'], a: 2, x: 'Uốn cong thì giữ độ cong; hấp tiệt khuẩn thì trở về hình ban đầu.' },
      { c: 2, q: 'JIZAI Orifice Opener nên đưa vào khoảng bao nhiêu chiều dài làm việc?', o: ['Hết chiều dài làm việc', 'Khoảng 1/3', 'Khoảng 2/3', 'Chỉ chạm miệng ống tủy'], a: 1, x: 'Khoảng 1/3 chiều dài làm việc tính từ miệng ống tủy.' },
      { c: 2, q: 'Cài máy nội nha cho JIZAI Glider thế nào?', o: ['300 vòng/phút, 1,0 N·cm', '500 vòng/phút, 3,0 N·cm', '150 vòng/phút, 0,5 N·cm', '1.000 vòng/phút, 5,0 N·cm'], a: 0, x: 'Các trâm JIZAI khác: 500 vòng/phút, 3,0 N·cm.' },
      // 3. JIZAI 020/04 · EndoCompath · bằng chứng
      { c: 3, q: 'Ống tủy vôi hoá, co thắt hoặc cong nhiều: thêm trâm nào giữa Glider và JIZAI I?', o: ['Orifice Opener', 'JIZAI III', 'JIZAI 020/04', 'H-File'], a: 2, x: 'JIZAI 020/04 (#20, .04) đặt sau Glider, trước JIZAI I.' },
      { c: 3, q: 'Dùng 020/04 trước JIZAI I giảm bao nhiêu lực cắt dồn lên JIZAI I?', o: ['16%', '36%', '56%', '86%'], a: 2, x: '56% theo thử nghiệm nội bộ của MANI.' },
      { c: 3, q: 'Thứ tự 4 bước của quy trình EndoCompath?', o: ['Tạo hình · thăm dò · tạo đường trượt · mở lối vào', 'Mở lối vào thẳng · thăm dò · tạo đường trượt · tạo hình', 'Thăm dò · tạo hình · mở lối vào · tạo đường trượt', 'Mở lối vào · tạo hình · thăm dò · tạo đường trượt'], a: 1, x: 'Thăm dò thông chưa đủ: phải tạo đường trượt rồi mới tạo hình.' },
      { c: 3, q: 'Nghiên cứu tại Việt Nam (2024) với JIZAI ghi nhận tỷ lệ thành công sau 6 tháng?', o: ['75,5%', '85%', '95,56%', '100%'], a: 2, x: '45 răng hàm lớn hàm dưới; can thiệp lâm sàng không đối chứng; không có tai biến.' },
      // 4. Mũi khoan mới
      { c: 4, q: 'Carbide Bur 1559L dùng để làm gì?', o: ['Mài kẽ răng', 'Mở buồng tủy', 'Chia cắt răng ngầm', 'Hoàn tất bề mặt'], a: 2, x: 'Mũi khoan chia cắt răng ngầm, chuôi FG.' },
      { c: 4, q: 'Chiều dài làm việc của Carbide Bur 1559L?', o: ['3 mm', '6 mm', '11 mm', '15 mm'], a: 1, x: '6 mm, giảm nguy cơ cuốn vướng mô mềm (mũi Zekrya truyền thống: 11 mm).' },
      { c: 4, q: 'Hai đặc điểm lưỡi cắt của Carbide Bur 1559L?', o: ['Lưỡi cắt dạng xoắn và rãnh cắt chéo', 'Hạt kim cương và lớp phủ niken', 'Đầu không cắt và chuôi CA', 'Lưỡi thẳng và chuôi dài 34 mm'], a: 0, x: 'Lưỡi cắt dạng xoắn giảm rung; rãnh cắt chéo nâng hiệu quả cắt.' },
      { c: 4, q: 'IPR-01EF dùng cho thủ thuật nào?', o: ['Mở tủy', 'Mài kẽ răng trong chỉnh nha', 'Tháo mão kim loại', 'Lấy ngà sâu'], a: 1, x: 'Đầu 0,19 mm, hạt siêu mịn, contra-angle tối đa 160.000 vòng/phút, dùng một lần.' },
      // 5. Công nghệ lõi, khái niệm của MANI
      { c: 5, q: 'Ba điểm công nghệ của DIA-BURS?', o: ['Kim cương méo cạnh · lớp phủ niken 3 tầng · chuôi gia công chính xác', 'Lưỡi xoắn · rãnh chéo · chiều dài 6 mm', 'Lõi 55-60% · vùng đệm · xử lý nhiệt', 'Thép bó sợi · cán màu · vòng chặn'], a: 0, x: 'Cắt nhanh, giữ hạt bền, bảo vệ tay khoan.' },
      { c: 5, q: 'MI Stainless Burs thể hiện khái niệm nào?', o: ['Cắt chọn lọc: lấy ngà mềm, giữ ngà lành', 'Cắt nhanh mọi mô cứng', 'Dùng một lần', 'Mài men răng'], a: 0, x: 'Lưỡi cắt qua ngà mềm nhiễm khuẩn, không cắt ngà lành; phản hồi xúc giác báo dừng.' },
      { c: 5, q: 'Kỹ thuật 8-10 cho ống tủy vôi hoá phối hợp hai trâm nào?', o: ['K-File #08 + H-File #10', 'D Finder #08 + Glide Finder #10', 'JIZAI I + JIZAI II', 'Reamer #08 + RT File #10'], a: 1, x: 'D Finder #08 đẩy nhẹ thăm dò; Glide Finder #10 mở đường.' },
      { c: 5, q: 'Thép không gỉ bó sợi cứng (MANI Hard-fiber) mang lại gì cho trâm tay?', o: ['Đủ cứng để cắt, đủ dẻo để hạn chế gãy giòn', 'Tự đổi màu theo cỡ', 'Không cần tiệt khuẩn', 'Chỉ dùng một lần'], a: 0, x: 'Chịu được hấp tiệt khuẩn nhiều lần.' }
    ]
  },
  'nha-khoa-2': {
    title: 'Vật liệu phục hồi và thẩm mỹ MANI',
    sub: 'Bài kiểm tra · Phần 2',
    perQ: 20, n: 10, pass: 6, prize: 'Top 3 điểm cao nhất nhận túi cói MANI',
    qs: [
      // 1. Thông số composite
      { c: 1, q: 'Mô-đun đàn hồi cao nghĩa là gì?', o: ['Miếng trám ít biến dạng khi nhai', 'Màu sáng hơn', 'Chảy lỏng hơn', 'Đông nhanh hơn'], a: 0, x: 'Mô-đun đàn hồi thể hiện độ cứng vững của vật liệu.' },
      { c: 1, q: 'Co ngót trùng hợp thấp giúp gì?', o: ['Màu sáng hơn', 'Ít hở bờ, ít ê buốt sau trám', 'Chiếu đèn nhanh hơn', 'Không cần keo dán'], a: 1, x: 'Composite co lại một chút khi chiếu đèn; co ngót thấp thì ít hở bờ.' },
      { c: 1, q: 'Cản quang cao giúp gì?', o: ['Trám nhanh hơn', 'Ít dính dụng cụ', 'Miếng trám hiện rõ trên phim X-quang', 'Không cần chiếu đèn'], a: 2, x: 'Giúp phát hiện sâu tái phát quanh miếng trám.' },
      { c: 1, q: 'Ba dòng composite nào không chứa Bis-GMA?', o: ['Mani Micro, Mani Nano, Mani EG', 'Mani Bulk, Mani Flo-V, Mani EG', 'Mani Nano, Mani Bulk, Mani Micro', 'Cả năm dòng'], a: 1, x: 'Mani Micro và Mani Nano có chứa Bis-GMA.' },
      // 2. Chọn dòng theo chỉ định
      { c: 2, q: 'Trám răng sau nhanh, lớp dày: gợi ý dòng nào?', o: ['Mani Micro', 'Mani Bulk', 'Mani Flo-V', 'Mani EG'], a: 1, x: 'Mani Bulk đặt một lớp 4 mm, chiếu 20 giây.' },
      { c: 2, q: 'Trám bít hố rãnh, tổn thương cổ răng xoang V: gợi ý dòng nào?', o: ['Mani Flo-V', 'Mani Nano', 'Mani Bulk', 'Mani Micro'], a: 0, x: 'Chảy lỏng độ nhớt cao, không nhỏ giọt, đặt đúng vị trí.' },
      { c: 2, q: 'Thẩm mỹ răng trước, phòng khám muốn trữ ít màu: gợi ý dòng nào?', o: ['Mani Bulk', 'Mani Flo-V', 'Mani Micro', 'Mani EG'], a: 2, x: 'Smart Shade: màu tự thích ứng với răng xung quanh.' },
      { c: 2, q: 'Vùng chịu lực, tái tạo cùi sau điều trị tủy: gợi ý dòng nào?', o: ['Mani Flo-V', 'Mani Nano', 'Mani Bulk', 'Mani Micro'], a: 1, x: 'Mani Nano: mô-đun đàn hồi 16.575 MPa, cản quang 220%.' },
      // 3. Từng dòng
      { c: 3, q: 'Mani Bulk đặt được lớp dày tối đa bao nhiêu?', o: ['2 mm', '3 mm', '4 mm', '6 mm'], a: 2, x: 'Các dòng khác đặt lớp tối đa 2 mm.' },
      { c: 3, q: 'Dùng Mani Bulk lót đáy xoang II, bác sĩ cần làm gì thêm?', o: ['Không cần gì', 'Phủ composite dạng đặc lên trên', 'Chiếu đèn 5 giây', 'Không dùng keo dán'], a: 1, x: 'Phủ Mani EG hoặc Mani Nano lên trên.' },
      { c: 3, q: 'Mani EG dễ thao tác vì sao?', o: ['Ít dính dụng cụ, không xệ khi tạo hình', 'Chảy lỏng như Flo-V', 'Không cần chiếu đèn', 'Chỉ dùng cho răng sữa'], a: 0, x: 'Composite dạng đặc, hệ màu Chromatic.' },
      { c: 3, q: 'Dòng nào có mô-đun đàn hồi và cản quang cao nhất, co ngót thấp nhất?', o: ['Mani Bulk', 'Mani EG', 'Mani Nano', 'Mani Flo-V'], a: 2, x: 'Mani Nano: co ngót 1,66%, cản quang 220%.' },
      // 4. Kỹ thuật trám
      { c: 4, q: 'Composite thường đặt mỗi lớp tối đa bao nhiêu?', o: ['1 mm', '2 mm', '4 mm', '5 mm'], a: 1, x: 'Riêng Mani Bulk đặt được lớp 4 mm.' },
      { c: 4, q: 'Chọn màu composite lúc nào?', o: ['Khi răng còn ẩm', 'Sau khi thổi khô lâu', 'Sau khi chiếu đèn', 'Sau khi đánh bóng'], a: 0, x: 'Răng khô lâu trông sáng hơn thực tế.' },
      { c: 4, q: 'Lớp ức chế bởi oxy trên bề mặt mỗi lớp composite cần xử lý thế nào?', o: ['Lau sạch bằng cồn', 'Không chạm, không làm bẩn trước khi đặt lớp tiếp theo', 'Mài đi bằng mũi khoan', 'Chiếu đèn thêm 60 giây'], a: 1, x: 'Lớp này cần cho liên kết với lớp sau.' },
      { c: 4, q: 'Miếng trám ngả vàng so với bảng màu thường do đâu?', o: ['Đèn quá mạnh', 'Răng quá ẩm', 'Chiếu đèn chưa đủ', 'Dùng quá ít keo'], a: 2, x: 'Chiếu lại đủ thời gian theo IFU từng dòng.' },
      // 5. Keo dán và bảo quản composite
      { c: 5, q: 'Vì sao trám composite cần keo dán?', o: ['Composite không tự bám vào răng', 'Để đổi màu miếng trám', 'Để chiếu đèn nhanh hơn', 'Để giảm cản quang'], a: 0, x: 'Keo dán tạo liên kết giữa mô răng và vật liệu trám.' },
      { c: 5, q: 'Bôi Mani Bond, chờ bao lâu rồi chiếu đèn bao lâu?', o: ['5 giây · 5 giây', '20 giây · 10 giây', '60 giây · 30 giây', '10 giây · 60 giây'], a: 1, x: 'Bôi, chờ 20 giây, thổi nhẹ đến khi bóng, chiếu đèn 10 giây.' },
      { c: 5, q: 'Khi dùng Mani Bond trước khi trám composite, nên tránh việc gì?', o: ['Thổi nhẹ đến khi bóng', 'Xoi mòn acid trên ngà', 'Chiếu đèn 10 giây', 'Xoi mòn chọn lọc trên men'], a: 1, x: 'Xoi mòn acid trên ngà có thể làm giảm lực dán.' },
      { c: 5, q: 'Composite để quá nóng (trên 25°C) lâu ngày sẽ thế nào?', o: ['Cứng, bở', 'Mềm, dính, có chất lỏng không màu', 'Đổi sang màu xanh', 'Không thay đổi'], a: 1, x: 'Để dưới 3°C lâu ngày thì cứng, bở; bảo quản theo nhiệt độ trên nhãn.' }
    ]
  }
};
