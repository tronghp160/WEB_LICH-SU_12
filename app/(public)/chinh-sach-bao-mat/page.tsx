import type { Metadata } from "next";
import { ContactLine, LegalLink, LegalPage } from "@/components/account/LegalPage";
import { TERMS_PATH } from "@/lib/auth/routes";

export const metadata: Metadata = {
  title: "Chính sách bảo mật",
  description: "Trang Lịch sử Việt Nam 12 thu thập dữ liệu gì, để làm gì, lưu ở đâu và em có quyền gì với dữ liệu của mình.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Chính sách bảo mật">
      <p>
        Trang này cho em biết Lịch sử Việt Nam 12 thu thập dữ liệu gì, dùng để làm gì và em có quyền gì. Nguyên tắc: chỉ
        thu những gì cần cho việc học, không quảng cáo, không bán hay chia sẻ dữ liệu cho bên thứ ba để quảng cáo. Xem thêm{" "}
        <LegalLink href={TERMS_PATH}>Điều khoản sử dụng</LegalLink>.
      </p>

      <h2>1. Dữ liệu được thu thập</h2>
      <ul>
        <li>
          <strong>Khi chưa đăng nhập:</strong> tiến độ học, con dấu Hộ chiếu, mã kích hoạt và một mã thiết bị ngẫu nhiên được
          lưu ngay trên trình duyệt của em (localStorage), không gửi lên máy chủ — trừ khi em kích hoạt mã hay làm đề trong
          gói (máy chủ chỉ nhận bản băm của mã thiết bị).
        </li>
        <li>
          <strong>Tài khoản:</strong> email, tên hiển thị, phiên bản điều khoản và thời điểm em đồng ý. Mật khẩu được hệ thống
          xác thực lưu dưới dạng băm — không ai trong nhóm xem được mật khẩu của em.
        </li>
        <li>
          <strong>Mua gói / ủng hộ:</strong> mã đơn, số tiền, trạng thái, email em nhập để nhận mã; tên và lời nhắn nếu em
          ủng hộ và chọn hiển thị.
        </li>
        <li>
          <strong>Chống lạm dụng:</strong> bản băm có muối của địa chỉ IP hoặc của một mã ngẫu nhiên trong cookie, để giới
          hạn số lần thử (tra cứu đơn, kích hoạt mã, tạo đơn). Không lưu địa chỉ IP thô.
        </li>
      </ul>

      <h2>2. Cookie</h2>
      <p>
        Trang chỉ dùng cookie cần thiết: giữ phiên đăng nhập, mã ngẫu nhiên để giới hạn số lần thử, cookie cho phép em xem
        lại đơn vừa mua, và cookie ngắn hạn trong lúc đăng ký / đặt lại mật khẩu. Không có cookie quảng cáo hay theo dõi.
      </p>

      <h2>3. Lưu ở đâu, ai xem được</h2>
      <ul>
        <li>Dữ liệu tài khoản và đơn hàng lưu trong cơ sở dữ liệu Supabase (máy chủ đặt tại Tokyo, Nhật Bản).</li>
        <li>
          Mỗi người chỉ đọc được hồ sơ của chính mình. Quản trị viên xem được tên hiển thị, email và đơn hàng để hỗ trợ khi có
          sự cố; biên tập viên và kiểm duyệt viên không xem được.
        </li>
        <li>Email xác nhận và đặt lại mật khẩu được gửi qua dịch vụ gửi thư của hệ thống.</li>
      </ul>

      <h2>4. Giữ trong bao lâu</h2>
      <ul>
        <li>Hồ sơ và tiến độ: đến khi em xóa tài khoản.</li>
        <li>
          Đơn hàng: giữ lại để đối soát thanh toán; khi em xóa tài khoản, đơn chỉ còn mã đơn và số tiền, không còn gắn với tài
          khoản. Mã kích hoạt đã mua vẫn dùng được trên các máy đã kích hoạt.
        </li>
      </ul>

      <h2>5. Quyền của em</h2>
      <ul>
        <li>Xem và sửa tên hiển thị, đổi mật khẩu bất cứ lúc nào.</li>
        <li>
          Yêu cầu xóa tài khoản hoặc hỏi về dữ liệu của mình: liên hệ <ContactLine />. Chức năng tự xóa tài khoản và tải dữ
          liệu trong trang Tài khoản sẽ có ở bản cập nhật tới.
        </li>
        <li>Nếu em dưới 16 tuổi, bố mẹ hoặc người giám hộ có thể thay em thực hiện các quyền trên.</li>
      </ul>
    </LegalPage>
  );
}
