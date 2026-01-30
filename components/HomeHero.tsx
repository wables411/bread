"use client";

import { useState } from "react";
import { ThreeDViewerModal } from "./ThreeDViewerModal";

const SOURDOUGH_GLB = "/models/media/$bread%20on%20base.glb";

export function HomeHero() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        type="button"
        className="h-64 w-full border border-gray-300 block overflow-hidden hover:border-[#00c] focus:border-[#00c] focus:outline-none"
        onClick={() => setShowModal(true)}
        aria-label="View 3D model of sourdough"
      >
        <img
          src="/models/media/bread.png"
          alt="Sourdough"
          className="h-full w-full object-contain"
        />
      </button>
      <ThreeDViewerModal
        open={showModal}
        modelPath={SOURDOUGH_GLB}
        title="sourdough loaf"
        onClose={() => setShowModal(false)}
      />
    </>
  );
}
