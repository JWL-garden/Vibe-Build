// 3D 매스 모델(GLB)에 이 필지가 있는지 — 모델 노드 이름이 있는 필지만 증축 후 모델이 불러와진다.
// 화면의 항목별 검토(증축층 면적·주차·일조)를 모델이 있을 때 통과로 표시하는 데 쓴다 (2026-10-13).
import massAreas from '@/lib/data/massAreas.json'

/** PNU 11번째 자리(대지/산 구분)는 출처마다 달라 제외하고 비교한다 (lib/geo/massModel.ts parcelKey와 같음) */
const key = (pnu: string) => pnu.slice(0, 10) + pnu.slice(11)

export function hasMassModel(pnu: string | null | undefined): boolean {
  if (!pnu) return false
  const k = key(pnu)
  return (massAreas.items as { pnu: string }[]).some((i) => key(i.pnu) === k)
}
