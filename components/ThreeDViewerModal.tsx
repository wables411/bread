"use client";

import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { ThreeDModel } from "./ThreeDModel";

interface ThreeDViewerModalProps {
  open: boolean;
  modelPath: string;
  title: string;
  onClose: () => void;
}

/** Modal with interactive 3D viewer. Craigslist aesthetic: white bg, black text, blue links. */
export function ThreeDViewerModal({
  open,
  modelPath,
  title,
  onClose,
}: ThreeDViewerModalProps) {
  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" open={open} onClose={onClose}>
        <div className="fixed inset-0 overflow-hidden">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Dialog.Panel
              className="fixed inset-0 w-screen h-screen max-w-none max-h-none bg-transparent"
              style={{ fontFamily: "Arial, sans-serif" }}
            >
              <Dialog.Title className="sr-only">{title}</Dialog.Title>
              {/* Full-screen 3D viewer: no container, no background, bounded to browser */}
              <div className="absolute inset-0 w-full h-full">
                <ThreeDModel modelPath={modelPath} />
              </div>

              {/* Floating close button */}
              <button
                type="button"
                onClick={onClose}
                className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center text-2xl leading-none text-black bg-white/90 hover:bg-white border border-black rounded focus:outline-none"
                aria-label="Close"
              >
                ×
              </button>

              {/* Floating footer hint */}
              <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none">
                <span className="px-3 py-1.5 text-xs text-black bg-white/90 border border-black rounded">
                  Grab model to move • Drag empty space to rotate • Pinch/scroll to zoom
                </span>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}
