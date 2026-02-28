import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Com Tam Ma Tu - CRM",
  description: "Restaurant management system for Com Tam Ma Tu chain",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
