import Image from 'next/image'
import BuildingIllustration from '@/components/layout/BuildingIllustration'
import MassView from '@/components/three/MassView'
import type { Kpi } from '@/types'

interface Props {
  title: string
  /** 표지에 표시할 주소 */
  address: string
  /** 작성일 (YYYY-MM-DD) */
  createdAt: string
  author: string
  /** 적용 법규 시나리오 이름 (없으면 null) */
  scenarioName: string | null
  /** 현재 지상 층수 (일러스트용) */
  floorsAbove: number
  /** 증축 층수 (모르면 null → 일러스트에 '?' 표시) */
  addFloors: number | null
  /** 핵심 숫자 4개 (계산 전이면 null → '산정 예정') */
  kpis: Kpi[] | null
  /** 한 문장 결론 (계산 전이면 null) */
  conclusion: string | null
  /** 추천 다음 단계 한 줄 (없으면 null) */
  nextStep: string | null
  /** 3D 매스 모델(GLB)에서 찾을 필지 PNU — 없으면 일러스트 */
  massPnu?: string | null
  /** false면 GLB 대신 일러스트 */
  massUseModel?: boolean
  /** 재건축 시나리오: 계산 엔진의 신축 지상 층수 (0 = 신축 불가). 재건축이 아니면 생략 */
  massRebuildFloors?: number | null
  /** 증축 연면적에 포함된 측면 보강부 면적 (㎡, 계산 엔진). 0이면 3D에서 숨김, 생략하면 모델 그대로 */
  massSideAreaM2?: number
}

const PENDING_KPIS = ['증축 규모', '총사업비', 'ROI', '투자회수기간']

/** 0장: 표지 + 한 장 요약 (값은 모두 props로 받고 계산하지 않음)
 * 3D 전/후: massPnu가 있으면 GLB 매스(인쇄 시 스냅샷 이미지), 없으면 일러스트 */
export default function Ch00Summary(p: Props) {
  return (
    <div className="flex h-full flex-col">
      <p className="mt-4 flex items-center gap-2 font-serif text-lg font-bold text-ink">
        <Image src="/logo.png" alt="" width={115} height={96} className="h-[22px] w-auto" />
        Vibe Build
      </p>

      <div className="mt-16">
        <p className="text-sm font-medium text-ink-soft">건축주 제출용 검토 보고서</p>
        <h1 className="mt-3 font-serif text-4xl font-bold leading-tight text-ink">{p.title}</h1>
        <p className="mt-4 text-ink-soft">{p.address}</p>
        {p.scenarioName && <p className="mt-1 text-sm text-ink-faint">적용 시나리오: {p.scenarioName}</p>}
      </div>

      <div className="mt-10 grid grid-cols-2 gap-4">
        {[
          { label: '증축 전', addition: false },
          { label: p.massRebuildFloors != null ? '재건축 후' : '증축 후', addition: true },
        ].map((v) => (
          <div key={v.label} className="rounded-card bg-mist px-6 pb-4 pt-6">
            {p.massPnu ? (
              <MassView
                pnu={p.massPnu}
                mode={v.addition ? 'after' : 'before'}
                floorsAbove={p.floorsAbove}
                addFloors={p.addFloors}
                rebuildFloors={p.massRebuildFloors ?? null}
                sideAreaM2={p.massSideAreaM2}
                useModel={p.massUseModel}
                interactive={false}
                className="h-40"
              />
            ) : (
              <BuildingIllustration
                floors={p.floorsAbove}
                addFloors={p.addFloors}
                showAddition={v.addition}
                className="h-40 w-full"
              />
            )}
            <p className="mt-2 text-center text-xs text-ink-faint">{v.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-4 divide-x divide-line rounded-card border border-line">
        {(p.kpis ?? PENDING_KPIS.map((label) => ({ label, value: '산정 예정', caption: null }))).map((k) => (
          <div key={k.label} className="px-4 py-5">
            <p className="text-xs text-ink-faint">{k.label}</p>
            <p className={`mt-2 font-serif text-xl font-bold ${p.kpis ? 'text-ink' : 'text-ink-faint'}`}>{k.value}</p>
            {k.caption && <p className="mt-1 text-xs text-ink-soft">{k.caption}</p>}
          </div>
        ))}
      </div>

      <p className="mt-6 rounded-card bg-mist px-5 py-4 text-sm leading-relaxed text-ink">
        {p.conclusion ?? '결론 문장은 계산 엔진(규모·수익성) 연결 후 자동으로 작성됩니다.'}
      </p>
      {p.nextStep && (
        <p className="mt-3 px-1 text-sm text-ink-soft">
          <b className="text-ink">추천 다음 단계</b> · {p.nextStep}
        </p>
      )}

      <dl className="mt-auto grid grid-cols-[6rem_1fr] gap-y-2 pt-10 text-sm">
        <dt className="text-ink-faint">작성일</dt>
        <dd className="text-ink">{p.createdAt}</dd>
        <dt className="text-ink-faint">작성</dt>
        <dd className="text-ink">{p.author}</dd>
      </dl>
    </div>
  )
}
