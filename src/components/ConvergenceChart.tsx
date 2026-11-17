import React, { useState } from 'react';
import { IterationSnapshot } from '../types/aco';

interface ConvergenceChartProps {
  standardHistory: IterationSnapshot[];
  improvedHistory: IterationSnapshot[];
  currentIterationIndex?: number;
}

const W = 720;
const H = 290;
const PAD_L = 56;
const PAD_R = 20;
const PAD_T = 20;
const PAD_B = 42;
const PLOT_W = W - PAD_L - PAD_R;
const PLOT_H = H - PAD_T - PAD_B;

export const ConvergenceChart: React.FC<ConvergenceChartProps> = ({
  standardHistory,
  improvedHistory,
  currentIterationIndex,
}) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const count = Math.max(standardHistory.length, improvedHistory.length);
  if (count === 0) {
    return (
      <div className="h-64 flex items-center justify-center border border-slate-200 rounded-lg bg-white text-sm text-slate-500">
        No iteration convergence data available.
      </div>
    );
  }

  const allVals = [
    ...standardHistory.map((h) => h.bestCost),
    ...improvedHistory.map((h) => h.bestCost),
  ];
  const minVal = Math.min(...allVals);
  const maxVal = Math.max(...allVals);
  const padding = Math.max(1.5, (maxVal - minVal) * 0.12);
  const yMin = Math.floor(minVal - padding);
  const yMax = Math.ceil(maxVal + padding);
  const ySpan = Math.max(1, yMax - yMin);

  const xFor = (idx: number) =>
    PAD_L + (count > 1 ? (idx / (count - 1)) * PLOT_W : PLOT_W / 2);
  const yFor = (val: number) => PAD_T + ((yMax - val) / ySpan) * PLOT_H;

  const buildPath = (hist: IterationSnapshot[]) =>
    hist
      .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(2)} ${yFor(pt.bestCost).toFixed(2)}`)
      .join(' ');

  const yTicks = Array.from({ length: 5 }, (_, i) => yMin + (ySpan * i) / 4);
  const xTickIndices = Array.from(
    new Set([0, Math.floor((count - 1) * 0.25), Math.floor((count - 1) * 0.5), Math.floor((count - 1) * 0.75), count - 1])
  );

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const sx = ((e.clientX - rect.left) / rect.width) * W;
    if (sx < PAD_L || sx > W - PAD_R) {
      setHoverIdx(null);
      return;
    }
    const ratio = (sx - PAD_L) / PLOT_W;
    const idx = Math.round(ratio * (count - 1));
    setHoverIdx(Math.max(0, Math.min(count - 1, idx)));
  };

  const activeHover = hoverIdx !== null ? hoverIdx : currentIterationIndex ?? null;
  const hoverStd = activeHover !== null ? standardHistory[activeHover] : undefined;
  const hoverImp = activeHover !== null ? improvedHistory[activeHover] : undefined;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Route-Cost Convergence Across {count} Iterations
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Standard ACO tracks Euclidean distance D; Improved ACO tracks composite objective J = D + λP
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
            <span className="w-4 h-0.5 bg-sky-600 inline-block" />
            <span>Standard ACO (D)</span>
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
            <span className="w-4 h-0.5 bg-teal-700 inline-block" />
            <span>Improved ACO (J)</span>
          </span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto block cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
        <rect
          x={PAD_L}
          y={PAD_T}
          width={PLOT_W}
          height={PLOT_H}
          fill="#FFFFFF"
          stroke="#CBD5E1"
          strokeWidth={1}
        />

        {/* Y grid & ticks */}
        {yTicks.map((yv, i) => (
          <g key={i}>
            <line
              x1={PAD_L}
              y1={yFor(yv)}
              x2={W - PAD_R}
              y2={yFor(yv)}
              stroke="#E2E8F0"
              strokeWidth={1}
            />
            <text
              x={PAD_L - 8}
              y={yFor(yv) + 3.5}
              textAnchor="end"
              className="fill-slate-500 text-[10.5px] font-mono tabular-nums"
            >
              {yv.toFixed(1)}
            </text>
          </g>
        ))}

        {/* X grid & ticks */}
        {xTickIndices.map((xi) => (
          <g key={xi}>
            <line
              x1={xFor(xi)}
              y1={PAD_T}
              x2={xFor(xi)}
              y2={H - PAD_B}
              stroke="#E2E8F0"
              strokeWidth={1}
            />
            <text
              x={xFor(xi)}
              y={H - PAD_B + 15}
              textAnchor="middle"
              className="fill-slate-500 text-[10.5px] font-mono tabular-nums"
            >
              {xi + 1}
            </text>
          </g>
        ))}

        {/* Axis labels */}
        <text
          x={PAD_L + PLOT_W / 2}
          y={H - 6}
          textAnchor="middle"
          className="fill-slate-600 text-[11px] font-medium"
        >
          Iteration (T)
        </text>
        <text
          x={14}
          y={PAD_T + PLOT_H / 2}
          textAnchor="middle"
          transform={`rotate(-90, 14, ${PAD_T + PLOT_H / 2})`}
          className="fill-slate-600 text-[11px] font-medium"
        >
          Best Objective Value
        </text>

        {/* Curves */}
        <path
          d={buildPath(standardHistory)}
          fill="none"
          stroke="#0284C7"
          strokeWidth={2}
        />
        <path
          d={buildPath(improvedHistory)}
          fill="none"
          stroke="#0F766E"
          strokeWidth={2.2}
        />

        {/* Crosshair indicator */}
        {activeHover !== null && (
          <g>
            <line
              x1={xFor(activeHover)}
              y1={PAD_T}
              x2={xFor(activeHover)}
              y2={H - PAD_B}
              stroke="#64748B"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            {hoverStd && (
              <circle
                cx={xFor(activeHover)}
                cy={yFor(hoverStd.bestCost)}
                r={4}
                fill="#0284C7"
                stroke="#FFFFFF"
                strokeWidth={1.5}
              />
            )}
            {hoverImp && (
              <circle
                cx={xFor(activeHover)}
                cy={yFor(hoverImp.bestCost)}
                r={4}
                fill="#0F766E"
                stroke="#FFFFFF"
                strokeWidth={1.5}
              />
            )}
          </g>
        )}
      </svg>

      {/* Monospace telemetry readout footer */}
      <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs font-mono tabular-nums text-slate-600">
        <span>
          Iteration: {activeHover !== null ? activeHover + 1 : count} / {count}
        </span>
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sky-700">
            Standard ACO:{' '}
            {(hoverStd ?? standardHistory[standardHistory.length - 1])?.bestCost.toFixed(4)}
          </span>
          <span className="text-teal-700 font-semibold">
            Improved ACO:{' '}
            {(hoverImp ?? improvedHistory[improvedHistory.length - 1])?.bestCost.toFixed(4)}
          </span>
        </div>
      </div>
    </div>
  );
};
