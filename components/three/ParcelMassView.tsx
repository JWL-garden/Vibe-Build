'use client'

// 필지 PNU 하나를 받아 GLB 매스 모델에서 그 필지만 골라 "증축 전 / 증축 후"로 보여주는 3D 뷰
//
// - 모델: public/models/261008_sunlight_test3.glb (노드 이름 규칙은 lib/geo/massModel.ts 참고)
// - 증축 전: 대상 필지 EXIST 층만 / 증축 후: EXIST + REV 층 (REV는 계산 엔진의 증축 층수만큼만 아래층부터 — addFloors)
// - 주변 필지는 기존 층(EXIST)만 흐리게 표시, 주변 필지 증축안(REV)은 숨김
// - GLB 좌표가 TM 절대좌표(약 191,000 / -548,000)라서 대상 필지 중심을 (0,0), 지면을 y=0 으로 옮긴다
//   (설계서 7-3 좌표 규칙: x=동, -z=북, y=높이)
// - 증축 전/후 두 뷰는 같은 카메라(북서쪽 위 45° 조감, 건물이 화면 가득 — lib/geo/cameraFit.ts)라 나란히 놓으면 바로 비교된다
// - 인쇄(PDF)용: 렌더가 끝나면 PNG 스냅샷을 만들어 인쇄 시 캔버스 대신 이미지로 출력한다

import { Suspense, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useThree } from '@react-three/fiber'
import { MASS_VIEW, fitCamera, type Vec3 } from '@/lib/geo/cameraFit'
import { OrbitControls, useGLTF } from '@react-three/drei'
import {
  isSameParcel,
  massRole,
  parseMassNodeName,
  visibleRevFloors,
  type MassRole,
  type MassViewMode,
} from '@/lib/geo/massModel'

export const DEFAULT_MASS_MODEL_URL = '/models/261008_sunlight_test3.glb'

// 색은 globals.css 의 --color-existing / --color-accent 와 맞춰 둔다
const COLORS = {
  targetExisting: '#a9a9a9',
  targetAddition: '#f07828',
  context: '#ffffff',
  edge: '#4a4a4a',
  contextEdge: '#b5b5b5',
  ground: '#efeee9',
}

type Status = 'loading' | 'ready' | 'missing'

interface Props {
  /** 대상 필지 PNU (앱의 건축물대장 PNU 그대로 넣으면 됨) */
  pnu: string
  mode: MassViewMode
  /** 계산 엔진의 증축 층수 (runAll) — 증축 후 뷰에서 모델의 증축층을 이만큼만 보여준다. null이면 모델 그대로 */
  addFloors?: number | null
  /** GLB 경로 (public/ 기준) */
  url?: string
  className?: string
  /** false면 회전·확대 잠금 (보고서용) */
  interactive?: boolean
  /** 이 필지가 모델에 없을 때 대신 보여줄 것 (예: BuildingIllustration) */
  fallback?: React.ReactNode
  /** 스냅샷(PNG dataURL)이 만들어지면 호출 — store 에 저장해 보고서에서 재사용할 때 */
  onSnapshot?: (dataUrl: string) => void
  /** 모델 정보 (대상 필지 증축층 수, 그중 표시한 층 수) — 캡션용 */
  onInfo?: (info: MassInfo) => void
}

export interface MassInfo {
  /** 모델에 들어 있는 대상 필지 증축층 수 */
  modelRevFloors: number
  /** 증축 후 뷰에 표시한 증축층 수 */
  shownRevFloors: number
}

