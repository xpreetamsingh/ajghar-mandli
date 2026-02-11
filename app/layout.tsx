import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Supabase Auth Demo",
  description: "Login and dashboard pages with Supabase auth"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
