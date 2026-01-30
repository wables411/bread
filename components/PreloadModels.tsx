"use client";

import { useEffect } from "react";
import { useGLTF } from "@react-three/drei";

/** Model paths used across the app */
export const MODEL_PATHS = {
  sourdough: "/models/media/$bread%20on%20base.glb",
  cinnabunz: "/models/media/cinnabunz.glb",
} as const;

/** Preloads both GLB models at app startup so modal opens instantly. */
export function PreloadModels() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    // Preload both models so they're cached when user opens modal
    useGLTF.preload(MODEL_PATHS.sourdough);
    useGLTF.preload(MODEL_PATHS.cinnabunz);
  }, []);
  return null;
}
