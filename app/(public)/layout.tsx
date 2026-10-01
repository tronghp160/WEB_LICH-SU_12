import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileTabBar } from "@/components/layout/MobileTabBar";

export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <a
        href="#noi-dung-chinh"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-foreground"
      >
        Bỏ qua menu, tới nội dung chính
      </a>
      <Header />
      <main id="noi-dung-chinh" className="flex-1">
        {children}
      </main>
      {/* pb-14: chừa chỗ cho thanh tab dưới cùng trên điện thoại. */}
      <div className="pb-14 md:pb-0 print:pb-0">
        <Footer />
      </div>
      <MobileTabBar />
    </>
  );
}
