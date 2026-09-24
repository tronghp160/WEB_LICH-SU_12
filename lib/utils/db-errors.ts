// Dịch lỗi Postgres/PostgREST/Storage sang thông báo tiếng Việt dễ hiểu (Phase 10, mục 7).
// Hàm thuần — không lộ tên bảng/ràng buộc nội bộ cho người dùng.

export type DbErrorLike = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

export type DbErrorResult = {
  message: string;
  /** Trường của form gây lỗi (nếu suy ra được) để hiện lỗi ngay dưới ô đó. */
  field?: string;
};

/**
 * Cột vi phạm UNIQUE. PostgREST thường KHÔNG trả `details` cho khách/nhân sự, chỉ có tên ràng buộc
 * trong `message` (ví dụ `historical_events_slug_key` → cột `slug`); nếu có `details`
 * dạng `Key (slug)=(abc) already exists.` thì dùng luôn.
 */
function uniqueColumn(error: DbErrorLike): string | null {
  const fromDetails = /Key \(([^)]+)\)=/.exec(error.details ?? "");
  if (fromDetails) return fromDetails[1];
  // Chỉ có hai cột UNIQUE ở dạng constraint tên `<bảng>_<cột>_key`: slug và name.
  const fromConstraint = /unique constraint "[a-z_]*_(slug|name)_key"/.exec(error.message ?? "");
  return fromConstraint ? fromConstraint[1] : null;
}

const uniqueMessages: Record<string, DbErrorResult> = {
  slug: { message: "Đường dẫn đã tồn tại. Hãy chọn đường dẫn khác.", field: "slug" },
  name: { message: "Tên này đã tồn tại. Hãy chọn tên khác.", field: "name" },
};

export function translateDbError(error: DbErrorLike): DbErrorResult {
  const code = error.code ?? "";
  const text = `${error.message ?? ""} ${error.details ?? ""}`;

  // Lỗi do trigger nghiệp vụ (raise exception) — nội dung đã là tiếng Việt, giữ nguyên.
  if (code === "P0001" && error.message) {
    return { message: error.message };
  }

  switch (code) {
    case "23505": {
      const column = uniqueColumn(error);
      if (column && uniqueMessages[column]) return uniqueMessages[column];
      if (/uq_event_locations_one_primary|event_locations/.test(text)) {
        return { message: "Mỗi sự kiện chỉ có tối đa một địa điểm chính." };
      }
      return { message: "Dữ liệu bị trùng với một bản ghi đã có." };
    }
    case "23503":
      return { message: "Không thực hiện được vì dữ liệu đang được nơi khác sử dụng hoặc liên kết tới bản ghi không tồn tại." };
    case "23502":
      return { message: "Còn thiếu thông tin bắt buộc." };
    case "23514":
      return { message: checkViolationMessage(text) };
    case "22P02":
    case "22007":
    case "22008":
      return { message: "Có giá trị không đúng định dạng. Vui lòng kiểm tra lại." };
    case "42501":
      return { message: "Bạn không có quyền thực hiện thao tác này, hoặc nội dung đã chuyển sang trạng thái không cho phép chỉnh sửa." };
    case "PGRST301":
    case "PGRST303":
      return { message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." };
  }

  return { message: "Không lưu được do lỗi hệ thống. Vui lòng thử lại sau." };
}

/** Diễn giải ràng buộc CHECK bị vi phạm bằng cách nhận diện tên cột/ràng buộc trong thông báo. */
function checkViolationMessage(text: string): string {
  if (/latitude|longitude/.test(text)) {
    return "Tọa độ không hợp lệ: vĩ độ từ -90 đến 90, kinh độ từ -180 đến 180, và phải nhập cả hai hoặc bỏ trống cả hai.";
  }
  if (/death_year/.test(text)) return "Năm mất không được nhỏ hơn năm sinh.";
  if (/date_precision/.test(text)) return "Độ chính xác của mốc thời gian không hợp lệ.";
  if (/accuracy_level/.test(text)) return "Độ chính xác của tọa độ không hợp lệ.";
  if (/source_type/.test(text)) return "Loại nguồn không hợp lệ.";
  if (/media_type/.test(text)) return "Loại tệp không hợp lệ.";
  if (/historical_events/.test(text)) {
    return "Mốc thời gian không nhất quán: kiểm tra năm/ngày bắt đầu và kết thúc (năm của ngày phải khớp với năm, ngày kết thúc không được trước ngày bắt đầu).";
  }
  return "Dữ liệu không đúng ràng buộc. Vui lòng kiểm tra lại các trường.";
}
