import type { Metadata } from 'next'
import { Noto_Serif_KR } from 'next/font/google'
import localFont from 'next/font/local'
import SiteHeader from '@/components/layout/SiteHeader'
import './globals.css'

// 제목용 세리프(Noto Serif KR), 본문·UI·숫자용 산세리프(Pretendard 가변 폰트, OFL). 한글 글꼴은 용량이 커서 구글 글꼴은 미리 불러오기(preload)를 끈다
const serif = Noto_Serif_KR({ weight: ['500', '700'], subsets: ['latin'], preload: false, variable: '--font-noto-serif' })
const sans = localFont({ src: './fonts/PretendardVariable.woff2', weight: '45 920', display: 'swap', variable: '--font-pretendard' })

export const metadata: Metadata = {
  title: 'Vibe Build — 건축물 증축 가능성 분석',
  description: '법규 완화에 따른 일조권·용적률 검토 및 증축 사업성 분석',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="ko" className={`${serif.variable} ${sans.variable} h-full antialiased`}>
      <body className="min-h-full">
        <SiteHeader />
        {children}
      </body>
    </html>
  )
}