export default function ParcelMassView({
  pnu,
  mode,
  addFloors = null,
  url = DEFAULT_MASS_MODEL_URL,
  className,
  interactive = true,
  fallback = null,
  onSnapshot,
  onInfo,
}: Props) {
  const [status, setStatus] = useState<Status>('loading')
  const [shot, setShot] = useState<string | null>(null)
  /** 화면에서 북쪽이 가리키는 각도 (도, 위 = 0, 시계 방향) — 방위 표시용 */
  const [northDeg, setNorthDeg] = useState<number | null>(null)

  if (status === 'missing' && fallback) return <>{fallback}</>

  return (
    <div className={`relative h-full w-full ${className ?? ''}`}>
      <div className={`h-full w-full ${shot ? 'print:hidden' : ''}`}>
        <Canvas
          frameloop="demand"
          dpr={[1, 2]}
          camera={{ fov: MASS_VIEW.fovDeg, near: 0.5, far: 5000 }}
          gl={{ preserveDrawingBuffer: true, antialias: true }}
        >
          <hemisphereLight args={['#ffffff', '#d9d6cf', 1.1]} />
          {/* 카메라(북서) 쪽에서 비추는 빛 — 보이는 북·서 면이 어둡지 않게 */}
          <directionalLight position={[-40, 80, -30]} intensity={1.6} />
          <Suspense fallback={null}>
            <MassModel
              url={url}
              pnu={pnu}
              mode={mode}
              addFloors={addFloors}
              interactive={interactive}
              onStatus={setStatus}
              onInfo={onInfo}
              onNorth={setNorthDeg}
              onSnapshot={(d) => {
                setShot(d)
                onSnapshot?.(d)
              }}
            />
          </Suspense>
        </Canvas>
      </div>

      {shot && (
        // 캔버스 스냅샷(data URL)이라 next/image 최적화 대상이 아님
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={shot}
          alt={mode === 'before' ? '증축 전 3D 매스' : '증축 후 3D 매스'}
          className="absolute inset-0 hidden h-full w-full object-contain print:block"
        />
      )}

      {status === 'ready' && northDeg !== null && (
        <div className="pointer-events-none absolute right-2 top-2 flex flex-col items-center text-[10px] font-medium text-ink-soft">
          <svg viewBox="0 0 20 20" className="h-5 w-5" style={{ transform: `rotate(${northDeg}deg)` }} aria-hidden>
            <path d="M10 1 L15 17 L10 13 L5 17 Z" fill="currentColor" />
          </svg>
          N
        </div>
      )}

      {status !== 'ready' && (
        <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-ink-faint">
          {status === 'loading' ? '3D 모델 불러오는 중…' : '이 필지의 3D 모델이 없습니다'}
        </p>
      )}
    </div>
  )
}

/* ───────────────────────── 모델 조립 ───────────────────────── */

interface Built {
  group: THREE.Group
  /** 대상 필지 매스(기존+증축) 크기 — 전/후 뷰가 같은 화면 비율이 되도록 둘 다 이 값으로 카메라를 잡는다 */
  size: THREE.Vector3
  found: boolean
  info: MassInfo
  dispose: () => void
}

function buildMass(source: THREE.Object3D, pnu: string, mode: MassViewMode, addFloors: number | null): Built {
  source.updateMatrixWorld(true)

  // 0) 대상 필지 증축층(REV) 목록 → 계산 엔진의 증축 층수만큼만 표시
  const revFloors: number[] = []
  source.traverse((obj) => {
    const info = parseMassNodeName(obj.name)
    if (info && info.kind === 'REV' && isSameParcel(info.pnu, pnu)) revFloors.push(info.floor)
  })
  const shownRev = visibleRevFloors(revFloors, addFloors)

  // 1) 이름 규칙에 맞는 노드를 찾아 역할을 정하고, 그 아래 Mesh 를 모은다
  //    (GLTFLoader 는 primitive 가 여러 개인 노드를 Group + 자식 Mesh 로 만든다)
  // inFrame: 카메라 범위에 넣을 메시 = 대상 필지 기존층 + 표시할 증축층 (증축 전·후 뷰 모두 같은 범위 → 화면 비율 동일)
  const picked: { mesh: THREE.Mesh; role: MassRole; inFrame: boolean }[] = []
  source.traverse((obj) => {
    const info = parseMassNodeName(obj.name)
    if (!info) return
    const role = massRole(info, pnu, mode, shownRev)
    const inFrame = isSameParcel(info.pnu, pnu) && (info.kind === 'EXIST' || shownRev.has(info.floor))
    obj.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) picked.push({ mesh: child as THREE.Mesh, role, inFrame })
    })
  })

  // 2) 대상 필지 범위 (증축 전 뷰에서도 표시할 증축층까지 포함 → 전/후 화면 크기 동일)
  const box = new THREE.Box3()
  for (const p of picked) {
    if (!p.inFrame) continue
    p.mesh.geometry.computeBoundingBox()
    box.union(p.mesh.geometry.boundingBox!.clone().applyMatrix4(p.mesh.matrixWorld))
  }
  const found = !box.isEmpty()
  const center = found ? box.getCenter(new THREE.Vector3()) : new THREE.Vector3()
  // 대상 필지 중심 → (0,0), 대상 건물 바닥 → y=0
  const shift = new THREE.Matrix4().makeTranslation(-center.x, found ? -box.min.y : 0, -center.z)

  // 3) 지오메트리를 복제해 원점 근처로 옮긴다 (절대좌표 그대로 두면 GPU float 정밀도 때문에 떨림·깨짐이 생김)
  const materials = {
    targetExisting: new THREE.MeshStandardMaterial({ color: COLORS.targetExisting, roughness: 0.9 }),
    targetAddition: new THREE.MeshStandardMaterial({ color: COLORS.targetAddition, roughness: 0.7 }),
    context: new THREE.MeshStandardMaterial({ color: COLORS.context, roughness: 1, transparent: true, opacity: 0.6 }),
  }
  const edgeMat = new THREE.LineBasicMaterial({ color: COLORS.edge })
  const contextEdgeMat = new THREE.LineBasicMaterial({ color: COLORS.contextEdge })

  const group = new THREE.Group()
  const geometries: THREE.BufferGeometry[] = []
  for (const { mesh, role } of picked) {
    if (role === 'hidden') continue
    const geom = mesh.geometry.clone()
    geom.applyMatrix4(mesh.matrixWorld)
    geom.applyMatrix4(shift)
    const edges = new THREE.EdgesGeometry(geom, 20)
    geometries.push(geom, edges)
    group.add(new THREE.Mesh(geom, materials[role]))
    group.add(new THREE.LineSegments(edges, role === 'context' ? contextEdgeMat : edgeMat))
  }

  return {
    group,
    size: found ? box.getSize(new THREE.Vector3()) : new THREE.Vector3(10, 10, 10),
    found,
    info: { modelRevFloors: new Set(revFloors).size, shownRevFloors: shownRev.size },
    dispose: () => {
      geometries.forEach((g) => g.dispose())
      Object.values(materials).forEach((m) => m.dispose())
      edgeMat.dispose()
      contextEdgeMat.dispose()
    },
  }
}

