import { Canvas } from '@react-three/fiber'
import { Environment, Grid, OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'
import type { TubePoint } from '../types'

function TubeMesh({ points, radiusMm }: { points: TubePoint[]; radiusMm: number }) {
  const curve = useMemo(() => {
    if (points.length < 2) return null
    const vecs = points.map((p) => new THREE.Vector3(p.x, p.y, p.z))
    return new THREE.CatmullRomCurve3(vecs, false, 'centripetal', 0.35)
  }, [points])

  const tubular = Math.max(64, points.length * 32)
  const radial = 18

  if (!curve) return null

  return (
    <mesh castShadow receiveShadow>
      <tubeGeometry args={[curve, tubular, Math.max(0.5, radiusMm), radial, false]} />
      <meshStandardMaterial
        color="#9ca3af"
        metalness={0.9}
        roughness={0.28}
        envMapIntensity={1.1}
      />
    </mesh>
  )
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight
        castShadow
        position={[1200, 1800, 900]}
        intensity={1.25}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight position={[-800, 600, -400]} intensity={0.35} />
    </>
  )
}

export function TubeViewer3D({
  points,
  tubeDiameterMm,
}: {
  points: TubePoint[]
  tubeDiameterMm: number
}) {
  const r = Math.max(0.5, tubeDiameterMm / 2)

  return (
    <div className="tb-panel relative h-full min-h-[320px] overflow-hidden rounded-xl">
      <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-md border border-[var(--tb-border)] bg-black/50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--tb-muted)]">
        3D — Orbit • Metal • Schaduwen
      </div>
      <Canvas shadows dpr={[1, 2]} gl={{ antialias: true }}>
        <color attach="background" args={['#07080c']} />
        <PerspectiveCamera makeDefault position={[2200, 1400, 2200]} near={1} far={50000} />
        <OrbitControls makeDefault enableDamping dampingFactor={0.08} />
        <Lights />
        <Environment preset="city" />
        <Grid
          infiniteGrid
          fadeDistance={12000}
          sectionSize={200}
          cellSize={200}
          sectionColor="#334155"
          cellColor="#1f2937"
        />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
          <planeGeometry args={[20000, 20000]} />
          <shadowMaterial opacity={0.18} />
        </mesh>
        <TubeMesh points={points} radiusMm={r} />
      </Canvas>
    </div>
  )
}
