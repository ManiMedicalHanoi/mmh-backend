/**
 * Ngân hàng câu hỏi — bài kiểm tra đối tác (NPP, đại lý) sau buổi đào tạo nha khoa.
 * v3.4 (21/11/2026, người dùng yêu cầu): 'nha-khoa-3' thêm 6 câu JIZAI + composite vào nhóm c1 (deck v3 có slide JIZAI, composite chi tiết) — mỗi lượt vẫn 2/10 câu nhóm c1,
 *   8/10 câu về 2 sản phẩm mới. Câu "thận trọng quanh vùng nào" đổi đáp án nhiễu "Xoang hàm và men răng" ⇒ "Men răng và ngà răng" (slide an toàn nay nhắc xoang hàm).
 *   Kết quả ghi thêm vào Sheet riêng của buổi đào tạo: khoá out {id, tab, from} (MMH_PartnerQuiz.gs ▸ pqOutSync_).
 * v3.3 (20/11/2026, người dùng yêu cầu): thêm bài 'nha-khoa-3' cho bộ slide mới "Danh mục nha khoa MANI và hai sản phẩm mới" (đào tạo đại lý):
 *   c1 tổng quan danh mục (dụng cụ MANI, vật liệu MMG) · c2 Carbide Bur 1559L đặc điểm · c3 1559L sử dụng an toàn · c4 IPR-01EF thiết kế · c5 IPR-01EF lâm sàng, chỉ định.
 *   Mọi câu có trên slide (tờ rơi 1559L D17701, IFU Carbide Burs, IPR-01EF Clinical Report D14501, series Thủ thuật nha khoa tập 4, 6, 14, 18).
 * v3.2 (17/11/2026, người dùng yêu cầu): câu tẩy trắng nói rõ "tẩy trắng răng tại ghế, bôi gel tẩy trắng Mani Bleach Office"; câu chưa có trên slide (chọn màu, lớp ức chế oxy, trám ngả vàng) thay bằng câu Mani Bond theo slide.
 * v3 (17/11/2026, người dùng yêu cầu): 1 buổi đào tạo 2 phần theo bộ slide gộp.
 *   Phần 1 (nha-khoa-1) Dụng cụ: c1 JIZAI thiết kế · c2 JIZAI xử lý nhiệt, cách dùng · c3 020/04, EndoCompath, bằng chứng · c4 trâm tay (K, H, Reamer, RT, D Finder, Glide Finder) · c5 mũi khoan.
 *   Phần 2 (nha-khoa-2) Vật liệu và sản phẩm mới: c1 chọn dòng composite · c2 đặc tính composite · c3 Mani Bond, kỹ thuật trám · c4 tẩy trắng (không cần đèn, kỳ vọng) · c5 sản phẩm mới (1559L, IPR-01EF). CAD/CAM chưa giới thiệu (người dùng yêu cầu) ⇒ không hỏi.
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
      { c: 4, q: 'Thép không gỉ bó sợi cứng (MANI Hard-fiber) mang lại gì cho trâm tay?', o: ['Đủ cứng để cắt, đủ dẻo để hạn chế gãy giòn', 'Tự đổi màu theo cỡ', 'Không cần tiệt khuẩn', 'Chỉ dùng một lần'], a: 0, x: 'Bề mặt nhẵn bóng; dùng để thăm dò, mở rộng, làm nhẵn ống tủy.' },
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
      { c: 1, q: 'Phục hình thẩm mỹ cao vùng răng trước, cần nhiều màu men và dễ đánh bóng: gợi ý dòng nào?', o: ['Mani Bulk', 'Mani Flo-V', 'Mani Micro', 'Mani EG'], a: 2, x: 'Mani Micro: 6 màu men (Bleach 1 đến 3, Incisal Clear, White, Medium), 5 màu ngà, dễ đánh bóng.' },
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
      { c: 3, q: 'Dùng keo dán Mani Bond: bôi keo xong chờ bao lâu, rồi chiếu đèn bao lâu?', o: ['5 giây · 5 giây', '20 giây · 10 giây', '60 giây · 30 giây', '10 giây · 60 giây'], a: 1, x: 'Bôi, chờ 20 giây, thổi nhẹ đến khi bóng, chiếu đèn 10 giây.' },
      { c: 3, q: 'Dùng keo dán Mani Bond trước khi trám composite: nên tránh việc gì?', o: ['Thổi nhẹ đến khi bóng', 'Xoi mòn acid trên ngà', 'Chiếu đèn 10 giây', 'Xoi mòn chọn lọc trên men'], a: 1, x: 'Xoi mòn acid trên ngà có thể làm giảm lực dán.' },
      { c: 3, q: 'Trám composite MMG (trừ Mani Bulk): mỗi lớp đặt dày tối đa bao nhiêu?', o: ['1 mm', '2 mm', '4 mm', '5 mm'], a: 1, x: 'Riêng Mani Bulk đặt được lớp 4 mm.' },
      { c: 3, q: 'Keo dán Mani Bond có hai cơ chế dán trong một lọ, nhờ hai thành phần nào?', o: ['10-MDP và 4-META', 'Bis-GMA và TEGDMA', 'Hydrogen peroxide và kali nitrat', 'Acid phosphoric và natri florua'], a: 0, x: '10-MDP liên kết hoá học với canxi của răng; 4-META giúp keo thấm vào mô (giữ cơ học vi thể).' },
      { c: 3, q: 'Dùng keo dán Mani Bond: xoi mòn chọn lọc bằng acid phosphoric 37% áp dụng ở đâu?', o: ['Chỉ trên men răng', 'Chỉ trên ngà răng', 'Cả men và ngà', 'Không bao giờ xoi mòn'], a: 0, x: 'Xoi mòn chọn lọc chỉ trên men (30 giây). Xoi mòn acid trên ngà có thể làm giảm lực dán.' },
      { c: 3, q: 'Theo nghiên cứu xác thực của keo dán Mani Bond, điều nào đúng?', o: ['Chiếu đèn 10 giây cho lực dán tốt hơn 5 giây', 'Bôi keo 2 lần cho lực dán tốt hơn hẳn', 'Không cần chiếu đèn', 'Chiếu đèn 60 giây mới đủ'], a: 0, x: 'Chiếu đèn 10 giây tốt hơn 5 giây; bôi 2 lần không cải thiện thêm.' },
      { c: 4, q: 'Tẩy trắng răng tại ghế bằng bộ Bleach\'n Shine: sau khi bôi gel tẩy trắng Mani Bleach Office lên răng, có cần chiếu đèn không?', o: ['Bắt buộc chiếu đèn plasma', 'Bắt buộc chiếu laser', 'Không cần: gel tự tác dụng khoảng 10 phút mỗi lần', 'Chiếu đèn 40 giây mỗi răng'], a: 2, x: 'Đèn chỉ là tuỳ chọn; gel 35% hydrogen peroxide tự tác dụng.' },
      { c: 4, q: 'Tẩy trắng răng tại ghế bằng bộ Bleach\'n Shine: bước đầu tiên, trước khi bôi gel tẩy trắng, là gì?', o: ['Bảo vệ nướu bằng Mani Gingiva Protector, chiếu đèn cho đông cứng', 'Bôi kem After Bleach Care', 'Xoi mòn acid toàn bộ mặt răng', 'Gây tê tại chỗ'], a: 0, x: 'Ba bước: bảo vệ nướu (Gingiva Protector) · bôi gel Bleach Office · giảm ê buốt (After Bleach Care 3 đến 5 phút).' },
      { c: 4, q: 'Gel tẩy trắng răng Mani Bleach Office (bộ Bleach\'n Shine) có pH bao nhiêu?', o: ['3,5', '5,0', '7,3 (trung tính)', '10'], a: 2, x: 'pH trung tính, có kali nitrat và natri florua: hạn chế ê buốt.' },
      { c: 4, q: 'Tẩy trắng răng tại ghế: mỗi lần bôi gel tẩy trắng Mani Bleach Office lên răng thì giữ bao lâu, một buổi bôi tối đa mấy lần?', o: ['2 phút, 10 lần', '10 phút, tối đa 3 lần', '30 phút, 1 lần', '60 phút, 2 lần'], a: 1, x: 'Giữ gel 10 phút mỗi lần, lặp tối đa 3 lần; hút sạch gel, kiểm tra nướu và màu răng sau mỗi lần.' },
      { c: 4, q: 'Bệnh nhân có miếng trám composite ở răng cửa muốn tẩy trắng răng tại ghế: tư vấn thế nào?', o: ['Miếng trám sẽ trắng lên cùng răng', 'Miếng trám không trắng lên; nếu cần thay, làm sau tẩy trắng khoảng 2 tuần', 'Không được tẩy trắng', 'Phải tháo miếng trám trước khi tẩy'], a: 1, x: 'Composite, sứ, kim loại giữ nguyên màu.' },
      { c: 4, q: 'Sau khi tẩy trắng răng tại ghế, mức trắng đạt được phụ thuộc vào đâu?', o: ['Chỉ phụ thuộc số lần bôi gel', 'Nguyên nhân đổi màu, tình trạng bệnh lý và chất lượng men răng', 'Màu của bảng Vita', 'Loại đèn sử dụng'], a: 1, x: 'Trao đổi trước với bệnh nhân để quản lý kỳ vọng.' },
      { c: 5, q: 'Carbide Bur 1559L dùng để làm gì?', o: ['Mài kẽ răng', 'Mở buồng tủy', 'Chia cắt răng ngầm', 'Hoàn tất bề mặt'], a: 2, x: 'Mũi khoan chia cắt răng ngầm, chuôi FG.' },
      { c: 5, q: 'Chiều dài làm việc của Carbide Bur 1559L?', o: ['3 mm', '6 mm', '11 mm', '15 mm'], a: 1, x: 'Chiều dài làm việc 6 mm, đường kính tối đa 1,4 mm; tổng chiều dài 25 mm hoặc 28 mm.' },
      { c: 5, q: 'Hai đặc điểm lưỡi cắt của Carbide Bur 1559L?', o: ['Lưỡi cắt dạng xoắn và rãnh cắt chéo', 'Hạt kim cương và lớp phủ niken', 'Đầu không cắt và chuôi CA', 'Lưỡi thẳng và chuôi dài 34 mm'], a: 0, x: 'Lưỡi cắt dạng xoắn giảm rung; rãnh cắt chéo nâng hiệu quả cắt.' },
      { c: 5, q: 'IPR-01EF dùng cho thủ thuật nào?', o: ['Mở tủy', 'Mài kẽ răng trong chỉnh nha', 'Tháo mão kim loại', 'Lấy ngà sâu'], a: 1, x: 'Đầu 0,19 mm, hạt siêu mịn, contra-angle tối đa 160.000 vòng/phút, dùng một lần.' }
    ]
  },
  'nha-khoa-3': {
    title: 'Danh mục nha khoa MANI và hai sản phẩm mới',
    sub: 'Bài kiểm tra · 1559L và IPR-01EF',
    perQ: 20, n: 10, pass: 6, prize: 'Top 3 điểm cao nhất nhận túi cói MANI',
    // buổi đào tạo NPP Meci 21/11/2026: kết quả ghi thêm vào Sheet người dùng gửi, tab theo ngày + NPP (chỉ lượt từ ngày from)
    out: { id: '18PuIGqsglswkcq4okVxtdKt1IjqloLXYCBMgiRd5Dd0', tab: '21.11.26_Meci', old: '21.11.26_Merci', from: '2026-11-21' },
    qs: [
      { c: 1, q: 'Ba giá trị cốt lõi của trâm máy JIZAI?', o: ['Bền bỉ · Linh hoạt · Đơn giản', 'Nhanh · Rẻ · Nhẹ', 'Cứng · Thẳng · Dài', 'Sắc · Mảnh · Dùng một lần'], a: 0, x: 'JIZAI là trâm máy NiTi xử lý nhiệt: bền bỉ, linh hoạt, đơn giản.' },
      { c: 1, q: 'Bộ tạo hình JIZAI gồm mấy trâm?', o: ['2 trâm', '3 trâm: JIZAI I, II, III', '6 trâm', '10 trâm'], a: 1, x: 'Chỉ 3 trâm tạo hình cho hầu hết các ca: ít dụng cụ phải học và quản lý.' },
      { c: 1, q: 'JIZAI 020/04 được dùng khi nào?', o: ['Mọi ca, thay cho JIZAI I', 'Ống tủy vôi hoá, co thắt, cong nhiều: dùng sau Glider, trước JIZAI I', 'Chỉ để mở lối vào ống tủy', 'Để trám bít ống tủy'], a: 1, x: 'Giảm 56% lực cắt dồn lên JIZAI I (dữ liệu MANI).' },
      { c: 1, q: 'Nghiên cứu tại Việt Nam (2024) trên 45 răng hàm lớn hàm dưới: tỷ lệ thành công của JIZAI sau 6 tháng?', o: ['75,56%', '85,56%', '95,56%', '100%'], a: 2, x: 'Thời gian tạo hình trung bình 28,87 phút, không tai biến trong quá trình sửa soạn.' },
      { c: 1, q: 'Composite MMG nào có nhiều màu men (Bleach, Incisal), dễ đánh bóng, phù hợp răng trước thẩm mỹ cao?', o: ['Mani Bulk', 'Mani Flo-V', 'Mani Micro', 'Mani Nano'], a: 2, x: 'Mani Micro: thẩm mỹ hoàn hảo, đóng khe thưa răng cửa, veneer dán dính.' },
      { c: 1, q: 'Composite MMG nào có co ngót 1,66%, cản quang 220%?', o: ['Mani Nano', 'Mani Bulk', 'Mani Flo-V', 'Mani EG'], a: 0, x: 'Mani Nano: co ngót tối thiểu, dùng cho răng trước và sau, tái tạo cùi.' },
      { c: 1, q: 'Mani Flo-V chiếu đèn mỗi lớp bao lâu?', o: ['10 giây', '20 giây', '40 giây', '2 phút'], a: 2, x: 'Flo-V: lớp không quá 2 mm, chiếu đèn 40 giây mỗi lớp.' },
      { c: 1, q: 'Dòng mũi khoan nào cắt bằng lưỡi, phù hợp cắt kim loại, tháo phục hình cũ?', o: ['DIA-BURS', 'Carbide Burs', 'MI Stainless Burs', 'IPR-01EF'], a: 1, x: 'Kim cương mài bằng hạt; carbide cắt bằng lưỡi.' },
      { c: 1, q: 'MI Stainless Burs dùng để làm gì?', o: ['Mài men răng', 'Cắt chọn lọc ngà mềm, giữ lại ngà lành', 'Chia cắt răng ngầm', 'Mài kẽ răng'], a: 1, x: 'Mũi thép lấy ngà sâu nhiễm khuẩn, nền tảng điều trị xâm lấn tối thiểu.' },
      { c: 1, q: 'Composite MMG nào đặt được một lớp dày 4 mm?', o: ['Mani Micro', 'Mani Flo-V', 'Mani Bulk', 'Mani Nano'], a: 2, x: 'Các dòng khác đặt lớp tối đa 2 mm.' },
      { c: 1, q: 'Keo dán Mani Bond dán kép nhờ hai thành phần nào?', o: ['10-MDP và 4-META', 'Bis-GMA và TEGDMA', 'Hydrogen peroxide và kali nitrat', 'Acid phosphoric và natri florua'], a: 0, x: '10-MDP liên kết hoá học với canxi của răng; 4-META giúp keo thấm vào mô.' },
      { c: 1, q: "Tẩy trắng tại ghế với Bleach'n Shine (gel Mani Bleach Office): có bắt buộc chiếu đèn không?", o: ['Bắt buộc đèn plasma', 'Bắt buộc laser', 'Không bắt buộc: dùng hoặc không dùng đèn', 'Chiếu đèn 60 giây mỗi răng'], a: 2, x: 'Gel 35% hydrogen peroxide, pH trung tính 7,3.' },
      { c: 2, q: 'Carbide Bur 1559L dùng để làm gì?', o: ['Mài kẽ răng', 'Mở buồng tủy', 'Chia cắt răng ngầm', 'Đánh bóng miếng trám'], a: 2, x: 'Mũi khoan chia cắt răng ngầm, dùng trong phẫu thuật nhổ răng khôn mọc lệch, răng ngầm.' },
      { c: 2, q: 'Ba đặc điểm nổi bật của 1559L, đúng thứ tự trên tờ rơi?', o: ['Lưỡi cắt dạng xoắn · Rãnh cắt chéo · Chiều dài làm việc 6 mm', 'Hạt kim cương · Lớp phủ niken · Chuôi CA', 'Lõi 55-60% · Vùng đệm · Xử lý nhiệt', 'Đầu 0,19 mm · Hạt siêu mịn · Dùng một lần'], a: 0, x: 'Ba đặc điểm theo tờ rơi tiếng Việt chính thức D17701.' },
      { c: 2, q: 'Lưỡi cắt dạng xoắn của 1559L mang lại gì?', o: ['Đổi màu khi mòn', 'Cắt liên tục, giảm rung so với lưỡi cắt truyền thống', 'Không cần phun nước', 'Dùng được trên máy nội nha'], a: 1, x: 'Rãnh cắt chéo thì nâng hiệu quả cắt, tăng tốc độ xử lý.' },
      { c: 2, q: 'Chiều dài làm việc 6 mm của 1559L giúp gì?', o: ['Cắt được kim loại', 'Giảm nguy cơ cuốn vướng mô mềm lân cận', 'Tăng tốc độ quay', 'Không cần tiệt khuẩn'], a: 1, x: 'Mũi Zekrya truyền thống có chiều dài làm việc 11 mm.' },
      { c: 2, q: 'Mũi Zekrya truyền thống có chiều dài làm việc bao nhiêu?', o: ['4 mm', '6 mm', '11 mm', '21 mm'], a: 2, x: '1559L chỉ 6 mm: giảm nguy cơ cuốn vướng mô mềm.' },
      { c: 2, q: 'Phần làm việc của 1559L làm bằng vật liệu gì?', o: ['Thép không gỉ', 'NiTi', 'Tungsten Carbide', 'Hạt kim cương'], a: 2, x: 'Phần làm việc Tungsten Carbide, chuôi thép không gỉ.' },
      { c: 3, q: 'Tốc độ khuyến nghị khi dùng 1559L?', o: ['40.000 vòng/phút', '120.000 vòng/phút', '160.000 vòng/phút', '450.000 vòng/phút'], a: 1, x: 'Vượt tốc độ này có thể gãy mũi khoan và gây chấn thương.' },
      { c: 3, q: 'Khi dùng 1559L, bác sĩ nên ấn lực thế nào?', o: ['Ấn mạnh để cắt nhanh', 'Lực ấn nhẹ "feather-touch"', 'Lắc mũi qua lại', 'Không cần lưu ý'], a: 1, x: 'Mũi có cấu tạo hai mảnh: tránh dùng lực quá mức.' },
      { c: 3, q: 'Dùng 1559L cần thận trọng khi thao tác quanh vùng nào?', o: ['Men răng và ngà răng', 'Ống răng dưới và dây thần kinh lưỡi', 'Nhú lợi kẽ răng', 'Buồng tủy'], a: 1, x: 'Ống răng dưới nằm sát chóp răng khôn hàm dưới; dây thần kinh lưỡi ở mặt trong xương hàm.' },
      { c: 3, q: '1559L có loại chuôi và tổng chiều dài nào?', o: ['CA · 22 mm', 'FG · 25 mm và 28 mm', 'RA · 16 mm', 'FG · 19 mm'], a: 1, x: 'Chiều dài làm việc 6 mm, đường kính tối đa 1,4 mm.' },
      { c: 3, q: 'Vì sao bác sĩ chia cắt răng ngầm thay vì nhổ nguyên khối?', o: ['Để giữ răng lại', 'Giảm lượng xương phải lấy, giảm sang chấn', 'Để không phải gây tê', 'Để không cần khâu'], a: 1, x: 'Chia cắt gọn, ít lấy xương: phẫu thuật nhẹ nhàng hơn cho bệnh nhân.' },
      { c: 4, q: 'IPR-01EF dùng cho thủ thuật nào?', o: ['Mở tủy', 'Mài kẽ răng trong chỉnh nha', 'Tháo mão kim loại', 'Chia cắt răng ngầm'], a: 1, x: 'IPR: interproximal reduction, mài bớt lớp men rất mỏng ở mặt bên răng để tạo khoảng.' },
      { c: 4, q: 'Đường kính đầu mũi IPR-01EF?', o: ['0,19 mm', '0,5 mm', '1,4 mm', '2 mm'], a: 0, x: 'Đầu mảnh, độ thuôn tối giản: vào được kẽ răng chật.' },
      { c: 4, q: 'Chữ EF và vòng màu vàng trên IPR-01EF cho biết gì?', o: ['Hạt thô', 'Hạt siêu mịn 20 đến 30 µm', 'Chuôi dài', 'Dùng cho turbine'], a: 1, x: 'Hạt siêu mịn: ít rung, cần lực tối thiểu, bề mặt men nhẵn.' },
      { c: 4, q: 'IPR-01EF dùng với tay khoan nào, tốc độ tối đa bao nhiêu?', o: ['Turbine hơi, 450.000 vòng/phút', 'Contra-angle, 160.000 vòng/phút', 'Máy nội nha, 500 vòng/phút', 'Tay khoan thẳng, 40.000 vòng/phút'], a: 1, x: 'Contra-angle, tối đa 160.000 vòng/phút.' },
      { c: 4, q: 'Thiết kế hơi dẻo của IPR-01EF giúp gì?', o: ['Trượt êm trên mặt kẽ răng khi dùng lực tối thiểu', 'Cắt được kim loại', 'Dùng được nhiều ca', 'Không cần phun nước'], a: 0, x: 'Mũi IPR thông thường cứng, tạo mặt cắt thẳng.' },
      { c: 5, q: 'Trong chỉnh nha khay trong suốt, lượng mài kẽ (IPR) thường là bao nhiêu?', o: ['0,02 đến 0,05 mm', '0,2 đến 0,5 mm', '2 đến 5 mm', '1 đến 2 cm'], a: 1, x: 'Đầu 0,19 mm giúp kiểm soát chính xác mức 0,2 mm.' },
      { c: 5, q: 'Một mũi IPR-01EF dùng cho bao nhiêu?', o: ['Một kẽ răng', 'Một ca hai hàm, dùng một lần', 'Mười ca', 'Dùng mãi, chỉ cần tiệt khuẩn'], a: 1, x: 'Thay ngay khi cảm giác cắt giảm; không dùng lực mạnh.' },
      { c: 5, q: 'Theo báo cáo lâm sàng của BS Tetsuya Shimoda, thời gian mài kẽ bằng IPR-01EF so với dải nhám tay?', o: ['Bằng nhau', 'Khoảng 1/2', 'Khoảng 1/10', 'Gấp đôi'], a: 2, x: 'So với dải nhám gắn tay khoan contra-angle: khoảng 1/5.' },
      { c: 5, q: 'Trường hợp nào KHÔNG chỉ định mài kẽ răng?', o: ['Chen chúc mức vừa', 'Thiểu sản men', 'Chỉnh nha khay trong suốt cần mài kẽ', 'Cân bằng tỷ lệ răng trước'], a: 1, x: 'Không chỉ định: răng vĩnh viễn còn non, thiểu sản men, ê buốt ngà, sâu mặt bên, chân răng quá gần nhau.' },
      { c: 5, q: 'Mài kẽ bằng IPR-01EF: đặt đầu mũi thế nào?', o: ['Từ rìa cắn đi xuống cổ răng, ấn mạnh', 'Từ phía cổ răng, đưa lên rìa cắn, lực nhẹ', 'Đặt vuông góc mặt nhai', 'Đưa vào ống tủy'], a: 1, x: 'Đường vào từ phía má hoặc phía lưỡi.' }
    ]
  }
};
