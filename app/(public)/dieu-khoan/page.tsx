import type { Metadata } from "next";
import { ContactLine, LegalLink, LegalPage } from "@/components/account/LegalPage";
import { PRIVACY_PATH } from "@/lib/auth/routes";

export const metadata: Metadata = {
  title: "Điều khoản sử dụng",
  description: "Điều khoản sử dụng trang Lịch sử Việt Nam 12: tài khoản học sinh, gói luyện thi, ủng hộ.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Điều khoản sử dụng">
      <p>
        Lịch sử Việt Nam 12 là công cụ hỗ trợ học tập môn Lịch sử lớp 12, <strong>không thay thế sách giáo khoa</strong>.
        Khi dùng trang web hoặc tạo tài khoản, em đồng ý với các điều dưới đây và với{" "}
        <LegalLink href={PRIVACY_PATH}>Chính sách bảo mật</LegalLink>.
      </p>

      <h2>1. Dùng không cần tài khoản</h2>
      <p>
        Mọi bài học, bản đồ, dòng thời gian và trắc nghiệm theo bài đều dùng được mà không cần đăng ký. Tiến độ học khi chưa
        đăng nhập chỉ lưu trên trình duyệt của máy em đang dùng.
      </p>

      <h2>2. Tài khoản học sinh</h2>
      <ul>
        <li>Mỗi người một tài khoản, dùng email thật của mình. Em tự giữ mật khẩu và không chia sẻ cho người khác.</li>
        <li>Nếu em dưới 16 tuổi, hãy nhờ bố mẹ hoặc người giám hộ đồng ý trước khi tạo tài khoản.</li>
        <li>Dùng máy chung (máy trường, quán net) thì nhớ đăng xuất khi xong.</li>
        <li>
          Tài khoản không cho thêm quyền nào với nội dung của trang: chỉ nhân sự được cấp quyền mới soạn và duyệt nội dung.
        </li>
      </ul>

      <h2>3. Không được làm</h2>
      <ul>
        <li>Dò mật khẩu, mã kích hoạt hoặc mã đơn của người khác; gửi yêu cầu tự động hàng loạt.</li>
        <li>Tìm cách vượt qua giới hạn số thiết bị của mã kích hoạt, hoặc công khai mã cho nhiều người dùng chung.</li>
        <li>Gửi lời nhắn ủng hộ có nội dung xúc phạm, quảng cáo hoặc thông tin cá nhân của người khác.</li>
      </ul>
      <p>Tài khoản vi phạm có thể bị khóa; mã kích hoạt bị lạm dụng có thể bị thu hồi.</p>

      <h2>4. Gói luyện thi và ủng hộ</h2>
      <ul>
        <li>
          Gói luyện thi dùng cho mục đích học tập cá nhân. Số đề đang có và số thiết bị tối đa ghi rõ ở trang Luyện thi trước
          khi em mua.
        </li>
        <li>
          Thanh toán do cổng thanh toán xử lý; trang web không nhận và không lưu thông tin thẻ hay tài khoản ngân hàng của em.
        </li>
        <li>
          Nếu đã chuyển tiền mà chưa nhận được mã, em dùng trang <LegalLink href="/thanh-toan/tra-cuu">Tra cứu đơn</LegalLink>{" "}
          hoặc liên hệ <ContactLine /> kèm mã đơn.
        </li>
        <li>Lời nhắn ủng hộ chỉ hiện trên Bức tường cảm ơn khi em chọn hiển thị và đã được quản trị viên duyệt.</li>
      </ul>

      <h2>5. Nội dung</h2>
      <p>
        Nội dung được biên soạn và kiểm duyệt, có ghi nguồn. Mốc thời gian gần đúng hoặc còn tranh luận và tọa độ ước lượng
        đều được ghi chú. Nếu em thấy sai sót, hãy báo cho <ContactLine />.
      </p>

      <h2>6. Thay đổi điều khoản</h2>
      <p>
        Khi điều khoản thay đổi, phiên bản và ngày cập nhật ở đầu trang sẽ đổi theo. Với thay đổi quan trọng, trang web sẽ
        hỏi lại sự đồng ý của em.
      </p>
    </LegalPage>
  );
}
