"use client";

import { useCallback } from "react";
import { ThreeDViewer } from "./ThreeDViewer";

interface ThreeDViewerModalProps {
  modelPath: string;
  title: string;
  onClose: () => void;
}

export function ThreeDViewerModal({
  modelPath,
  title,
  onClose,
}: ThreeDViewerModalProps) {
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white border-2 border-black max-w-2xl w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-2 border-b border-black">
          <h3 className="font-bold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-[#00c] hover:underline"
          >
            close
          </button>
        </div>
        <div className="h-80">
          <ThreeDViewer modelPath={modelPath} autoRotate />
        </div>
      </div>
    </div>
  );
}
