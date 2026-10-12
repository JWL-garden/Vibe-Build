import MassView from '@/components/three/MassView'
import { CHECK_LABEL, CHECK_STATUS_LABEL, LIMIT_LABEL } from '@/lib/calc'
import { formatNumber } from '@/lib/format'
import type { ExpansionCheck, SiteReport } from '@/types'
import { Badge, DataTable, Lead, StatCard, SubTitle } from '../ReportParts'

const TONE: Record<ExpansionCheck['status'], 'accent' | 'danger' | 'neutral'> = {
  pass: 'accent',
  fail: 'danger',
  check: 'neutral',
}

const UNIT_TYPE = { S: '소형 (전용 30㎡ 이하)', M: '중형 (60㎡ 이하)', L: '대형 (60㎡ 초과)' } as const

/** 3장: 증축 계획안 — 증축 면적은 expansion.addGfaM2(주차 기준) 그대로. 증축안이 없으면 대안 검토 */
export default function SiteCh03Plan({ report }: { report: SiteReport }) {
  const { plan, summary, analysis } = report
  const f = (v: number) => formatNumber(v, 2)

  if (plan.kind === 'rebuild' && plan.rebuild) {
    const r = plan.rebuild
    const diff = r.gfaM2 - r.existing.gfaM2
    return (
      <div>
        <Lead>
          기존 건물을 철거하고 복합 완화(ALL) 규칙으로 같은 대지에 새로 지었을 때의 최대 규모입니다. 신축 연면적은 용적률
          한도, 주택 층수 한도(최대 건축면적 × 층수), 주택 연면적 한도 중 가장 작은 값입니다
          {r.rules.rebuild.pilotiFloor1 ? ' (1층 필로티 주차 + 2층부터 주택 가정)' : ''}.
        </Lead>

        <div className="mt-6 grid grid-cols-2 gap-4">
          {[false, true].map((after) => (
            <div key={String(after)} className="rounded-card bg-mist px-6 pb-4 pt-6">
              <MassView
                pnu={analysis.pnu}
                mode={after ? 'after' : 'before'}
                floorsAbove={summary.floorsAbove}
                addFloors={summary.addFloors}
                rebuildFloors={r.verdict === 'impossible' ? 0 : r.totalFloors}
                interactive={false}
                className="h-36"
              />
              <p className="mt-2 text-center text-xs text-ink-faint">
                {after ? `재건축 후 (지상 ${r.totalFloors}층)` : `현재 (지상 ${r.existing.floorsAbove}층)`}
              </p>
            </div>
          ))}
        </div>

        <SubTitle>{plan.heading}</SubTitle>
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            label="신축 연면적"
            value={`${f(r.gfaM2)}㎡`}
            caption={`기존 대비 ${diff >= 0 ? '+' : '−'}${f(Math.abs(diff))}㎡ · 제한요인: ${LIMIT_LABEL[r.limitingFactor]}`}
          />
          <StatCard
            label="층수"
            value={`지상 ${r.totalFloors}층`}
            caption={`주택 ${r.housingFloors}개층${r.rules.rebuild.pilotiFloor1 ? ' + 1층 필로티' : ''}`}
          />
          <StatCard label="세대" value={`${r.households}세대`} caption={`세대당 전용 ${f(r.netPerUnitM2)}㎡ (기존 ${r.existing.households}세대)`} />
          <StatCard label="높이" value={`${f(r.heightM)}m`} caption={`층고 ${f(r.rules.floorHeightM)}m 가정`} />
          <StatCard label="용적률" value={`${f(r.farPercent)}%`} caption={`상한 ${f(r.farLimitPercent)}% · 건폐율 ${f(r.bcrLimitPercent)}%`} />
          <StatCard label="법정 주차" value={`${f(r.parking.required)}대`} caption={`현재 ${f(r.parking.currentActual)}대 · 확보 확인 필요`} />
        </div>

        <SubTitle>산정 근거</SubTitle>
        <ul className="list-disc space-y-1 pl-5 text-sm text-ink-soft">
          {r.reasons.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>

        <SubTitle>검토 항목</SubTitle>
        <Checks checks={r.checks} />
      </div>
    )
  }

  if (!plan.plan) {
    const e = analysis.selected
    return (
      <div>
        <Lead>
          {analysis.scenarioId} 시나리오 기준으로 신규 층 증축안을 만들 수 없습니다. 제한요인은{' '}
          <b className="text-ink">{LIMIT_LABEL[e.plan.limitingFactor]}</b>입니다.
        </Lead>
        <SubTitle>{plan.heading}</SubTitle>
        <ul className="space-y-2 text-sm text-ink">
          {plan.alternatives.map((a) => (
            <li key={a} className="flex gap-2">
              <span className="text-accent">→</span>
              {a}
            </li>
          ))}
        </ul>
        <SubTitle>검토 항목</SubTitle>
        <Checks checks={e.plan.checks} />
      </div>
    )
  }

  const p = plan.plan
  return (
    <div>
      <Lead>
        {plan.kind === 'parkingOption'
          ? `기존 주차로는 증축할 수 없어, 주차 ${plan.addSpaces}대를 추가로 확보하는 조건으로 만든 증축안입니다.`
          : '기존 주차 여유 범위에서 만든 증축안입니다.'}{' '}
        증축 연면적은 주차 여유로 설치할 수 있는 최대 연면적을 용적률·주택 한도·일조로 줄인 값입니다.
      </Lead>

      <div className="mt-6 grid grid-cols-2 gap-4">
        {[false, true].map((after) => (
          <div key={String(after)} className="rounded-card bg-mist px-6 pb-4 pt-6">
            <MassView
              pnu={analysis.pnu}
              mode={after ? 'after' : 'before'}
              floorsAbove={summary.floorsAbove}
              addFloors={p.addFloors}
              sideAreaM2={p.sideGfaM2}
              interactive={false}
              className="h-36"
            />
            <p className="mt-2 text-center text-xs text-ink-faint">{after ? '증축 후' : '증축 전'}</p>
          </div>
        ))}
      </div>

      <SubTitle>{plan.heading}</SubTitle>
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="증축 연면적" value={`${f(p.addGfaM2)}㎡`} caption={`전용 ${f(p.addNetM2)}㎡`} />
        <StatCard label="증축 층수" value={`+${p.addFloors}개층`} caption={`증축 후 지상 ${p.newTotalFloors}층`} />
        <StatCard label="추가 세대" value={`${p.addUnits.length}세대`} caption={`제한요인: ${LIMIT_LABEL[p.limitingFactor]}`} />
        <StatCard
          label="증축 후 높이"
          value={p.newHeightM === null ? '정보 없음' : `${f(p.newHeightM)}m`}
          caption={`층고 ${f(analysis.selected.rules.floorHeightM)}m 가정`}
        />
        <StatCard
          label="증축 후 용적률"
          value={`${f(p.newFarPercent)}%`}
          caption={`상한 ${f(analysis.selected.far.farLimitPercent)}%`}
        />
        <StatCard
          label="주차"
          value={plan.addSpaces ? `+${plan.addSpaces}대 확보` : '기존 주차'}
          caption={plan.addSpaces ? '대지 내 배치 확인 필요' : null}
        />
      </div>

      <SubTitle>추가 세대 구성</SubTitle>
      <DataTable
        head={['세대', '유형', '전용면적', '필요 주차']}
        numeric={[2, 3]}
        rows={p.addUnits.map((u, i) => [`${i + 1}`, UNIT_TYPE[u.type], `${f(u.netAreaM2)}㎡`, `${f(u.spaces)}대`])}
      />

      <SubTitle>검토 항목</SubTitle>
      <Checks checks={p.checks} />
    </div>
  )
}

function Checks({ checks }: { checks: ExpansionCheck[] }) {
  return (
    <ul className="space-y-1.5 text-sm break-inside-avoid">
      {checks.map((c) => (
        <li key={c.item} className="flex items-start gap-3">
          <span className="w-20 shrink-0">
            <Badge tone={TONE[c.status]}>{CHECK_STATUS_LABEL[c.status]}</Badge>
          </span>
          <span className="w-24 shrink-0 font-medium text-ink">{CHECK_LABEL[c.item]}</span>
          <span className="text-ink-soft">{c.detail}</span>
        </li>
      ))}
    </ul>
  )
}
