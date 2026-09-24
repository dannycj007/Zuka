import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "ZukaEvents",
  description: "Digital event invitations and guest check-in for Tanzania.",
  icons: [{ url: "/logo-mark.png", type: "image/png" }],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`h-full antialiased ${inter.variable} ${poppins.variable}`}
    >
      <body className="pattern-bg flex min-h-full flex-col font-sans text-foreground">
        {children}
      </body>
    </html>
  );
}
