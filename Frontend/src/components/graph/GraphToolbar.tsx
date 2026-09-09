import {
  ZoomIn,
  ZoomOut,
  Maximize,
  Minimize2,
  Scan,
  RotateCcw,
  GitFork,
  Compass,
  CircleDot,
  LayoutGrid,
} from 'lucide-react';

export type GraphLayoutType = 'breadthfirst' | 'cose' | 'concentric' | 'circle';

export interface GraphToolbarProps {
  layout: GraphLayoutType;
  onLayoutChange: (layout: GraphLayoutType) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onReset: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  className?: string;
}

export const GraphToolbar: React.FC<GraphToolbarProps> = ({
  layout,
  onLayoutChange,
  onZoomIn,
  onZoomOut,
  onFit,
  onReset,
  isFullscreen = false,
  onToggleFullscreen,
  className,
}) => {
  const layouts: Array<{ id: GraphLayoutType; label: string; icon: React.ElementType }> = [
    { id: 'breadthfirst', label: 'Flow Tree', icon: GitFork },
    { id: 'cose', label: 'Force Physics', icon: Compass },
    { id: 'concentric', label: 'Radial Rings', icon: CircleDot },
    { id: 'circle', label: 'Perimeter', icon: LayoutGrid },
  ];

  return (
    <div
      className={`p-2 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-md flex flex-wrap items-center justify-between gap-3 ${className}`}
    >
      {/* Left: Layout Switcher */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
        {layouts.map((l) => {
          const Icon = l.icon;
          const isActive = layout === l.id;
          return (
            <button
              key={l.id}
              onClick={() => onLayoutChange(l.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-white text-[#4F46E5] font-bold shadow-xs'
                  : 'text-[#526077] hover:text-[#0F172A]'
              }`}
              title={`Switch layout to ${l.label}`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{l.label}</span>
            </button>
          );
        })}
      </div>

      {/* Right: Camera Controls */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onZoomIn}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          title="Zoom In (+)"
        >
          <ZoomIn className="h-4 w-4" />
        </button>

        <button
          onClick={onZoomOut}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          title="Zoom Out (-)"
        >
          <ZoomOut className="h-4 w-4" />
        </button>

        <button
          onClick={onFit}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          title="Fit Viewport"
        >
          <Scan className="h-4 w-4" />
        </button>

        <div className="w-px h-5 bg-slate-200 mx-0.5" />

        <button
          onClick={onReset}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          title="Reset Camera"
        >
          <RotateCcw className="h-4 w-4" />
        </button>

        {onToggleFullscreen && (
          <>
            <div className="w-px h-5 bg-slate-200 mx-0.5" />
            <button
              onClick={onToggleFullscreen}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                isFullscreen
                  ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                  : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
              title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Expand Fullscreen'}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize className="h-4 w-4" />
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
};
