import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Noto_Sans_JP, Noto_Serif_JP, Outfit, DM_Sans } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/ThemeProvider";
import OnboardingWrapper from "@/components/OnboardingWrapper";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const notoSerifJP = Noto_Serif_JP({
  variable: "--font-noto-serif-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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

// Theme init script - prevents flash before ThemeProvider hydrates
const themeInitScript = `
(function() {
  try {
    var stored = localStorage.getItem('virtual-campus-theme');
    if (stored && ['journal', 'pixel', 'zen', 'magazine', 'star-citizen', 'mirrors-edge'].indexOf(stored) !== -1) {
      document.documentElement.setAttribute('data-theme', stored);
    } else {
      document.documentElement.setAttribute('data-theme', 'journal');
    }
  } catch(e) {
    document.documentElement.setAttribute('data-theme', 'journal');
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} ${notoSansJP.variable} ${notoSerifJP.variable} ${outfit.variable} ${dmSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {/* Google Fonts for themes not available via next/font */}
        <link
          id="theme-fonts"
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;500;700&family=ZCOOL+XiaoWei&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=ZCOOL+QingKe+HuangYou&display=swap"
        />
      </head>
      <body className="min-h-screen bg-background text-foreground">
        <ThemeProvider>
          <OnboardingWrapper>
            {children}
            <Toaster position="top-center" richColors />
          </OnboardingWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}
