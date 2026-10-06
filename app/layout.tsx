import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '건축물 증축 가능성 분석',
  description: '법규 완화에 따른 일조권·용적률 검토 및 증축 사업성 분석',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  )
}
