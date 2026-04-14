/**
 * Zagel 3D Avatar - Animated dove/bird using Three.js + React Three Fiber
 */

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Sphere, MeshDistortMaterial, Stars, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";

type AvatarMood = "idle" | "talking" | "happy" | "dance" | "gentle" | "focus" | "excited";

interface ZagelAvatarProps {
  mood?: AvatarMood;
  moodColor?: string;
  isListening?: boolean;
  isTalking?: boolean;
  size?: number;
}

// Inner bird body
function DoveBody({ mood, moodColor, isListening, isTalking }: {
  mood: AvatarMood;
  moodColor: string;
  isListening: boolean;
  isTalking: boolean;
}) {
  const bodyRef = useRef<THREE.Mesh>(null);
  const wingLRef = useRef<THREE.Mesh>(null);
  const wingRRef = useRef<THREE.Mesh>(null);
  const beakRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const t = useRef(0);

  const color = useMemo(() => new THREE.Color(moodColor), [moodColor]);

  useFrame((_, delta) => {
    t.current += delta;

    if (!bodyRef.current) return;

    // Breathing animation
    const breathScale = 1 + Math.sin(t.current * 1.8) * 0.04;
    bodyRef.current.scale.y = breathScale;

    // Talking animation (beak)
    if (beakRef.current) {
      if (isTalking) {
        beakRef.current.scale.y = 0.5 + Math.abs(Math.sin(t.current * 12)) * 0.8;
      } else {
        beakRef.current.scale.y = 1;
      }
    }

    // Wing animation
    if (wingLRef.current && wingRRef.current) {
      let wingAmp = 0.15;
      let wingFreq = 1.5;

      if (mood === "excited" || mood === "dance") {
        wingAmp = 0.5;
        wingFreq = 4;
      } else if (mood === "happy") {
        wingAmp = 0.3;
        wingFreq = 2.5;
      } else if (isTalking) {
        wingAmp = 0.2;
        wingFreq = 2;
      } else if (isListening) {
        wingAmp = 0.1;
        wingFreq = 1;
      }

      const wingAngle = Math.sin(t.current * wingFreq) * wingAmp;
      wingLRef.current.rotation.z = Math.PI / 4 + wingAngle;
      wingRRef.current.rotation.z = -(Math.PI / 4 + wingAngle);
    }

    // Body tilt for mood
    if (mood === "dance") {
      bodyRef.current.rotation.z = Math.sin(t.current * 3) * 0.25;
    } else if (mood === "happy") {
      bodyRef.current.rotation.z = Math.sin(t.current * 2) * 0.1;
    } else {
      bodyRef.current.rotation.z *= 0.9;
    }

    // Glow pulse
    if (glowRef.current) {
      const glowMat = glowRef.current.material as THREE.MeshStandardMaterial;
      glowMat.emissiveIntensity =
        0.3 + Math.sin(t.current * 2) * 0.2 + (isListening ? 0.5 : 0);
    }
  });

  return (
    <group>
      {/* Outer glow sphere */}
      <Sphere ref={glowRef} args={[1.4, 32, 32]}>
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.3}
          transparent
          opacity={0.08}
        />
      </Sphere>

      {/* Main body */}
      <Sphere ref={bodyRef} args={[1, 32, 32]} castShadow>
        <MeshDistortMaterial
          color="#f0f4ff"
          emissive="#c8d8ff"
          emissiveIntensity={0.2}
          distort={0.15}
          speed={2}
          roughness={0.1}
          metalness={0.1}
        />
      </Sphere>

      {/* Head */}
      <Sphere args={[0.55, 32, 32]} position={[0, 1.1, 0.1]}>
        <MeshDistortMaterial
          color="#f0f4ff"
          emissive="#c8d8ff"
          emissiveIntensity={0.2}
          distort={0.1}
          speed={2}
          roughness={0.1}
        />
      </Sphere>

      {/* Left eye */}
      <Sphere args={[0.1, 16, 16]} position={[-0.2, 1.2, 0.5]}>
        <meshStandardMaterial color="#1a1a3e" />
      </Sphere>
      {/* Left eye shine */}
      <Sphere args={[0.04, 8, 8]} position={[-0.17, 1.23, 0.58]}>
        <meshStandardMaterial color="white" />
      </Sphere>

      {/* Right eye */}
      <Sphere args={[0.1, 16, 16]} position={[0.2, 1.2, 0.5]}>
        <meshStandardMaterial color="#1a1a3e" />
      </Sphere>
      {/* Right eye shine */}
      <Sphere args={[0.04, 8, 8]} position={[0.23, 1.23, 0.58]}>
        <meshStandardMaterial color="white" />
      </Sphere>

      {/* Beak */}
      <mesh ref={beakRef} position={[0, 1.05, 0.65]}>
        <coneGeometry args={[0.1, 0.28, 3]} />
        <meshStandardMaterial color="#f9c94e" />
      </mesh>

      {/* Left wing */}
      <mesh
        ref={wingLRef}
        position={[-1.1, 0.1, -0.2]}
        rotation={[0, -0.3, Math.PI / 4]}
        scale={[1, 0.5, 1]}
      >
        <circleGeometry args={[0.7, 32]} />
        <meshStandardMaterial
          color="#e8eeff"
          side={THREE.DoubleSide}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Right wing */}
      <mesh
        ref={wingRRef}
        position={[1.1, 0.1, -0.2]}
        rotation={[0, 0.3, -(Math.PI / 4)]}
        scale={[1, 0.5, 1]}
      >
        <circleGeometry args={[0.7, 32]} />
        <meshStandardMaterial
          color="#e8eeff"
          side={THREE.DoubleSide}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Tail feathers */}
      <mesh position={[0, -0.85, -0.7]} rotation={[0.4, 0, 0]} scale={[1, 0.5, 1]}>
        <circleGeometry args={[0.5, 16]} />
        <meshStandardMaterial
          color="#d8e4ff"
          side={THREE.DoubleSide}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* Energy particles */}
      {(isListening || isTalking) && (
        <>
          {[...Array(6)].map((_, i) => (
            <EnergyParticle
              key={i}
              index={i}
              color={moodColor}
              active={isListening || isTalking}
            />
          ))}
        </>
      )}
    </group>
  );
}

