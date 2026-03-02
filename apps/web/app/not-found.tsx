import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-4">
      <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
      <h2 className="text-lg font-semibold">Khong tim thay trang</h2>
      <p className="text-sm text-muted-foreground text-center max-w-sm">
        Trang ban yeu cau khong ton tai hoac da bi xoa.
      </p>
      <Button asChild>
        <Link href="/">Ve trang chu</Link>
      </Button>
    </div>
  );
}
