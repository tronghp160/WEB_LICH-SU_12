import type { Metadata } from "next";
import { Download } from "lucide-react";
import type { ReactNode } from "react";
import { ChangePasswordForm } from "@/components/account/ChangePasswordForm";
import { DeleteAccountForm } from "@/components/account/DeleteAccountForm";
import { LinkedProviders } from "@/components/account/LinkedProviders";
import { Button } from "@/components/ui/Button";
import { signOutEverywhereAction } from "@/lib/actions/account";
import { requireLearner } from "@/lib/auth/learner";
import { isGoogleAuthEnabled } from "@/lib/auth/providers";
import { ACCOUNT_DATA_EXPORT, ACCOUNT_SECURITY } from "@/lib/auth/routes";

export const metadata: Metadata = { title: "Bảo mật tài khoản", robots: { index: false, follow: false } };

const NOTICES: Record<string, string> = {
  "lien-ket-google": "Đã liên kết Google. Lần sau em bấm “Tiếp tục với Google” là vào được tài khoản này.",
  "go-google": "Đã gỡ Google khỏi tài khoản. Em đăng nhập bằng email và mật khẩu nhé.",
};

function Section({ id, title, intro, children }: { id: string; title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="mt-6 rounded-card border border-border bg-surface p-5 shadow-card sm:p-6">
      <h2 id={id} className="font-serif text-xl font-bold text-foreground">
        {title}
      </h2>
      {intro && <p className="mb-4 mt-1 text-sm text-muted-foreground">{intro}</p>}
      <div className={intro ? undefined : "mt-4"}>{children}</div>
    </section>
  );
}

/**
 * Bảo mật (docs/ke-hoach-tai-khoan.md, mục 4.4, 10, 11): đổi / đặt mật khẩu, liên kết Google, đăng xuất mọi thiết bị,
 * tải dữ liệu, xóa tài khoản. Mọi thao tác là Server Action tự xác minh phiên (getUser), không nhận user id từ form.
 */
export default async function SecurityPage({ searchParams }: PageProps<"/tai-khoan/bao-mat">) {
  const learner = await requireLearner(ACCOUNT_SECURITY);
  const [params, googleEnabled] = await Promise.all([searchParams, isGoogleAuthEnabled()]);
  const notice = params["thong-bao"];
  const message = typeof notice === "string" ? NOTICES[notice] : undefined;

  return (
    <>
      {message && (
        <p id="bao-mat-thong-bao" role="status" className="mb-6 rounded-lg border border-border bg-surface-raised px-4 py-3 text-sm text-foreground">
          {message}
        </p>
      )}
      <h1 className="font-serif text-3xl font-bold text-foreground">Bảo mật</h1>

      <Section
        id="mat-khau"
        title="Mật khẩu"
        intro={
          learner.methods.password
            ? "Đổi mật khẩu xong, các máy khác đang đăng nhập sẽ bị đăng xuất."
            : "Tài khoản của em đang vào bằng Google. Đặt thêm mật khẩu để đăng nhập được bằng email khi không dùng Google."
        }
      >
        <ChangePasswordForm email={learner.email} hasPassword={learner.methods.password} />
      </Section>

      <Section id="cach-dang-nhap" title="Cách đăng nhập">
        <LinkedProviders methods={learner.methods} googleEnabled={googleEnabled} />
      </Section>

      <Section
        id="thiet-bi"
        title="Thiết bị đang đăng nhập"
        intro="Quên đăng xuất ở máy trường hay máy bạn? Đăng xuất mọi thiết bị, kể cả máy này, rồi đăng nhập lại."
      >
        <form action={signOutEverywhereAction}>
          <Button type="submit" variant="secondary">
            Đăng xuất mọi thiết bị
          </Button>
        </form>
      </Section>

      <Section
        id="du-lieu"
        title="Dữ liệu của em"
        intro="Tải một tệp JSON gồm hồ sơ, tiến độ đã lưu vào tài khoản và các đơn hàng gắn với tài khoản."
      >
        {/* Route handler trả tệp tải về — dùng <a> thường, không prefetch. */}
        <a
          href={ACCOUNT_DATA_EXPORT}
          download
          className="inline-flex h-10 items-center gap-2 rounded-full border border-border px-4 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Tải dữ liệu của em
        </a>
      </Section>

      <Section
        id="xoa-tai-khoan"
        title="Xóa tài khoản"
        intro="Xóa vĩnh viễn hồ sơ và tiến độ lưu trên tài khoản. Không hoàn tác được. Mã kích hoạt gói luyện thi đã mua vẫn dùng được bằng cách nhập mã."
      >
        {learner.isStaff ? (
          <p className="text-sm text-foreground">
            Đây là tài khoản nhân sự. Nhờ quản trị viên gỡ quyền nhân sự trước khi xóa tài khoản.
          </p>
        ) : (
          <DeleteAccountForm email={learner.email} />
        )}
      </Section>
    </>
  );
}
