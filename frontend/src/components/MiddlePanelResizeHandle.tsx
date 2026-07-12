import React from 'react';

interface MiddlePanelResizeHandleProps {
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
}

export default function MiddlePanelResizeHandle({ onPointerDown }: MiddlePanelResizeHandleProps) {
  return (
    <div
      role="separator"
      aria-label="拖拽调整中栏宽度"
      aria-orientation="vertical"
      title="拖拽调整中栏宽度"
      onPointerDown={onPointerDown}
      className="group relative hidden md:block w-1 h-full flex-shrink-0 cursor-col-resize touch-none bg-transparent hover:bg-cyan-500/25 active:bg-cyan-500/35 transition-colors z-30"
    >
      <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-zinc-700/60 group-hover:bg-cyan-400/80 group-active:bg-cyan-300" />
    </div>
  );
}
