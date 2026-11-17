/**
 * Ngân hàng câu hỏi — bài kiểm tra đối tác (NPP, đại lý) sau buổi đào tạo nha khoa.
 * v3 (17/11/2026, người dùng yêu cầu): 1 buổi đào tạo 2 phần theo bộ slide gộp.
 *   Phần 1 (nha-khoa-1) Dụng cụ: c1 JIZAI thiết kế · c2 JIZAI xử lý nhiệt, cách dùng · c3 020/04, EndoCompath, bằng chứng · c4 trâm tay (K, H, Reamer, RT, D Finder, Glide Finder) · c5 mũi khoan.
 *   Phần 2 (nha-khoa-2) Vật liệu và sản phẩm mới: c1 chọn dòng composite · c2 đặc tính composite · c3 Mani Bond, kỹ thuật trám · c4 tẩy trắng (không cần đèn, kỳ vọng) · c5 sản phẩm mới (1559L, IPR-01EF, DIA-BURS CAD/CAM).
 * Mỗi lượt rút n câu rải đều theo nhóm (c), mỗi nhóm 2 câu. Đạt từ 6/10; top 3 mỗi phần nhận túi cói MANI.
 * o = 4 đáp án (thứ tự được trộn khi phát), a = chỉ số đáp án đúng (0..3), x = giải thích hiện sau khi trả lời.
 * Không đưa kế hoạch sản phẩm sắp ra mắt / thông tin thị trường vào đây (người dùng yêu cầu).
 */
