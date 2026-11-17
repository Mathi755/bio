import React from 'react';
import { AlgorithmKey, BenchmarkSuite, WasteNode } from '../types/aco';

interface CityMapCanvasProps {
  suite: BenchmarkSuite;
  activeAlgo: AlgorithmKey;
  truckStepProgress: number | null;
  selectedNodeId: number | null;
  onSelectNode: (id: number) => void;
}

const PAD_LEFT = 44;
const PAD_RIGHT = 24;
const PAD_TOP = 24;
const PAD_BOTTOM = 40;
const SVG_W = 600;
const SVG_H = 480;
const PLOT_W = SVG_W - PAD_LEFT - PAD_RIGHT;
const PLOT_H = SVG_H - PAD_TOP - PAD_BOTTOM;

function toSvgX(gridX: number): number {
  return PAD_LEFT + (gridX / 100) * PLOT_W;
}

function toSvgY(gridY: number): number {
  return PAD_TOP + ((100 - gridY) / 100) * PLOT_H;
}

function starPath(cx: number, cy: number, outerR = 11, innerR = 5): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${(cx + r * Math.cos(angle)).toFixed(2)},${(cy + r * Math.sin(angle)).toFixed(2)}`);
  }
  return `M ${pts.join(' L ')} Z`;
}

export const CityMapCanvas: React.FC<CityMapCanvasProps> = ({
  suite,
  activeAlgo,
  truckStepProgress,
  selectedNodeId,
  onSelectNode,
}) => {
  const route = suite[activeAlgo].route;

  let truckPos: { x: number; y: number; angle: number } | null = null;
  if (truckStepProgress !== null && route.length >= 2) {
    const clamped = Math.max(0, Math.min(route.length - 1, truckStepProgress));
    const segIdx = Math.min(Math.floor(clamped), route.length - 2);
    const t = clamped - segIdx;
    const nA = suite.nodes[route[segIdx]];
    const nB = suite.nodes[route[segIdx + 1]];
    if (nA && nB) {
      const xA = toSvgX(nA.x);
      const yA = toSvgY(nA.y);
      const xB = toSvgX(nB.x);
      const yB = toSvgY(nB.y);
      truckPos = {
        x: xA + (xB - xA) * t,
        y: yA + (yB - yA) * t,
        angle: (Math.atan2(yB - yA, xB - xA) * 180) / Math.PI,
      };
    }
  }

  const ticks = [0, 20, 40, 60, 80, 100];
  const strokeColor =
    activeAlgo === 'improved' ? '#0F766E' : activeAlgo === 'standard' ? '#0284C7' : '#475569';

  const getBinColor = (node: WasteNode) => {
    const fill = node.fillLevel ?? 0;
    if (fill >= 80) return '#DC2626';
    if (fill >= 60) return '#D97706';
    return '#059669';
  };

  const limit =
    truckStepProgress !== null
      ? Math.min(Math.floor(truckStepProgress), route.length - 1)
      : route.length - 1;

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full h-auto block select-none">
        <defs>
          <marker
            id="route-arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill={strokeColor} />
          </marker>
        </defs>

        <rect
          x={PAD_LEFT}
          y={PAD_TOP}
          width={PLOT_W}
          height={PLOT_H}
          fill="#FFFFFF"
          stroke="#CBD5E1"
        />

        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={toSvgX(t)}
              y1={PAD_TOP}
              x2={toSvgX(t)}
              y2={SVG_H - PAD_BOTTOM}
              stroke="#F1F5F9"
            />
            <line
              x1={PAD_LEFT}
              y1={toSvgY(t)}
              x2={SVG_W - PAD_RIGHT}
              y2={toSvgY(t)}
              stroke="#F1F5F9"
            />
            <text
              x={toSvgX(t)}
              y={SVG_H - PAD_BOTTOM + 16}
              textAnchor="middle"
              className="fill-slate-400 text-[10px] font-mono tabular-nums"
            >
              {t}
            </text>
            <text
              x={PAD_LEFT - 10}
              y={toSvgY(t) + 3.5}
              textAnchor="end"
              className="fill-slate-400 text-[10px] font-mono tabular-nums"
            >
              {t}
            </text>
          </g>
        ))}

        {/* Faint full path while animating */}
        {truckStepProgress !== null &&
          route.slice(0, -1).map((fromId, idx) => {
            const u = suite.nodes[fromId];
            const v = suite.nodes[route[idx + 1]];
            if (!u || !v) return null;
            return (
              <line
                key={`ghost-${idx}`}
                x1={toSvgX(u.x)}
                y1={toSvgY(u.y)}
                x2={toSvgX(v.x)}
                y2={toSvgY(v.y)}
                stroke={strokeColor}
                strokeWidth={1.5}
                strokeDasharray="4 4"
                strokeOpacity={0.3}
              />
            );
          })}

        {/* Route edges */}
        {route.slice(0, limit).map((fromId, idx) => {
          const u = suite.nodes[fromId];
          const v = suite.nodes[route[idx + 1]];
          if (!u || !v) return null;
          const x1 = toSvgX(u.x);
          const y1 = toSvgY(u.y);
          const x2 = toSvgX(v.x);
          const y2 = toSvgY(v.y);
          const dx = x2 - x1;
          const dy = y2 - y1;
          const len = Math.hypot(dx, dy);
          const pad = len > 24 ? 10 : 4;
          const ex = len > 0 ? x2 - (dx / len) * pad : x2;
          const ey = len > 0 ? y2 - (dy / len) * pad : y2;

          return (
            <line
              key={`seg-${idx}`}
              x1={x1}
              y1={y1}
              x2={ex}
              y2={ey}
              stroke={strokeColor}
              strokeWidth={2}
              markerEnd="url(#route-arrow)"
            />
          );
        })}

        {/* Waste Bins */}
        {suite.nodes
          .filter((n) => n.id !== 0)
          .map((node) => {
            const cx = toSvgX(node.x);
            const cy = toSvgY(node.y);
            const color = getBinColor(node);
            const isSelected = selectedNodeId === node.id;

            return (
              <g
                key={node.id}
                className="cursor-pointer"
                onClick={() => onSelectNode(node.id)}
              >
                {isSelected && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={12}
                    fill="none"
                    stroke="#0F172A"
                    strokeWidth={1.8}
                  />
                )}
                <circle
                  cx={cx}
                  cy={cy}
                  r={6.5}
                  fill={color}
                  stroke="#FFFFFF"
                  strokeWidth={1.5}
                />
                <text
                  x={cx + 9}
                  y={cy + 3}
                  className="fill-slate-700 text-[10px] font-mono tabular-nums"
                >
                  {node.id}
                </text>
              </g>
            );
          })}

        {/* Depot */}
        {suite.nodes[0] && (
          <g>
            <path
              d={starPath(toSvgX(suite.nodes[0].x), toSvgY(suite.nodes[0].y), 11, 5)}
              fill="#0F172A"
              stroke="#FFFFFF"
              strokeWidth={1.5}
            />
            <text
              x={toSvgX(suite.nodes[0].x) + 13}
              y={toSvgY(suite.nodes[0].y) + 4}
              className="fill-slate-900 text-[11px] font-semibold"
            >
              Depot
            </text>
          </g>
        )}

        {/* Truck marker */}
        {truckPos && (
          <g transform={`translate(${truckPos.x}, ${truckPos.y})`}>
            <circle r={7} fill={strokeColor} stroke="#FFFFFF" strokeWidth={2} />
            <g transform={`rotate(${truckPos.angle})`}>
              <path d="M -2.5 -2.5 L 4 0 L -2.5 2.5 Z" fill="#FFFFFF" />
            </g>
          </g>
        )}
      </svg>

      {/* Clean simple legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-t border-slate-100 text-xs text-slate-600">
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" />
            Critical (&ge;80%)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-600 inline-block" />
            Moderate (60–79%)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
            Normal (&lt;60%)
          </span>
        </div>
        <span className="text-slate-400">Click any bin to inspect</span>
      </div>
    </div>
  );
};
