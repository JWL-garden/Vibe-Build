import type { Metadata } from 'next'
import localFont from 'next/font/local'
import SiteHeader from '@/components/layout/SiteHeader'
import './globals.css'

// 본문·제목·숫자 모두 산세리프: 애플 기기는 시스템 글꼴, 그 밖은 Pretendard 가변 폰트(OFL)
const sans = localFont({ src: './fonts/PretendardVariable.woff2', weight: '45 920', display: 'swap', variable: '--font-pretendard' })

export const metadata: Metadata = {
  title: 'Vibe Build — 건축물 증축 가능성 분석',
  description: '법규 완화에 따른 일조권·용적률 검토 및 증축 사업성 분석',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="ko" className={`${sans.variable} h-full antialiased`}>
      <body className="min-h-full">
        <SiteHeader />
        {children}
      </body>
    </html>
  )
}
