import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: '首钢泡泡计划 · SHOU GANG / BUBBLE PROTOCOL',
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
