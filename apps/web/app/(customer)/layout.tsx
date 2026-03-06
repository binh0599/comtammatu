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
      <CustomerHeader restaurantName="Cơm tấm Má Tư" />
      <main id="main-content" className="mx-auto max-w-lg px-4 py-4 animate-page-in">{children}</main>
      <CustomerNav />
      <Toaster position="top-center" />
    </div>
  );
}
