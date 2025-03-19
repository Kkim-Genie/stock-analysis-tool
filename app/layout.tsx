import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/NavBar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "주식 데이터 분석 도구",
  description: "다양한 기술적 분석 도구를 활용한 주식 데이터 분석 애플리케이션",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className={`${inter.className} min-h-screen bg-gray-100`}>
        <Navbar />
        <main className="container mx-auto px-4 py-6">{children}</main>
        <footer className="bg-white shadow-inner py-4">
          <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} 주식 데이터 분석 애플리케이션
          </div>
        </footer>
      </body>
    </html>
  );
}