function MassModel({
  url,
  pnu,
  mode,
  addFloors,
  interactive,
  onStatus,
  onInfo,
  onNorth,
  onSnapshot,
}: {
  url: string
  pnu: string
  mode: MassViewMode
  addFloors: number | null
  interactive: boolean
  onStatus: (s: Status) => void
  onInfo?: (info: MassInfo) => void
  onNorth: (deg: number) => void
  onSnapshot: (dataUrl: string) => void
}) {
  const { scene: source } = useGLTF(url)
  const { camera, gl, scene, invalidate, size } = useThree()
  const built = useMemo(() => buildMass(source, pnu, mode, addFloors), [source, pnu, mode, addFloors])
  useEffect(() => () => built.dispose(), [built])

  // 북서쪽 위 45° 조감 — 대상 건물(기존층 + 표시 증축층) 상자가 화면 비율에 맞게 가득 차도록 (lib/geo/cameraFit.ts)
  // 대상 건물은 buildMass에서 중심 (0,0)·바닥 y=0으로 옮겨져 있다
  const aspect = size.width / Math.max(size.height, 1)
  const { position, target, groundRadius } = useMemo(() => {
    const s = built.size
    const fit = fitCamera([-s.x / 2, 0, -s.z / 2] as Vec3, [s.x / 2, s.y, s.z / 2] as Vec3, aspect)
    return {
      position: new THREE.Vector3(...fit.position),
      target: new THREE.Vector3(...fit.target),
      groundRadius: Math.max(s.x, s.z) * 3,
    }
  }, [built, aspect])

  /** 화면에서 북쪽(-z)이 가리키는 각도 → 방위 표시 */
  const updateNorth = () => {
    const a = target.clone().project(camera)
    const b = target.clone().add(new THREE.Vector3(0, 0, -1)).project(camera)
    onNorth(THREE.MathUtils.radToDeg(Math.atan2(b.x - a.x, (b.y - a.y) / Math.max(aspect, 1e-6))))
  }

  useLayoutEffect(() => {
    camera.position.copy(position)
    camera.lookAt(target)
    camera.updateProjectionMatrix()
    camera.updateMatrixWorld()
    updateNorth()
    invalidate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, position, target, invalidate])

  // 상태 알림 + 인쇄용 스냅샷 (카메라 세팅 후 한 번 직접 렌더해서 캡처)
  useEffect(() => {
    onStatus(built.found ? 'ready' : 'missing')
    onInfo?.(built.info)
    if (!built.found) return
    gl.render(scene, camera)
    onSnapshot(gl.domElement.toDataURL('image/png'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [built, gl, scene, camera])

  return (
    <>
      <primitive object={built.group} />

      {/* 지면 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <circleGeometry args={[groundRadius, 64]} />
        <meshStandardMaterial color={COLORS.ground} roughness={1} />
      </mesh>

      {/* 방위는 화면 오른쪽 위 N 표시 (카메라를 돌리면 함께 돈다) */}
      <OrbitControls
        target={target}
        enabled={interactive}
        enableDamping={false}
        maxPolarAngle={Math.PI / 2 - 0.05}
        onChange={updateNorth}
      />
    </>
  )
}

useGLTF.preload(DEFAULT_MASS_MODEL_URL)