var PQ_BANK = {
  'nha-khoa-1': {
    title: 'Dụng cụ nội nha và mũi khoan MANI',
    sub: 'Bài kiểm tra · Phần 1',
    perQ: 20, n: 10, pass: 6, prize: 'Top 3 điểm cao nhất nhận túi cói MANI',
    qs: [
      { c: 1, q: 'JIZAI (自在) trong tiếng Nhật nghĩa là gì?', o: ['Tốc độ', 'Tự tại', 'Sắc bén', 'Bền vững'], a: 1, x: 'JIZAI nghĩa là "tự tại": ung dung, làm chủ mọi chuyển động.' },
      { c: 1, q: 'Ba giá trị cốt lõi của JIZAI, đúng thứ tự?', o: ['Linh hoạt · Bền bỉ · Đơn giản', 'Đơn giản · Linh hoạt · Bền bỉ', 'Bền bỉ · Linh hoạt · Đơn giản', 'Bền bỉ · Đơn giản · Linh hoạt'], a: 2, x: 'Bền bỉ, linh hoạt, đơn giản.' },
      { c: 1, q: 'Lõi trâm JIZAI chiếm khoảng bao nhiêu thiết diện?', o: ['35 đến 40%', '45 đến 50%', '55 đến 60%', '70 đến 75%'], a: 2, x: 'Lõi 55 đến 60%: đủ bền ở vùng chóp, đủ linh hoạt ở đoạn cong.' },
      { c: 1, q: 'Vùng đệm (radial land) trên thiết diện cắt ngang JIZAI giúp gì?', o: ['Tăng tốc độ quay', 'Giảm hiệu ứng vặn vít', 'Tăng độ thuôn', 'Đổi màu cán trâm'], a: 1, x: 'Vùng đệm giảm hiệu ứng vặn vít (screw-in effect); điểm cắt đơn giảm ứng suất.' },
      { c: 2, q: 'JIZAI Glider có tính chất gì sau xử lý nhiệt?', o: ['Ghi nhớ hình dạng', 'Siêu đàn hồi: thả tay tự bật thẳng', 'Không xử lý nhiệt', 'Cứng, không uốn được'], a: 1, x: 'Glider siêu đàn hồi; Orifice Opener, 020/04, JIZAI I, II, III ghi nhớ hình dạng.' },
      { c: 2, q: 'Trâm JIZAI ghi nhớ hình dạng trở về hình ban đầu khi nào?', o: ['Khi ngâm nước muối', 'Khi để nơi khô ráo', 'Khi hấp tiệt khuẩn', 'Khi quay nhanh hơn'], a: 2, x: 'Uốn cong thì giữ độ cong; hấp tiệt khuẩn thì trở về hình ban đầu.' },
      { c: 2, q: 'JIZAI Orifice Opener nên đưa vào khoảng bao nhiêu chiều dài làm việc?', o: ['Hết chiều dài làm việc', 'Khoảng 1/3', 'Khoảng 2/3', 'Chỉ chạm miệng ống tủy'], a: 1, x: 'Khoảng 1/3 chiều dài làm việc tính từ miệng ống tủy.' },
      { c: 2, q: 'Cài máy nội nha cho JIZAI Glider thế nào?', o: ['300 vòng/phút, 1,0 N·cm', '500 vòng/phút, 3,0 N·cm', '150 vòng/phút, 0,5 N·cm', '1.000 vòng/phút, 5,0 N·cm'], a: 0, x: 'Các trâm JIZAI khác: 500 vòng/phút, 3,0 N·cm.' },
      { c: 3, q: 'Ống tủy vôi hoá, co thắt hoặc cong nhiều: thêm trâm nào giữa Glider và JIZAI I?', o: ['Orifice Opener', 'JIZAI III', 'JIZAI 020/04', 'H-File'], a: 2, x: 'JIZAI 020/04 (#20, .04) đặt sau Glider, trước JIZAI I.' },
      { c: 3, q: 'Dùng 020/04 trước JIZAI I giảm bao nhiêu lực cắt dồn lên JIZAI I?', o: ['16%', '36%', '56%', '86%'], a: 2, x: '56% theo thử nghiệm nội bộ của MANI.' },
      { c: 3, q: 'Thứ tự 4 bước của quy trình EndoCompath?', o: ['Tạo hình · thăm dò · tạo đường trượt · mở lối vào', 'Mở lối vào thẳng · thăm dò · tạo đường trượt · tạo hình', 'Thăm dò · tạo hình · mở lối vào · tạo đường trượt', 'Mở lối vào · tạo hình · thăm dò · tạo đường trượt'], a: 1, x: 'Thăm dò thông chưa đủ: phải tạo đường trượt rồi mới tạo hình.' },
      { c: 3, q: 'Nghiên cứu tại Việt Nam (2024) với JIZAI ghi nhận tỷ lệ thành công sau 6 tháng?', o: ['75,5%', '85%', '95,56%', '90%'], a: 2, x: '45 răng hàm lớn hàm dưới; can thiệp lâm sàng không đối chứng; không có tai biến.' },
      { c: 4, q: 'H-Files thao tác thế nào?', o: ['Xoay 1/4 đến 1/3 vòng', 'Kéo đẩy theo trục, không xoay', 'Xoay liên tục trên máy', 'Xoay rồi kéo'], a: 1, x: 'Xoay H-File dễ gãy; H-Files cắt mạnh nhất, mở rộng nhanh và làm nhẵn thành ống tủy.' },
      { c: 4, q: 'RT Files có thiết diện cắt ngang dạng gì?', o: ['Vuông', 'Tam giác', 'Chữ nhật', 'Chữ D'], a: 2, x: 'Thiết diện chữ nhật, cạnh cắt góc 85°: linh hoạt và cắt sắc hơn thiết diện vuông.' },
      { c: 4, q: 'D Finders khác trâm thông thường ở điểm nào?', o: ['Trượt theo thành ống tủy, giảm nguy cơ tạo bậc', 'Cắt mạnh nhất trong các trâm tay', 'Chỉ dùng trên máy nội nha', 'Dùng một lần'], a: 0, x: 'Thiết diện chữ D, cạnh cắt tối giản: trượt theo thành thay vì cắt vào thành.' },
      { c: 4, q: 'Medium Files (cỡ trung gian #12, #17...) giúp gì?', o: ['Đổi màu cán trâm', 'Chuyển cỡ êm hơn, giảm bước nhảy đường kính', 'Tăng chiều dài trâm', 'Không cần tiệt khuẩn'], a: 1, x: 'Từ #10 lên #15 đường kính tăng 50%; cỡ trung gian giảm bước nhảy còn khoảng 20 đến 25%.' },
      { c: 4, q: 'Kỹ thuật 8-10 cho ống tủy vôi hoá phối hợp hai trâm nào?', o: ['K-File #08 + H-File #10', 'D Finder #08 + Glide Finder #10', 'JIZAI I + JIZAI II', 'Reamer #08 + RT File #10'], a: 1, x: 'D Finder #08 đẩy nhẹ thăm dò; Glide Finder #10 mở đường.' },
      { c: 4, q: 'Thép không gỉ bó sợi cứng (MANI Hard-fiber) mang lại gì cho trâm tay?', o: ['Đủ cứng để cắt, đủ dẻo để hạn chế gãy giòn', 'Tự đổi màu theo cỡ', 'Không cần tiệt khuẩn', 'Chỉ dùng một lần'], a: 0, x: 'Chịu được hấp tiệt khuẩn nhiều lần.' },
      { c: 5, q: 'Ba điểm công nghệ của DIA-BURS?', o: ['Kim cương méo cạnh · lớp phủ niken 3 tầng · chuôi gia công chính xác', 'Lưỡi xoắn · rãnh chéo · chiều dài 6 mm', 'Lõi 55-60% · vùng đệm · xử lý nhiệt', 'Thép bó sợi · cán màu · vòng chặn'], a: 0, x: 'Cắt nhanh, giữ hạt bền, bảo vệ tay khoan.' },
      { c: 5, q: 'Vòng màu vàng trên chuôi DIA-BURS cho biết kích thước hạt kim cương nào?', o: ['Siêu thô (SC)', 'Tiêu chuẩn', 'Mịn (F)', 'Siêu mịn (EF)'], a: 3, x: 'Siêu mịn 20 đến 30 µm, dùng làm nhẵn bề mặt. Đen: siêu thô; xanh lá: thô; xanh dương: tiêu chuẩn; đỏ: mịn.' },
      { c: 5, q: 'MI Stainless Burs thể hiện khái niệm nào?', o: ['Cắt chọn lọc: lấy ngà mềm, giữ ngà lành', 'Cắt nhanh mọi mô cứng', 'Dùng một lần', 'Mài men răng'], a: 0, x: 'Lưỡi cắt qua ngà mềm nhiễm khuẩn, không cắt ngà lành; phản hồi xúc giác báo dừng.' },
      { c: 5, q: 'Surgical Burs chuôi dài 25 và 28 mm dùng với tay khoan nào?', o: ['Turbine hơi', 'Contra-angle, tối đa 120.000 vòng/phút', 'Máy nội nha', 'Tay khoan thẳng'], a: 1, x: 'Không dùng turbine: kẹp mũi nửa chừng làm hỏng tay khoan.' }
    ]
  },
  'nha-khoa-2': {
    title: 'Vật liệu MMG và sản phẩm mới',
    sub: 'Bài kiểm tra · Phần 2',
    perQ: 20, n: 10, pass: 6, prize: 'Top 3 điểm cao nhất nhận túi cói MANI',
    qs: [
      { c: 1, q: 'Trám răng sau nhanh, lớp dày: gợi ý dòng nào?', o: ['Mani Micro', 'Mani Bulk', 'Mani Flo-V', 'Mani EG'], a: 1, x: 'Mani Bulk đặt một lớp 4 mm, chiếu 20 giây.' },
      { c: 1, q: 'Trám bít hố rãnh, tổn thương cổ răng xoang V: gợi ý dòng nào?', o: ['Mani Flo-V', 'Mani Nano', 'Mani Bulk', 'Mani Micro'], a: 0, x: 'Chảy lỏng độ nhớt cao, không nhỏ giọt, đặt đúng vị trí.' },
      { c: 1, q: 'Thẩm mỹ răng trước, phòng khám muốn trữ ít màu: gợi ý dòng nào?', o: ['Mani Bulk', 'Mani Flo-V', 'Mani Micro', 'Mani EG'], a: 2, x: 'Smart Shade: màu tự thích ứng với răng xung quanh.' },
      { c: 1, q: 'Vùng chịu lực, tái tạo cùi sau điều trị tủy: gợi ý dòng nào?', o: ['Mani Flo-V', 'Mani Nano', 'Mani Bulk', 'Mani Micro'], a: 1, x: 'Mani Nano: mô-đun đàn hồi 16.575 MPa, cản quang 220%.' },
      { c: 1, q: 'Ba dòng composite nào không chứa Bis-GMA?', o: ['Mani Micro, Mani Nano, Mani EG', 'Mani Bulk, Mani Flo-V, Mani EG', 'Mani Nano, Mani Bulk, Mani Micro', 'Cả năm dòng'], a: 1, x: 'Mani Micro và Mani Nano có chứa Bis-GMA.' },
      { c: 2, q: 'Mô-đun đàn hồi cao nghĩa là gì?', o: ['Miếng trám ít biến dạng khi nhai', 'Màu sáng hơn', 'Chảy lỏng hơn', 'Đông nhanh hơn'], a: 0, x: 'Mô-đun đàn hồi thể hiện độ cứng vững của vật liệu.' },
      { c: 2, q: 'Co ngót trùng hợp thấp giúp gì?', o: ['Màu sáng hơn', 'Ít hở bờ, ít ê buốt sau trám', 'Chiếu đèn nhanh hơn', 'Không cần keo dán'], a: 1, x: 'Composite co lại một chút khi chiếu đèn; co ngót thấp thì ít hở bờ.' },
      { c: 2, q: 'Cản quang cao giúp gì?', o: ['Trám nhanh hơn', 'Ít dính dụng cụ', 'Miếng trám hiện rõ trên phim X-quang', 'Không cần chiếu đèn'], a: 2, x: 'Giúp phát hiện sâu tái phát quanh miếng trám.' },
      { c: 2, q: 'Mani Bulk đặt được lớp dày tối đa bao nhiêu?', o: ['2 mm', '3 mm', '4 mm', '6 mm'], a: 2, x: 'Các dòng khác đặt lớp tối đa 2 mm.' },
      { c: 2, q: 'Dùng Mani Bulk lót đáy xoang II, bác sĩ cần làm gì thêm?', o: ['Không cần gì', 'Phủ composite dạng đặc lên trên', 'Chiếu đèn 5 giây', 'Không dùng keo dán'], a: 1, x: 'Phủ Mani EG hoặc Mani Nano lên trên.' },
      { c: 2, q: 'Mani EG dễ thao tác vì sao?', o: ['Ít dính dụng cụ, không xệ khi tạo hình', 'Chảy lỏng như Flo-V', 'Không cần chiếu đèn', 'Chỉ dùng cho răng sữa'], a: 0, x: 'Composite dạng đặc, hệ màu Chromatic.' },
      { c: 2, q: 'Dòng nào có mô-đun đàn hồi và cản quang cao nhất, co ngót thấp nhất?', o: ['Mani Bulk', 'Mani EG', 'Mani Nano', 'Mani Flo-V'], a: 2, x: 'Mani Nano: co ngót 1,66%, cản quang 220%.' },
      { c: 3, q: 'Vì sao trám composite cần keo dán?', o: ['Composite không tự bám vào răng', 'Để đổi màu miếng trám', 'Để chiếu đèn nhanh hơn', 'Để giảm cản quang'], a: 0, x: 'Keo dán tạo liên kết giữa mô răng và vật liệu trám.' },
      { c: 3, q: 'Bôi Mani Bond, chờ bao lâu rồi chiếu đèn bao lâu?', o: ['5 giây · 5 giây', '20 giây · 10 giây', '60 giây · 30 giây', '10 giây · 60 giây'], a: 1, x: 'Bôi, chờ 20 giây, thổi nhẹ đến khi bóng, chiếu đèn 10 giây.' },
      { c: 3, q: 'Khi dùng Mani Bond trước khi trám composite, nên tránh việc gì?', o: ['Thổi nhẹ đến khi bóng', 'Xoi mòn acid trên ngà', 'Chiếu đèn 10 giây', 'Xoi mòn chọn lọc trên men'], a: 1, x: 'Xoi mòn acid trên ngà có thể làm giảm lực dán.' },
      { c: 3, q: 'Composite thường đặt mỗi lớp tối đa bao nhiêu?', o: ['1 mm', '2 mm', '4 mm', '5 mm'], a: 1, x: 'Riêng Mani Bulk đặt được lớp 4 mm.' },
      { c: 3, q: 'Chọn màu composite lúc nào?', o: ['Khi răng còn ẩm', 'Sau khi thổi khô lâu', 'Sau khi chiếu đèn', 'Sau khi đánh bóng'], a: 0, x: 'Răng khô lâu trông sáng hơn thực tế.' },
      { c: 3, q: 'Lớp ức chế bởi oxy trên bề mặt mỗi lớp composite cần xử lý thế nào?', o: ['Lau sạch bằng cồn', 'Không chạm, không làm bẩn trước khi đặt lớp tiếp theo', 'Mài đi bằng mũi khoan', 'Chiếu đèn thêm 60 giây'], a: 1, x: 'Lớp này cần cho liên kết với lớp sau.' },
      { c: 3, q: 'Miếng trám ngả vàng so với bảng màu thường do đâu?', o: ['Đèn quá mạnh', 'Răng quá ẩm', 'Chiếu đèn chưa đủ', 'Dùng quá ít keo'], a: 2, x: 'Chiếu lại đủ thời gian theo IFU từng dòng.' },
      { c: 4, q: 'Bộ Bleach\'n Shine có cần chiếu đèn khi tẩy trắng không?', o: ['Bắt buộc dùng đèn plasma', 'Bắt buộc dùng laser', 'Không cần: gel tự tác dụng khoảng 10 phút mỗi lần', 'Chiếu 40 giây mỗi răng'], a: 2, x: 'Đèn chỉ là tuỳ chọn; gel 35% hydrogen peroxide tự tác dụng.' },
      { c: 4, q: 'Gel Mani Bleach Office có pH bao nhiêu?', o: ['3,5', '5,0', '7,3 (trung tính)', '10'], a: 2, x: 'pH trung tính, có kali nitrat và natri florua: hạn chế ê buốt.' },
      { c: 4, q: 'Mỗi lần bôi gel giữ bao lâu, tối đa mấy lần một buổi?', o: ['2 phút, 10 lần', '10 phút, tối đa 3 lần', '30 phút, 1 lần', '60 phút, 2 lần'], a: 1, x: 'Hút sạch gel, kiểm tra nướu và màu răng sau mỗi lần.' },
      { c: 4, q: 'Bệnh nhân có miếng trám composite răng trước muốn tẩy trắng: tư vấn gì?', o: ['Miếng trám sẽ trắng lên cùng răng', 'Miếng trám không trắng lên; nếu cần thay, làm sau tẩy trắng khoảng 2 tuần', 'Không được tẩy trắng', 'Phải tháo miếng trám trước khi tẩy'], a: 1, x: 'Composite, sứ, kim loại giữ nguyên màu.' },
      { c: 4, q: 'Mức trắng đạt được sau tẩy trắng phụ thuộc vào đâu?', o: ['Chỉ phụ thuộc số lần bôi gel', 'Nguyên nhân đổi màu, tình trạng bệnh lý và chất lượng men răng', 'Màu của bảng Vita', 'Loại đèn sử dụng'], a: 1, x: 'Trao đổi trước với bệnh nhân để quản lý kỳ vọng.' },
      { c: 5, q: 'Carbide Bur 1559L dùng để làm gì?', o: ['Mài kẽ răng', 'Mở buồng tủy', 'Chia cắt răng ngầm', 'Hoàn tất bề mặt'], a: 2, x: 'Mũi khoan chia cắt răng ngầm, chuôi FG.' },
      { c: 5, q: 'Chiều dài làm việc của Carbide Bur 1559L?', o: ['3 mm', '6 mm', '11 mm', '15 mm'], a: 1, x: '6 mm, giảm nguy cơ cuốn vướng mô mềm (mũi Zekrya truyền thống: 11 mm).' },
      { c: 5, q: 'Hai đặc điểm lưỡi cắt của Carbide Bur 1559L?', o: ['Lưỡi cắt dạng xoắn và rãnh cắt chéo', 'Hạt kim cương và lớp phủ niken', 'Đầu không cắt và chuôi CA', 'Lưỡi thẳng và chuôi dài 34 mm'], a: 0, x: 'Lưỡi cắt dạng xoắn giảm rung; rãnh cắt chéo nâng hiệu quả cắt.' },
      { c: 5, q: 'IPR-01EF dùng cho thủ thuật nào?', o: ['Mở tủy', 'Mài kẽ răng trong chỉnh nha', 'Tháo mão kim loại', 'Lấy ngà sâu'], a: 1, x: 'Đầu 0,19 mm, hạt siêu mịn, contra-angle tối đa 160.000 vòng/phút, dùng một lần.' },
      { c: 5, q: 'Dòng DIA-BURS nào dành cho sửa soạn phục hình CAD/CAM?', o: ['EA', 'CE', 'SF', 'CD'], a: 1, x: 'CE (CEREC) cho CAD/CAM; Pro cho mão toàn sứ, zirconia.' },
      { c: 5, q: 'Mài, cắt zirconia bằng Pro-5f cần lưu ý gì?', o: ['Lực mạnh, không cần nước', 'Lực nhẹ, phun nước, đeo kính bảo hộ', 'Chỉ dùng turbine không nước', 'Chiếu đèn trước khi mài'], a: 1, x: 'Mài zirconia có thể phát tia lửa.' }
    ]
  }
};
