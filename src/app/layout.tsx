import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: '虚拟校园 - 自主学习平台',
    template: '%s | 虚拟校园',
  },
  description: '先规划，再行动。假期自主学习虚拟校园App。包含每日规划、番茄钟专注、场景打卡、睡眠管理等核心功能。',
  keywords: ['虚拟校园', '自主学习', '学习计划', '番茄钟', '时间管理', '学生'],
  authors: [{ name: '虚拟校园团队' }],
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    title: '虚拟校园 - 自主学习平台',
    description: '先规划，再行动。假期自主学习虚拟校园App。',
    siteName: '虚拟校园',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-screen bg-background text-foreground">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
