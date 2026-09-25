import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ModelViewer } from "@/components/model3d/ModelViewer";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { getModelSpec, modelSpecs } from "@/lib/models3d/specs";

// Mô hình khai báo trong code; id lạ trả 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return modelSpecs.map((spec) => ({ id: spec.id }));
}

export async function generateMetadata({ params }: PageProps<"/mo-hinh-3d/[id]">): Promise<Metadata> {
  const { id } = await params;
  const spec = getModelSpec(id);
  if (!spec) return { title: "Không tìm thấy nội dung" };
  return { title: `Mô hình 3D: ${spec.title}`, description: spec.summary };
}

/** Trang riêng của một mô hình 3D (để trình chiếu); `?debug=1` bật `window.__model3d` cho kiểm thử tự động. */
export default async function Model3dPage({ params, searchParams }: PageProps<"/mo-hinh-3d/[id]">) {
  const { id } = await params;
  const spec = getModelSpec(id);
  if (!spec) notFound();
  const debug = (await searchParams).debug === "1";
  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6">
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Chiến dịch Điện Biên Phủ", href: "/bai-hoc/chien-dich-dien-bien-phu" }, { label: spec.title }]} />
      <h1 className="mt-4 font-serif text-3xl font-bold text-foreground sm:text-4xl">{spec.title}</h1>
      <p className="mt-2 max-w-3xl text-muted-foreground">{spec.summary}</p>
      <div className="mt-6">
        <ModelViewer spec={spec} debug={debug} />
      </div>
      <p className="mt-6">
        <Link href="/bai-hoc/chien-dich-dien-bien-phu" className="font-medium text-accent hover:underline">
          ← Quay lại bài học Chiến dịch Điện Biên Phủ
        </Link>
      </p>
    </div>
  );
}
