"use client";

import React, { Suspense } from "react";
import dynamic from "next/dynamic";
import { OrbitControls, useGLTF } from "@react-three/drei";

// Dynamic import Canvas to avoid SSR issues with three.js
const Canvas = dynamic(
  () => import("@react-three/fiber").then((m) => m.Canvas),
  { ssr: false }
);

interface ModelProps {
  url: string;
}

function Model({ url }: ModelProps) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

interface ThreeDViewerProps {
  modelPath: string;
  className?: string;
  autoRotate?: boolean;
}

function ThreeDViewerInner({
  modelPath,
  className = "",
  autoRotate = true,
}: ThreeDViewerProps) {
  return (
    <div className={`bg-gray-100 ${className}`} style={{ minHeight: 200 }}>
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-full min-h-[200px] text-gray-500">
            loading 3D...
          </div>
        }
      >
        <Canvas
          camera={{ position: [0, 0, 3], fov: 45 }}
          gl={{ alpha: false, antialias: true }}
        >
          <color attach="background" args={["#e5e7eb"]} />
          <ambientLight intensity={1} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <Model url={modelPath} />
          <OrbitControls
            enableZoom
            enablePan
            autoRotate={autoRotate}
            autoRotateSpeed={2}
          />
        </Canvas>
      </Suspense>
    </div>
  );
}

// Placeholder when model fails to load (404 or invalid)
function ThreeDPlaceholder({ className = "" }: { className?: string }) {
  return (
    <div
      className={`bg-gray-200 flex flex-col items-center justify-center text-gray-500 ${className}`}
      style={{ minHeight: 200 }}
    >
      <span>3D model placeholder</span>
      <span className="text-xs mt-1">Add .glb to /public/models/</span>
    </div>
  );
}

// Simple error boundary for 3D load failures
class ViewerErrorBoundary extends React.Component<
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

export function ThreeDViewer(props: ThreeDViewerProps) {
  return (
    <ViewerErrorBoundary
      fallback={<ThreeDPlaceholder className={props.className} />}
    >
      <ThreeDViewerInner {...props} />
    </ViewerErrorBoundary>
  );
}
