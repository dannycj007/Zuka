import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZukaEvents",
  description: "Digital event invitations and guest check-in for Tanzania.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-white text-zinc-900">
        {children}
      </body>
    </html>
  );
}
