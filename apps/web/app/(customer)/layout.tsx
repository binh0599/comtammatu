import { CustomerHeader } from "@/components/customer/customer-header";
import { CustomerNav } from "@/components/customer/customer-nav";
import { Toaster } from "@/components/ui/sonner";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div data-route-group="customer" className="bg-background min-h-screen pb-16">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-foreground focus:shadow-lg focus:ring-2 focus:ring-ring">
        Bỏ qua đến nội dung chính
      </a>
      <CustomerHeader restaurantName="Com Tam Ma Tu" />
      <main id="main-content" className="mx-auto max-w-lg px-4 py-4">{children}</main>
      <CustomerNav />
      <Toaster position="top-center" />
    </div>
  );
}
