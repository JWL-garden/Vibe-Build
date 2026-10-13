# 웹페이지 기술 스택

> 작성: 2026-10-13 · 기준: `package.json`, 설정 파일, 코드 실사용 확인
> 용도: 웹페이지 디자인 수정 전 현재 스택·디자인 상태 파악

## 1. 핵심 스택

| 구분 | 사용 기술 | 버전 | 역할 |
|---|---|---|---|
| 프레임워크 | Next.js (App Router) | 16.3.8 | 페이지 라우팅, 서버 API, 빌드·배포 |
| UI 라이브러리 | React | 19.2.8 | 화면 컴포넌트 |
| 언어 | TypeScript | 5.x | 타입 안전한 코드 |
| 스타일 | Tailwind CSS v4 (`@tailwindcss/postcss`) | 4.x | 유틸리티 클래스, 디자인 토큰, 인쇄(`print:`) 스타일 |
| 글꼴 | `next/font/google` — Noto Sans KR · Noto Serif KR | – | 본문(산세리프), 제목(세리프) |
| 상태관리 | Zustand | 5.0.15 | 분석 단계·시나리오·결과 공유 (`store/analysisStore.ts`) |
| 3D | three.js + React Three Fiber + drei | three 0.186 / R3F 9.8 / drei 10.7 | GLB 매스 모델 표시, 증축 전·후 조감 |
| 차트 | Recharts | 3.10 | 현금흐름 차트 (`components/charts/CashflowChart.tsx`) |
| 호스팅 | Vercel (GitHub 연동) | – | `git push` 시 자동 배포 |

## 2. 데이터·계산·도구

| 구분 | 사용 기술 | 역할 |
|---|---|---|
| 계산 엔진 | 순수 TypeScript 함수 (`lib/calc`) | 용적률·주차·일조·증축 산정, 사업비·수익성 |
| 설정 데이터 | `lib/rules`, `lib/data/*.json` | 법규·완화 시나리오·비용·시세 가정값, 엑셀 변환 JSON |
| 데이터 변환 | xlsx 0.18 + Node 스크립트 (`scripts/`) | 기준 엑셀 → JSON (`npm run data:excel`) |
| 3D 모델 가공 | @gltf-transform (core·extensions·functions) 4.5 | GLB 경량화 (`npm run model:trim`) |
| 서버 API | Next.js Route Handlers (`app/api/*`) | 주소·건축물·용도지역·주변 건물 조회 (실패 시 mock 대체) |
| 테스트 | Vitest 5 | 계산 함수·보고서 숫자 검증 |
| 정적 검사 | ESLint 9 + eslint-config-next | 코드 품질 |
| 보고서 출력 | 브라우저 인쇄(`window.print`) + A4 인쇄 CSS | PDF 저장. 쪽 나눔은 `lib/report/paginate.ts` |

## 3. 폴더 구조 (UI 관련)

| 경로 | 내용 |
|---|---|
| `app/page.tsx`, `app/AddressSearch.tsx` | 메인(주소 입력) |
| `app/analysis/` | 분석 화면 (`AnalysisLayout`, `AnalysisView`) |
| `app/report/` | 건축주 보고서 (`ReportView`) |
| `app/layout.tsx` | 루트 레이아웃, 글꼴, 공통 헤더 |
| `app/globals.css` | 디자인 토큰(`@theme`), 인쇄 설정 |
| `components/layout/` | `SiteHeader`, `Stepper`, `BuildingIllustration` |
| `components/steps/` | 분석 단계 화면 (⑤ 완화, ⑥ 증축 산정, ⑧ 수익성 등) |
| `components/report/` | 보고서 쪽 틀·장 컴포넌트 (`site/` 하위가 필지 보고서 1~10장·부록) |
| `components/three/` | 3D 뷰 (`ParcelMassView`, `MassView` 등) |
| `components/charts/` | 차트 4종 |
| `store/analysisStore.ts` | Zustand 저장소 |

## 4. 디자인 현재 상태

| 항목 | 현재 값 |
|---|---|
| 색상 토큰 | `app/globals.css`의 `@theme`: ink `#151717`, ink-soft `#5c6161`, ink-faint `#9a9f9f`, line `#ededed`, paper `#ffffff`, mist `#f6f6f4`, accent(주황) `#e0621b`, accent-soft `#fdf0e8`, existing(회색) `#8d9494` |
| 글꼴 | 제목 Noto Serif KR 500·700, 본문 Noto Sans KR 400·500·700 (한글 용량 때문에 preload 끔) |
| 모서리 | 카드 `--radius-card: 1.25rem` |
| 레이아웃 | 공통 헤더 + 분석 화면(단계별 섹션) + 보고서(A4 210×297mm 쪽) |
| 다크 모드 | 없음 (밝은 단일 테마) |
| UI 라이브러리 | 컴포넌트 라이브러리(shadcn, MUI 등) 없이 Tailwind 직접 작성 |
| 차트 | 4종(`components/charts`). Recharts는 `CashflowChart` 하나에서만 사용, 나머지는 직접 SVG |

## 5. 디자인 변경 시 영향 범위

- **한 곳에서 바뀌는 것:** 색상·글꼴·모서리 반경은 `app/globals.css` 토큰과 `app/layout.tsx` 글꼴 설정만 바꿔도 전체에 반영된다.
- **주의할 곳:**
  - 보고서는 A4 고정 높이(297mm) 쪽 나눔을 계산하므로 글꼴·여백·글자 크기를 바꾸면 쪽 넘김이 달라질 수 있다 (`ReportPage`, `SiteReportPages`, `lib/report/paginate.ts`).
  - 3D 뷰(`ParcelMassView`)의 색상은 CSS가 아니라 코드 상수(`COLORS`)다.
  - 보고서의 `print:` 클래스(`SiteHeader`, `ReportPage`, `ReportToolbar`)는 인쇄 레이아웃에 쓰이므로 화면 디자인을 바꿀 때 함께 확인한다.
