import { useRef, useMemo, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, RoundedBox, Environment } from '@react-three/drei'
import * as THREE from 'three'

/**
 * iPhone 3D Model component
 * A stylized iPhone that floats and rotates
 */
function IPhoneModel({ position }: { position: [number, number, number] }) {
    const meshRef = useRef<THREE.Group>(null)
    const timeRef = useRef(Math.random() * 100)

    // Random movement parameters
    const moveParams = useMemo(() => ({
        speedX: 0.3 + Math.random() * 0.2,
        speedY: 0.2 + Math.random() * 0.15,
        rangeX: 2 + Math.random() * 1,
        rangeY: 1.5 + Math.random() * 0.5,
        offsetX: Math.random() * Math.PI * 2,
        offsetY: Math.random() * Math.PI * 2,
    }), [])

    useFrame((state) => {
        if (!meshRef.current) return

        const time = state.clock.elapsedTime + timeRef.current

        // Smooth random movement using sine waves
        meshRef.current.position.x = position[0] + Math.sin(time * moveParams.speedX + moveParams.offsetX) * moveParams.rangeX
        meshRef.current.position.y = position[1] + Math.sin(time * moveParams.speedY + moveParams.offsetY) * moveParams.rangeY

        // Subtle rotation
        meshRef.current.rotation.y = Math.sin(time * 0.5) * 0.3
        meshRef.current.rotation.x = Math.sin(time * 0.3) * 0.1
        meshRef.current.rotation.z = Math.sin(time * 0.4) * 0.05
    })

    return (
        <group ref={meshRef} position={position}>
            <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
                {/* iPhone Body */}
                <RoundedBox args={[1.2, 2.4, 0.15]} radius={0.15} smoothness={4}>
                    <meshPhysicalMaterial
                        color="#1a1a2e"
                        metalness={0.9}
                        roughness={0.1}
                        clearcoat={1}
                        clearcoatRoughness={0.1}
                    />
                </RoundedBox>

                {/* Screen */}
                <RoundedBox args={[1.05, 2.2, 0.01]} radius={0.12} smoothness={4} position={[0, 0, 0.08]}>
                    <meshPhysicalMaterial
                        color="#0f0f1a"
                        metalness={0.1}
                        roughness={0.3}
                        emissive="#1a1a3e"
                        emissiveIntensity={0.3}
                    />
                </RoundedBox>

                {/* Camera Island */}
                <RoundedBox args={[0.35, 0.35, 0.05]} radius={0.05} smoothness={4} position={[-0.3, 0.9, 0.1]}>
                    <meshPhysicalMaterial
                        color="#2a2a3e"
                        metalness={0.8}
                        roughness={0.2}
                    />
                </RoundedBox>

                {/* Camera Lenses */}
                <mesh position={[-0.38, 0.98, 0.13]}>
                    <circleGeometry args={[0.06, 32]} />
                    <meshPhysicalMaterial
                        color="#1a1a2e"
                        metalness={0.9}
                        roughness={0.1}
                    />
                </mesh>
                <mesh position={[-0.22, 0.98, 0.13]}>
                    <circleGeometry args={[0.06, 32]} />
                    <meshPhysicalMaterial
                        color="#1a1a2e"
                        metalness={0.9}
                        roughness={0.1}
                    />
                </mesh>
                <mesh position={[-0.3, 0.82, 0.13]}>
                    <circleGeometry args={[0.06, 32]} />
                    <meshPhysicalMaterial
                        color="#1a1a2e"
                        metalness={0.9}
                        roughness={0.1}
                    />
                </mesh>

                {/* Side Button */}
                <RoundedBox args={[0.03, 0.25, 0.08]} radius={0.01} smoothness={2} position={[0.615, 0.3, 0]}>
                    <meshPhysicalMaterial
                        color="#3a3a4e"
                        metalness={0.8}
                        roughness={0.2}
                    />
                </RoundedBox>
            </Float>
        </group>
    )
}

/**
 * Main Scene Component
 */
export default function IPhoneScene() {
    // Positions for multiple iPhones (avoiding center where hero card is)
    const positions: [number, number, number][] = [
        [-5, 2, -2],   // Top left
        [5, 1, -3],    // Right side
        [-4, -2, -4],  // Bottom left
    ]

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 1,
        }}>
            <Canvas
                camera={{ position: [0, 0, 8], fov: 50 }}
                dpr={[1, 2]}
                gl={{ antialias: true, alpha: true }}
                style={{ background: 'transparent' }}
            >
                <Suspense fallback={null}>
                    {/* Lighting */}
                    <ambientLight intensity={0.4} />
                    <directionalLight position={[5, 5, 5]} intensity={1} />
                    <pointLight position={[-5, 5, 5]} intensity={0.5} color="#6366f1" />
                    <pointLight position={[5, -5, 5]} intensity={0.3} color="#4f46e5" />

                    {/* Environment for reflections */}
                    <Environment preset="city" />

                    {/* iPhones */}
                    {positions.map((pos, i) => (
                        <IPhoneModel key={i} position={pos} />
                    ))}
                </Suspense>
            </Canvas>
        </div>
    )
}
