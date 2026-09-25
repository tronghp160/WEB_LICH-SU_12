import type { ModelGroup, ModelSpec } from "@/lib/models3d/types";

/**
 * Danh sách mô hình 3D của bài học. Mọi mô hình là dựng minh họa bằng mã (không phải bản quét hay ảnh chụp).
 * Muốn thay bằng mô hình thật (glb), đổi `source` thành { kind: "glb", url, credit, licenseUrl } — xem docs/bai-hoc-tuong-tac.md.
 * Vị trí điểm chú thích theo hệ tọa độ của bộ dựng tương ứng (components/model3d/builders).
 */
const PROCEDURAL = { kind: "procedural" } as const;

export const modelSpecs: ModelSpec[] = [
  {
    id: "luu-phao-105",
    group: "hien-vat",
    title: "Lựu pháo 105 mm",
    summary: "Khẩu pháo kéo bằng tay qua núi, nằm trong trận địa ngụy trang trên sườn núi bao quanh lòng chảo.",
    description:
      "Mô hình 3D một khẩu lựu pháo 105 mm: nòng dài nâng góc bắn, lá chắn thép phía trước, hai bánh xe, hai càng pháo cắm xuống đất, thùng đạn gỗ, vỏ đạn bằng đồng và bao cát che chắn, phủ lưới và lá ngụy trang.",
    camera: { position: [6.4, 3.4, 7.2], target: [0, 1.05, 0.2], minDistance: 3, maxDistance: 14 },
    environment: "outdoor",
    autoRotate: true,
    hotspots: [
      { id: "nong", label: "Nòng pháo", text: "Nòng pháo cỡ 105 mm, bắn đạn nổ theo đường cong tới các cứ điểm trong lòng chảo. Phía trên nòng là hai xi lanh giảm giật.", position: [0, 1.62, -1.5] },
      { id: "la-chan", label: "Lá chắn", text: "Lá chắn thép mỏng che cho kíp pháo khỏi mảnh đạn và đạn nhỏ. Ở Điện Biên Phủ, pháo được ngụy trang kín bằng lá cây và giấu trong hầm, chỉ đưa ra bắn rồi kéo vào.", position: [0.5, 1.28, -0.75] },
      { id: "banh-xe", label: "Bánh xe", text: "Hai bánh xe bọc cao su. Khi kéo qua núi, bộ đội tháo pháo ra hoặc dùng tời, dây và sức người, có lúc kéo từng đoạn dài hàng chục ki-lô-mét.", position: [1.15, 1.02, 0.05] },
      { id: "cang", label: "Càng pháo", text: "Hai càng pháo dạng ống thép xòe rộng, đầu có bàn đạp cắm sâu xuống đất để giữ pháo đứng vững khi bắn.", position: [1.0, 0.36, 2.4] },
      { id: "dan", label: "Đạn pháo", text: "Đạn pháo gồm vỏ bằng đồng và đầu đạn. Vận chuyển đủ đạn dược ra mặt trận là công việc của hàng chục vạn dân công.", position: [-1.85, 0.3, 2.6] },
    ],
    source: PROCEDURAL,
    note: "Dựng minh họa bằng đồ họa 3D theo hình dáng lựu pháo 105 mm; chi tiết được giản lược, không phải bản quét hiện vật.",
    toVerify: ["Loại pháo và cỡ nòng ta sử dụng ở Điện Biên Phủ (lựu pháo 105 mm) cùng các chi tiết mô tả về kéo pháo."],
  },
  {
    id: "xe-dap-tho",
    group: "hien-vat",
    title: "Xe đạp thồ",
    summary: "Chiếc xe đạp được gia cố, chở hàng trăm ki-lô-gam gạo và đạn dược theo đường rừng ra mặt trận.",
    description:
      "Mô hình 3D một chiếc xe đạp thồ: khung sắt, giá đèo hàng bằng gỗ, bao gạo chất cao buộc dây, tấm bạt phía trước và cần lái bằng tre dài để dắt xe, đặt trên con đường đất giữa lá ngụy trang.",
    camera: { position: [3.6, 1.9, 3.8], target: [0, 0.85, 0.3], minDistance: 1.6, maxDistance: 9 },
    environment: "outdoor",
    autoRotate: true,
    hotspots: [
      { id: "hang", label: "Hàng hóa", text: "Bao gạo chất cao, buộc chặt bằng dây. Một chiếc xe thồ có thể chở hàng trăm ki-lô-gam, nhiều lần nặng hơn người dắt xe.", position: [0.3, 1.32, 0.72] },
      { id: "can-lai", label: "Cần lái bằng tre", text: "Cần tre dài buộc vào ghi đông giúp người dắt xe giữ thăng bằng và lái chiếc xe nặng đi trên đường dốc, gồ ghề.", position: [0.04, 1.1, 1.6] },
      { id: "gia", label: "Giá đèo hàng gia cố", text: "Xe được gia cố thêm giá đỡ bằng gỗ, dùng dây và thanh chống để chịu tải nặng, không bị gãy khung.", position: [0.05, 0.72, 1.1] },
      { id: "banh", label: "Bánh xe", text: "Xe thồ đi qua đường rừng, suối, đèo dốc; dân công thường dắt bộ chứ ít khi đạp. Bánh xe và nan hoa phải chắc để chịu tải.", position: [0.03, 0.34, -0.58] },
    ],
    source: PROCEDURAL,
    note: "Dựng minh họa bằng đồ họa 3D theo hình dáng xe đạp thồ; chi tiết giản lược, không phải bản quét hiện vật.",
    toVerify: ["Tải trọng thường gặp của xe đạp thồ (hàng trăm ki-lô-gam) và cách gia cố khung, cần lái bằng tre."],
  },
  {
    id: "may-bay-c47",
    group: "hien-vat",
    title: "Máy bay vận tải C-47",
    summary: "Chiếc máy bay hai động cơ cánh quạt Pháp dùng để tiếp tế và thả dù cho tập đoàn cứ điểm Điện Biên Phủ.",
    description:
      "Mô hình 3D một máy bay vận tải C-47 (Dakota) đậu trên đường băng: thân kim loại dài, hai động cơ cánh quạt ba lá, phù hiệu tròn xanh trắng đỏ của không quân Pháp, cửa hàng ở phía sau. Có nút cho cánh quạt quay và nút thả hàng bằng dù.",
    camera: { position: [24, 9, 20], target: [0, 2.4, 0], minDistance: 8, maxDistance: 60 },
    environment: "outdoor",
    autoRotate: true,
    hotspots: [
      { id: "dong-co", label: "Động cơ và cánh quạt", text: "Hai động cơ cánh quạt ba lá. Mọi cứ điểm ở Điện Biên Phủ đều sống nhờ tiếp tế bằng đường không, nên khi ta pháo kích và khống chế sân bay, việc tiếp tế ngày càng khó khăn.", position: [4.7, 3.05, -5.3] },
      { id: "cua-hang", label: "Cửa hàng thả dù", text: "Hàng tiếp tế được đẩy qua cửa phía sau và thả dù xuống lòng chảo. Do bị pháo cao xạ bắn, máy bay phải bay cao nên nhiều kiện hàng rơi lệch sang trận địa của ta.", position: [-0.95, 1.6, 4.6] },
      { id: "phu-hieu", label: "Phù hiệu không quân Pháp", text: "Phù hiệu tròn ba màu xanh – trắng – đỏ của không quân Pháp, sơn ở hai bên thân và mặt cánh.", position: [0.6, 1.3, 6.5] },
      { id: "canh", label: "Cánh", text: "Sải cánh khoảng 29 m. Máy bay vận tải như thế này là mục tiêu chính của pháo cao xạ ta; theo tổng kết chiến dịch, ta bắn rơi và phá hủy 62 máy bay của địch.", position: [10.5, 2.1, -1.5] },
    ],
    actions: [
      { id: "engines", label: "Nổ máy" },
      { id: "drop", label: "Thả hàng" },
    ],
    source: PROCEDURAL,
    note: "Dựng minh họa bằng đồ họa 3D theo dáng máy bay C-47; chi tiết giản lược. Cách thả hàng là mô phỏng, không theo tỉ lệ thời gian thật.",
    toVerify: ["Việc Pháp dùng C-47 tiếp tế Điện Biên Phủ và nguyên nhân hàng rơi lệch; con số 62 máy bay (đã có trong danh sách chung của bài học)."],
  },
  {
    id: "chien-si",
    group: "hien-vat",
    title: "Người chiến sĩ và trang bị",
    summary: "Mũ nan cắm lá ngụy trang, ba lô, ống gạo, bi đông, dép cao su và súng trường của bộ đội ở Điện Biên Phủ.",
    description:
      "Mô hình 3D một chiến sĩ bộ đội đứng trên bệ tròn: mũ nan cắm lá ngụy trang, quân phục xanh lá, ba lô có chăn cuộn, ống gạo đeo chéo người, bi đông đeo bên hông, dép cao su và súng trường cầm chéo người.",
    camera: { position: [1.7, 1.5, 2.6], target: [0, 0.9, 0], minDistance: 1.1, maxDistance: 5, maxPolar: Math.PI * 0.55 },
    environment: "studio",
    autoRotate: true,
    hotspots: [
      { id: "mu-nan", label: "Mũ nan ngụy trang", text: "Mũ nan đan bằng tre, cắm thêm cành lá để lẫn vào cây rừng và tránh bị máy bay địch phát hiện khi hành quân, làm đường, vào trận địa.", position: [0.0, 1.8, 0.0] },
      { id: "ba-lo", label: "Ba lô và chăn cuộn", text: "Ba lô và tấm chăn cuộn chứa đồ dùng tối thiểu. Người lính đi hàng trăm ki-lô-mét đường rừng, mang nặng mà vẫn giữ nhịp hành quân.", position: [0.0, 1.35, -0.3] },
      { id: "ong-gao", label: "Ống gạo", text: "Bộ đội thường mang lương thực khô, như gạo, trong ống vải đeo chéo người để ăn dọc đường khi chưa kịp nấu.", position: [-0.06, 1.28, 0.16] },
      { id: "dep", label: "Dép cao su", text: "Dép cao su bền, nhẹ, đi được trên bùn, suối và đường đá, là đôi chân quen thuộc của người lính kháng chiến.", position: [0.11, 0.05, 0.18] },
      { id: "sung", label: "Súng trường", text: "Súng trường là vũ khí cá nhân của bộ binh khi xung phong và bám trụ trong chiến hào.", position: [0.04, 1.26, 0.3] },
    ],
    source: PROCEDURAL,
    note: "Dựng minh họa bằng đồ họa 3D; trang phục và trang bị được giản lược, không phải bản sao chính xác của một đơn vị hay một nhân vật cụ thể.",
    toVerify: ["Mô tả trang bị (mũ nan, ống gạo, dép cao su) cho phù hợp tư liệu về bộ đội ở Điện Biên Phủ."],
  },
  {
    id: "ham-de-castries",
    group: "di-tich",
    title: "Hầm chỉ huy De Castries",
    summary: "Sở chỉ huy tập đoàn cứ điểm: mái vòm thép lượn sóng phủ đất và bao cát, bên trong chia thành nhiều gian.",
    description:
      "Mô hình 3D hầm chỉ huy của tướng De Castries được cắt bổ một nửa: mái vòm thép lượn sóng phủ lớp đất, cửa hầm có bậc thang và bao cát, bên trong có phòng giường tầng, phòng làm việc với bàn bản đồ và đèn treo, phòng điện đài. Trên nóc hầm có lá cờ Quyết chiến, Quyết thắng.",
    camera: { position: [11.5, 5.2, 9.5], target: [0, 0.6, 0.4], minDistance: 4, maxDistance: 32 },
    environment: "outdoor",
    autoRotate: false,
    hotspots: [
      { id: "mai-vom", label: "Mái vòm thép", text: "Mái vòm bằng thép lượn sóng, phủ thêm lớp đất và bao cát để chống pháo. Ngày nay hầm được bảo tồn và có thể tham quan.", position: [0, 2.95, -5.4] },
      { id: "phong-lam-viec", label: "Phòng làm việc", text: "Nơi tướng De Castries cùng Bộ tham mưu chỉ huy tập đoàn cứ điểm, với bàn bản đồ tác chiến và đèn treo. Chiều 7/5/1954 tại đây toàn bộ Bộ tham mưu bị bắt sống.", position: [0.3, 0.9, 0] },
      { id: "dien-dai", label: "Phòng điện đài", text: "Liên lạc với Hà Nội và các cứ điểm khác được thực hiện qua điện đài và điện thoại đặt ở các gian trong hầm.", position: [-1.7, 0.75, 5.4] },
      { id: "cua-ham", label: "Cửa hầm", text: "Cửa hầm có bậc thang bê tông xuống sàn, hai bên xếp bao cát che chắn.", position: [0, 0.9, 8.4] },
      { id: "la-co", label: "Lá cờ trên nóc hầm", text: "Chiều 7/5/1954, lá cờ \"Quyết chiến, Quyết thắng\" được cắm trên nóc hầm, đánh dấu tập đoàn cứ điểm Điện Biên Phủ thất thủ.", position: [0.9, 4.4, -2.0] },
    ],
    source: PROCEDURAL,
    note: "Dựng minh họa bằng đồ họa 3D theo mô tả và ảnh hầm ngày nay: số gian, cách bố trí nội thất và hình dạng lá cờ là giản lược, không phải bản vẽ chính xác của hầm.",
    toVerify: ["Số gian, kích thước và bố trí bên trong hầm chỉ huy; hình dáng, chữ trên lá cờ cắm trên nóc hầm ngày 7/5/1954."],
  },
  {
    id: "duong-ham-a1",
    group: "di-tich",
    title: "Đường hầm và hố bộc phá đồi A1",
    summary: "Mặt cắt đồi A1: đường hầm đào ngang vào dưới cứ điểm địch, buồng khối bộc phá và vụ nổ đêm 6/5/1954.",
    description:
      "Mô hình 3D mặt cắt đồi A1: khối đất nhiều lớp, đường hầm có khung chống gỗ đào ngang từ chân đồi vào tới buồng chứa khối bộc phá ngay dưới hầm chỉ huy của địch trên đỉnh đồi. Có nút mô phỏng vụ nổ: cứ điểm bị hất tung và để lại hố sâu.",
    camera: { position: [5, 11, 32], target: [0, 6.2, 0], minDistance: 9, maxDistance: 52, maxPolar: Math.PI * 0.52 },
    environment: "studio",
    autoRotate: false,
    hotspots: [
      { id: "cua-ham", label: "Cửa đường hầm", text: "Đường hầm được bộ đội đào ngang từ chân đồi, có khung gỗ chống đỡ. Việc đào phải làm âm thầm, ban đêm, để địch không phát hiện.", position: [11.6, 5.1, 5.2] },
      { id: "buong-boc-pha", label: "Buồng khối bộc phá", text: "Cuối đường hầm là buồng đặt khối bộc phá gần một tấn, nằm ngay dưới hầm chỉ huy của địch trên đỉnh đồi A1.", position: [-0.6, 5.3, 5.3] },
      { id: "cu-diem", label: "Cứ điểm trên đỉnh đồi", text: "Trên đỉnh A1 (địch gọi là Éliane 2) có hầm ngầm, chiến hào và bao cát. Đây là nơi hai bên giành giật từng tấc đất suốt nhiều tuần.", position: [0, 12.6, 0.4] },
      { id: "chien-hao", label: "Chiến hào của ta", text: "Bộ đội ta dùng hệ thống chiến hào tiến sát cứ điểm, chờ giờ G để xung phong sau vụ nổ.", position: [9.6, 7.5, 1.4] },
    ],
    actions: [{ id: "boom", label: "Mô phỏng vụ nổ" }],
    source: PROCEDURAL,
    note: "Mặt cắt minh họa, không theo tỉ lệ: đường hầm thật dài khoảng 45 m và các lớp đất, khung chống, buồng thuốc nổ được giản lược. Vụ nổ là mô phỏng.",
    toVerify: ["Chiều dài đường hầm (~45 m), khối bộc phá (~1 tấn), thời điểm nổ 20 giờ 30 ngày 6/5/1954 và vị trí buồng bộc phá."],
  },
  {
    id: "chien-hao-a1",
    group: "di-tich",
    title: "Hệ thống chiến hào tiến sát cứ điểm",
    summary: "Hào trục chạy ngang, các hào nhánh gấp khúc dẫn lên đồi, rào thép gai và cứ điểm địch: cách bộ đội tiến sát từng tấc đất.",
    description:
      "Mô hình 3D sa bàn khu đồi A1: phía gần người xem là hào trục của ta chạy ngang cùng ba hào nhánh gấp khúc dẫn lên đồi, bộ đội đứng trong hào dưới lá cờ đỏ sao vàng; phía xa là cứ điểm của địch với hầm, bao cát, hào bao quanh đỉnh đồi, rào thép gai và các hố bom.",
    camera: { position: [4, 34, 62], target: [0, 0, 4], minDistance: 12, maxDistance: 100, maxPolar: Math.PI * 0.49 },
    environment: "outdoor",
    autoRotate: false,
    hotspots: [
      { id: "hao-truc", label: "Hào trục", text: "Hào trục chạy ngang phía trước, là đường giao thông và nơi đặt bàn đạp xuất phát. Nhờ hào, bộ đội vừa tránh được pháo và máy bay địch, vừa siết dần vòng vây.", position: [-2, 0.4, 20.5] },
      { id: "hao-nhanh", label: "Hào nhánh gấp khúc", text: "Từ hào trục, các hào nhánh được đào tiến dần về phía cứ điểm. Hào gấp khúc hình zíc-zắc để mảnh đạn nổ không thể quét dọc cả đường hào.", position: [4, 0.4, 12.5] },
      { id: "rao-thep-gai", label: "Rào thép gai", text: "Trước hào địch có nhiều lớp rào thép gai. Bộ đội phải dùng bộc phá, kìm cắt hoặc đào hào sát rào để mở đường xung phong.", position: [0, 1.0, 14.4] },
      { id: "cu-diem", label: "Cứ điểm địch", text: "Cứ điểm trên đồi có hầm chỉ huy, hỏa điểm và hào bao quanh, dựa vào địa hình cao để khống chế cả vùng.", position: [0, 4.2, -2.5] },
      { id: "ho-bom", label: "Hố bom, hố pháo", text: "Các hố sâu do bom pháo và bộc phá tạo ra vẫn còn dấu vết ở đồi A1 ngày nay.", position: [-2, 0.2, 11.5] },
    ],
    source: PROCEDURAL,
    note: "Dựng minh họa theo mô tả và ảnh chiến hào được bảo tồn trên đồi A1; số lượng, hình dạng hào và vị trí công sự là giản lược, không phải bản vẽ chính xác.",
    toVerify: ["Hình dạng, số lượng hào trục và hào nhánh quanh đồi A1 và vị trí rào thép gai."],
  },
  {
    id: "sa-ban-chien-thang",
    group: "so-lieu",
    title: "Sa bàn lòng chảo và những con số chiến thắng",
    summary: "Lòng chảo Điện Biên Phủ dựng từ độ cao thật, cùng ba con số: 56 ngày đêm, 16.200 quân địch, 62 máy bay.",
    description:
      "Mô hình 3D sa bàn lòng chảo Điện Biên Phủ dựng từ dữ liệu độ cao thật: đồi núi bao quanh, sông Nậm Rốm, sân bay Mường Thanh và các cứ điểm đổi từ cờ Pháp sang cờ đỏ sao vàng. Phía trước bệ có ba khối số liệu: 56 ô lịch cho 56 ngày đêm, một khối hàng chục nghìn chấm nhỏ cho 16.200 quân địch bị loại khỏi vòng chiến đấu và 62 chiếc máy bay bị bắn rơi, phá hủy.",
    camera: { position: [4, 30, 52], target: [0, 0, 8], minDistance: 12, maxDistance: 95, maxPolar: Math.PI * 0.49 },
    environment: "outdoor",
    autoRotate: false,
    hotspots: [
      { id: "long-chao", label: "Lòng chảo Mường Thanh", text: "Lòng chảo dài khoảng 18 km, rộng 6–8 km, bao quanh là núi cao. Sa bàn này dựng từ dữ liệu độ cao thật, phóng đại chiều cao 1,6 lần để dễ nhìn.", position: [0, 3.5, -6] },
      { id: "cu-diem", label: "Các cứ điểm đổi cờ", text: "Mười cứ điểm tiêu biểu: Him Lam, Độc Lập, Bản Kéo, sân bay, E1, D1, C1, A1, hầm De Castries và Hồng Cúm. Khi chiến dịch kết thúc, toàn bộ đã đổi sang cờ đỏ sao vàng.", position: [0.4, 2.3, -3.6] },
      { id: "56-ngay", label: "56 ngày đêm", text: "Chiến dịch kéo dài 56 ngày đêm, từ chiều 13/3 đến chiều 7/5/1954: mỗi ô là một ngày.", position: [-22.4, 1.6, 21.2] },
      { id: "16200-quan", label: "16.200 quân địch", text: "Khoảng 16.200 quân địch bị loại khỏi vòng chiến đấu: mỗi chấm nhỏ là một người, gồm những người bị tiêu diệt, bị bắt sống hoặc bị thương.", position: [-2.2, 0.8, 23.5] },
      { id: "62-may-bay", label: "62 máy bay", text: "Ta bắn rơi và phá hủy 62 máy bay của địch. Không quân là con đường sống của tập đoàn cứ điểm, nên mất máy bay là mất tiếp tế.", position: [9.5, 0.9, 20.5] },
    ],
    actions: [{ id: "replay", label: "Xem lại hoạt cảnh" }],
    source: PROCEDURAL,
    note: "Địa hình dựng từ dữ liệu độ cao thật (Terrain Tiles, SRTM), phóng đại chiều cao; vị trí cứ điểm theo OpenStreetMap (Bản Kéo, Hồng Cúm gần đúng). Các khối số liệu là minh họa: số lượng theo tổng kết chiến dịch, hình khối do chương trình tự tạo.",
    toVerify: ["Các con số 56 ngày đêm, 16.200 quân, 62 máy bay (đã có trong danh sách chung của bài học)."],
  },
  {
    id: "tuong-vo-nguyen-giap",
    group: "nhan-vat",
    title: "Võ Nguyên Giáp",
    summary: "Đại tướng, Chỉ huy trưởng chiến dịch Điện Biên Phủ.",
    description: "Tượng bán thân bằng đồng cách điệu của Võ Nguyên Giáp trên bệ đá cẩm thạch có bảng tên. Khuôn mặt được giản lược, không phải chân dung.",
    camera: { position: [1.6, 1.5, 2.5], target: [0, 0.5, 0], minDistance: 1.2, maxDistance: 5, maxPolar: Math.PI * 0.56 },
    environment: "studio",
    autoRotate: true,
    hotspots: [
      { id: "nhan-vat", label: "Võ Nguyên Giáp", text: "Đại tướng Võ Nguyên Giáp, Chỉ huy trưởng chiến dịch. Ông đưa ra quyết định khó khăn nhất đời cầm quân: chuyển từ \"đánh nhanh, giải quyết nhanh\" sang \"đánh chắc, tiến chắc\".", position: [0, 1.32, 0.2] },
      { id: "cach-dieu", label: "Tượng cách điệu", text: "Đây là tượng dựng cách điệu bằng đồ họa 3D: mũ và quân phục chỉ mang tính gợi ý, khuôn mặt được giản lược nên không phải chân dung của nhân vật.", position: [0, 0.6, 0.34] },
    ],
    source: PROCEDURAL,
    note: "Tượng dựng minh họa bằng đồ họa 3D, khuôn mặt giản lược; không phải chân dung hay bản sao tượng có thật.",
    toVerify: ["Kiểu mũ và quân phục của tượng chỉ mang tính gợi ý."],
  },
  {
    id: "tuong-de-castries",
    group: "nhan-vat",
    title: "Christian de Castries",
    summary: "Chỉ huy tập đoàn cứ điểm Điện Biên Phủ của Pháp.",
    description: "Tượng bán thân bằng đồng cách điệu của Christian de Castries trên bệ đá cẩm thạch có bảng tên. Khuôn mặt được giản lược, không phải chân dung.",
    camera: { position: [1.6, 1.5, 2.5], target: [0, 0.5, 0], minDistance: 1.2, maxDistance: 5, maxPolar: Math.PI * 0.56 },
    environment: "studio",
    autoRotate: true,
    hotspots: [
      { id: "nhan-vat", label: "Christian de Castries", text: "Christian de Castries, chỉ huy tập đoàn cứ điểm của Pháp, được thăng hàm thiếu tướng khi đang bị vây. Chiều 7/5/1954 ông bị bắt sống cùng toàn bộ Bộ tham mưu trong hầm chỉ huy.", position: [0, 1.32, 0.2] },
      { id: "cach-dieu", label: "Tượng cách điệu", text: "Đây là tượng dựng cách điệu bằng đồ họa 3D: mũ và quân phục chỉ mang tính gợi ý, khuôn mặt được giản lược nên không phải chân dung của nhân vật.", position: [0, 0.6, 0.34] },
    ],
    source: PROCEDURAL,
    note: "Tượng dựng minh họa bằng đồ họa 3D, khuôn mặt giản lược; không phải chân dung hay bản sao tượng có thật.",
    toVerify: ["Kiểu mũ và quân phục của tượng chỉ mang tính gợi ý."],
  },
  {
    id: "tuong-phan-dinh-giot",
    group: "nhan-vat",
    title: "Phan Đình Giót",
    summary: "Anh hùng Lực lượng vũ trang nhân dân, trận Him Lam.",
    description: "Tượng bán thân bằng đồng cách điệu của Phan Đình Giót trên bệ đá cẩm thạch có bảng tên. Khuôn mặt được giản lược, không phải chân dung.",
    camera: { position: [1.6, 1.5, 2.5], target: [0, 0.5, 0], minDistance: 1.2, maxDistance: 5, maxPolar: Math.PI * 0.56 },
    environment: "studio",
    autoRotate: true,
    hotspots: [
      { id: "nhan-vat", label: "Phan Đình Giót", text: "Trong trận Him Lam ngày 13/3/1954, anh Phan Đình Giót bị thương nặng nhưng vẫn lao lên lấy thân mình lấp lỗ châu mai của lô cốt địch, mở đường cho đồng đội xung phong.", position: [0, 1.32, 0.2] },
      { id: "cach-dieu", label: "Tượng cách điệu", text: "Đây là tượng dựng cách điệu bằng đồ họa 3D: mũ và quân phục chỉ mang tính gợi ý, khuôn mặt được giản lược nên không phải chân dung của nhân vật.", position: [0, 0.6, 0.34] },
    ],
    source: PROCEDURAL,
    note: "Tượng dựng minh họa bằng đồ họa 3D, khuôn mặt giản lược; không phải chân dung hay bản sao tượng có thật.",
    toVerify: ["Kiểu mũ và quân phục của tượng chỉ mang tính gợi ý."],
  },
  {
    id: "tuong-to-vinh-dien",
    group: "nhan-vat",
    title: "Tô Vĩnh Diện",
    summary: "Anh hùng Lực lượng vũ trang nhân dân, người kéo pháo.",
    description: "Tượng bán thân bằng đồng cách điệu của Tô Vĩnh Diện trên bệ đá cẩm thạch có bảng tên. Khuôn mặt được giản lược, không phải chân dung.",
    camera: { position: [1.6, 1.5, 2.5], target: [0, 0.5, 0], minDistance: 1.2, maxDistance: 5, maxPolar: Math.PI * 0.56 },
    environment: "studio",
    autoRotate: true,
    hotspots: [
      { id: "nhan-vat", label: "Tô Vĩnh Diện", text: "Khi dây tời bị đứt, khẩu pháo lao xuống dốc, anh Tô Vĩnh Diện đã lao vào lấy thân mình chèn bánh xe để cứu pháo và hy sinh. Tấm gương của anh là biểu tượng của tinh thần kéo pháo ở Điện Biên Phủ.", position: [0, 1.32, 0.2] },
      { id: "cach-dieu", label: "Tượng cách điệu", text: "Đây là tượng dựng cách điệu bằng đồ họa 3D: mũ và quân phục chỉ mang tính gợi ý, khuôn mặt được giản lược nên không phải chân dung của nhân vật.", position: [0, 0.6, 0.34] },
    ],
    source: PROCEDURAL,
    note: "Tượng dựng minh họa bằng đồ họa 3D, khuôn mặt giản lược; không phải chân dung hay bản sao tượng có thật.",
    toVerify: ["Kiểu mũ và quân phục của tượng chỉ mang tính gợi ý."],
  },
];

export function getModelSpec(id: string): ModelSpec | undefined {
  return modelSpecs.find((spec) => spec.id === id);
}

export function specsByGroup(group: ModelGroup): ModelSpec[] {
  return modelSpecs.filter((spec) => spec.group === group);
}