function EnergyParticle({ index, color, active }: { index: number; color: string; active: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  const t = useRef(Math.random() * Math.PI * 2);
  const radius = 1.6 + Math.random() * 0.5;
  const speed = 0.5 + Math.random() * 1.5;

  useFrame((_, delta) => {
    if (!ref.current || !active) return;
    t.current += delta * speed;
    const angle = t.current + (index / 6) * Math.PI * 2;
    ref.current.position.x = Math.cos(angle) * radius;
    ref.current.position.y = Math.sin(angle * 0.7) * 0.6;
    ref.current.position.z = Math.sin(angle) * radius * 0.5;

    const s = 0.5 + Math.sin(t.current * 3) * 0.3;
    ref.current.scale.setScalar(s * 0.08);
  });

  return (
    <Sphere ref={ref} args={[1, 8, 8]}>
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={2}
        transparent
        opacity={0.8}
      />
    </Sphere>
  );
}

function AvatarScene({ mood, moodColor, isListening, isTalking }: {
  mood: AvatarMood;
  moodColor: string;
  isListening: boolean;
  isTalking: boolean;
}) {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 7]} fov={50} />
      <ambientLight intensity={0.6} />
      <pointLight position={[5, 5, 5]} intensity={1.5} color="#ffffff" />
      <pointLight position={[-5, -3, -2]} intensity={0.5} color={moodColor} />
      <spotLight
        position={[0, 6, 4]}
        angle={0.4}
        penumbra={0.5}
        intensity={1.2}
        color="#d0e8ff"
        castShadow
      />

      <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />

      <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.8}>
        <DoveBody
          mood={mood}
          moodColor={moodColor}
          isListening={isListening}
          isTalking={isTalking}
        />
      </Float>
    </>
  );
}

export default function ZagelAvatar({
  mood = "idle",
  moodColor = "#7c9cbf",
  isListening = false,
  isTalking = false,
  size = 280,
}: ZagelAvatarProps) {
  return (
    <div
      style={{ width: size, height: size }}
      className="relative rounded-full overflow-hidden"
    >
      <Canvas shadows gl={{ antialias: true, alpha: true }}>
        <AvatarScene
          mood={mood}
          moodColor={moodColor}
          isListening={isListening}
          isTalking={isTalking}
        />
      </Canvas>
    </div>
  );
}
