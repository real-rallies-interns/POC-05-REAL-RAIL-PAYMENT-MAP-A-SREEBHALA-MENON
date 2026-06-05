import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Real Rails — Global RTP Intelligence",
  description: "Real-Time Payments Infrastructure Intelligence Platform. Track global instant payment scheme maturity and adoption.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-rr-black text-rr-text overflow-hidden h-screen">{children}</body>
    </html>
  );
}
