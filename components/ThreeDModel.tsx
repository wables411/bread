"use client";

import React, { Suspense, useState } from "react";
import dynamic from "next/dynamic";
import { OrbitControls, useGLTF, Center, DragControls } from "@react-three/drei";

// Dynamic import Canvas to avoid SSR with three.js
const Canvas = dynamic(
  () => import("@react-three/fiber").then((m) => m.Canvas),
  { ssr: false }
);

interface ModelProps {
  url: string;
}

interface ModelWithDragProps extends ModelProps {
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

/** Renders a single GLB model, centered and grabbable for easy repositioning */
function Model({ url, onDragStart, onDragEnd }: ModelWithDragProps) {
  const { scene } = useGLTF(url);
  const clone = React.useMemo(() => scene.clone(), [scene]);
  return (
    <Center>
      <DragControls onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <primitive object={clone} scale={1.5} />
      </DragControls>
    </Center>
  );
}

interface ThreeDModelProps {
  modelPath: string;
  className?: string;
}

/** Core 3D viewer: Canvas + model + controls. Optimized for fast load and mobile. */
function ThreeDModelInner({ modelPath, className = "" }: ThreeDModelProps) {
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div className={`w-full h-full min-h-0 ${className}`}>
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-full min-h-[200px] text-gray-500 text-sm">
            Loading 3D model...
          </div>
        }
      >
        <Canvas
          dpr={[1, 2]}
          shadows={false}
          gl={{ antialias: true, alpha: true }}
          camera={{ position: [0, 0, 2.5], fov: 45 }}
          frameloop="always"
          style={{ cursor: isDragging ? "grabbing" : "grab" }}
        >
          <ambientLight intensity={0.8} />
          <directionalLight position={[5, 5, 5]} intensity={0.6} />
          <Model
            url={modelPath}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={() => setIsDragging(false)}
          />
          <OrbitControls
            enabled={!isDragging}
            enableZoom
            enablePan
            enableRotate
            autoRotate={!isDragging}
            autoRotateSpeed={1.2}
            minPolarAngle={Math.PI / 6}
            maxPolarAngle={Math.PI * (5 / 6)}
          />
        </Canvas>
      </Suspense>
    </div>
  );
}

/** Error fallback when model fails to load */
function ModelErrorFallback({ className = "" }: { className?: string }) {
  return (
    <div
      className={`bg-gray-200 flex flex-col items-center justify-center text-gray-600 text-sm ${className}`}
      style={{ aspectRatio: "1", minHeight: 200 }}
    >
      <span>3D model unavailable</span>
      <span className="text-xs mt-1">Please check file path</span>
    </div>
  );
}

class ModelErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

export function ThreeDModel(props: ThreeDModelProps) {
  return (
    <ModelErrorBoundary
      fallback={<ModelErrorFallback className={props.className} />}
    >
      <ThreeDModelInner {...props} />
    </ModelErrorBoundary>
  );
}
