// 호스팅 전 검토용 정적 HTML 생성 (npm run export:review)
// 1) next build 로 만든 Tailwind CSS를 읽고  2) T1·T2 × 5개 시나리오를 runAll·buildSiteReport로 계산해
// 3) 실제 화면 컴포넌트를 HTML로 그린 뒤  4) out/review/index.html 하나로 묶는다 (CSS·스크립트 모두 파일 안에 포함).
// 결과 파일은 <html>/<head> 없이 내용만 담는다 (Artifact 게시 시 문서 틀이 붙는다).

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { it } from 'vitest'
import { judgeSite, runAll } from '@/lib/calc'
import { buildSiteReport } from '@/lib/report/buildSiteReport'
import { scenarios } from '@/lib/rules/scenarios'
import { getSiteData } from '@/lib/services/mockService'
import ReviewPage, { type ReviewParcel } from './ReviewPage'

const PARCELS = [
  { key: 't1', label: 'T1 당산동6가 104-10 (렉스빌)', pnu: '1156011600001040010' },
  { key: 't2', label: 'T2 당산동6가 110-19 (더 채움 하우스)', pnu: '1156011600001100019' },
]
const OUT = resolve('out/review/index.html')
const TITLE = '당산동6가 증축 검토본'

/** next build 결과에서 Tailwind CSS 파일을 찾는다 (글꼴 @font-face 파일은 제외) */
function readTailwindCss(): string {
  const dir = resolve('.next/static/chunks')
  const css = readdirSync(dir)
    .filter((f) => f.endsWith('.css'))
    .map((f) => readFileSync(resolve(dir, f), 'utf8'))
    .find((text) => text.includes('--color-accent') && !text.startsWith('@font-face'))
  if (!css) throw new Error('Tailwind CSS를 찾지 못했습니다. 먼저 next build 를 실행하세요.')
  return css
}

/** 필지 탭·시나리오 선택: 미리 그려 둔 블록 중 하나만 보이게 한다 (#t1 / #t2 링크 지원) */
const SCRIPT = `(function () {
  var state = { parcel: 't1', scenario: 'ALL' };
  var hash = location.hash.slice(1);
  if (document.querySelector('[data-parcel-tab="' + hash + '"]')) state.parcel = hash;
  function apply() {
    document.querySelectorAll('[data-block]').forEach(function (b) {
      var on = b.dataset.parcel === state.parcel && b.dataset.blockScenario === state.scenario;
      b.hidden = !on;
      b.querySelectorAll('[data-anchor]').forEach(function (s) {
        if (on) s.id = s.dataset.anchor; else s.removeAttribute('id');
      });
    });
    document.querySelectorAll('[data-parcel-tab]').forEach(function (t) {
      t.setAttribute('aria-pressed', String(t.dataset.parcelTab === state.parcel));
    });
    document.querySelectorAll('[data-scenario-tab]').forEach(function (t) {
      t.setAttribute('aria-pressed', String(t.dataset.scenarioTab === state.scenario));
    });
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-parcel-tab], [data-scenario-tab], [data-scenario]');
    if (!t) return;
    if (t.dataset.parcelTab) state.parcel = t.dataset.parcelTab;
    else state.scenario = t.dataset.scenarioTab || t.dataset.scenario;
    apply();
  });
  apply();
})();`

it('검토용 HTML 생성', async () => {
  const generatedAt = new Date().toLocaleDateString('sv-SE')
  const parcels: ReviewParcel[] = []
  for (const p of PARCELS) {
    const data = await getSiteData(p.pnu)
    if (!data) throw new Error(`기준 엑셀 필지가 아님: ${p.pnu}`)
    parcels.push({
      key: p.key,
      label: p.label,
      data,
      blocks: scenarios.map((s) => {
        const analysis = runAll(data, s.id)
        return { scenarioId: s.id, report: buildSiteReport(data, analysis, generatedAt), expandability: judgeSite(analysis) }
      }),
    })
  }

  const markup = renderToStaticMarkup(
    <ReviewPage
      parcels={parcels}
      scenarios={scenarios}
      defaultScenario="ALL"
      generatedAt={generatedAt}
      sourceLabel={parcels[0].data.sourceLabel}
    />,
  )

  const html = `<title>${TITLE}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&family=Noto+Serif+KR:wght@500;700&display=swap">
<style>
${readTailwindCss()}
/* 검토본: 보고서 종이 느낌을 유지하는 밝은 단일 테마. 글꼴은 Google Fonts (next/font 대체) */
:root { --font-noto-serif: 'Noto Serif KR'; --font-noto-sans: 'Noto Sans KR'; color-scheme: light; }
html, body { background: var(--color-paper); color: var(--color-ink); }
body { font-family: var(--font-sans); word-break: keep-all; }
:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) { * { transition: none !important; scroll-behavior: auto !important; } }
</style>
${markup}
<script>${SCRIPT}</script>
`
  mkdirSync(resolve('out/review'), { recursive: true })
  writeFileSync(OUT, html, 'utf8')
  console.log(`검토용 HTML → ${OUT} (${(html.length / 1024).toFixed(0)}KB)`)
})
