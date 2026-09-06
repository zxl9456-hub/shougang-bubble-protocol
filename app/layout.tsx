import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: '首钢园 · 霓虹泡泡夜 / SHOUGANG BUBBLE NIGHT',
  description: '在赛博像素首钢园中放置泡泡、点亮地标。单人闯关与一机双人对战。',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="dark">
      <body>{children}</body>
    </html>
  );
}
