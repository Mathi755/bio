import React, { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Pause, Play, RotateCcw } from 'lucide-react';
import { CityMapCanvas } from './components/CityMapCanvas';
import { ConvergenceChart } from './components/ConvergenceChart';
import {
  computeUrgency,
  DEFAULT_ACO_PARAMS,
  getOperationalStatus,
  getScenarioNodes,
  runBenchmarkSuite,
} from './engine/acoEngine';
import { AlgorithmKey, WasteNode } from './types/aco';

type ViewTab = 'simulator' | 'charts' | 'formulas';

const MAIN_SAMPLE_CODE = `# 1. Urgency & Objective Function (Module 2)
urgency = np.maximum(0, (fill_levels - 70) / 30)
PRIORITY_WEIGHT = 20

def priority_score(route):
    total = 0
    for rank, city in enumerate(route[1:-1], start=1):
        total += (rank / N) * urgency[city - 1]
    return total / N

def objective_function(route):
    return calculate_distance(route) + PRIORITY_WEIGHT * priority_score(route)

# 2. Priority-Aware Improved ACO Core (Module 4)
def ant_colony_optimization(improved=True, ants=20, iterations=100,
                            alpha=1, beta=3, evaporation=0.4, Q=100, kappa=2):
    pheromone = np.ones((N + 1, N + 1))
    best_route, best_cost, history = None, float('inf'), []

    for _ in range(iterations):
        all_routes = []
        for _ in range(ants):
            route, unvisited, current = [0], list(range(1, N + 1)), 0
            while unvisited:
                probs = []
                for city in unvisited:
                    heuristic = 1 / max(distance_matrix[current, city], 1e-10)
                    attr = (pheromone[current, city] ** alpha) * (heuristic ** beta)
                    if improved:
                        attr *= (1 + kappa * urgency[city - 1])  # Urgency boost
                    probs.append(attr)
                probs = np.array(probs) / np.sum(probs)
                next_city = np.random.choice(unvisited, p=probs)
                route.append(next_city)
                unvisited.remove(next_city)
                current = next_city
            route.append(0)
            cost = objective_function(route) if improved else calculate_distance(route)
            all_routes.append((route, cost))
            if cost < best_cost:
                best_cost, best_route = cost, route.copy()

        pheromone *= (1 - evaporation)
        for route, cost in all_routes:
            deposit = Q / max(cost, 1e-10)
            for i in range(len(route) - 1):
                a, b = route[i], route[i + 1]
                pheromone[a, b] += deposit
                pheromone[b, a] += deposit
        history.append(best_cost)
    return best_route, best_cost, history`;

const SimpleBarCard: React.FC<{
  title: string;
  unit: string;
  decimals: number;
  items: Array<{ label: string; value: number; color: string }>;
}> = ({ title, unit, decimals, items }) => {
  const maxVal = Math.max(...items.map((i) => i.value), 0.001) * 1.15;
  const W = 360;
  const H = 180;
  const padL = 44;
  const padR = 16;
  const padT = 18;
  const padB = 30;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const barW = 50;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-slate-900 mb-3">{title}</h3>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block">
        <rect x={padL} y={padT} width={plotW} height={plotH} fill="#FFFFFF" stroke="#E2E8F0" />
        {items.map((item, idx) => {
          const slotW = plotW / items.length;
          const x = padL + slotW * idx + (slotW - barW) / 2;
          const barH = (item.value / maxVal) * plotH;
          const y = padT + plotH - barH;
          return (
            <g key={item.label}>
              <rect x={x} y={y} width={barW} height={barH} rx={3} fill={item.color} />
              <text
                x={x + barW / 2}
                y={y - 5}
                textAnchor="middle"
                className="fill-slate-800 text-[10.5px] font-mono font-semibold tabular-nums"
              >
                {item.value.toFixed(decimals)}
                {unit ? ` ${unit}` : ''}
              </text>
              <text
                x={x + barW / 2}
                y={H - 10}
                textAnchor="middle"
                className="fill-slate-600 text-[10.5px] font-medium"
              >
                {item.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export function App() {
  const [tab, setTab] = useState<ViewTab>('simulator');
  const [nodes, setNodes] = useState<WasteNode[]>(() => getScenarioNodes('report42'));
  const [seed, setSeed] = useState<number>(42);
  const [allowReportRef, setAllowReportRef] = useState<boolean>(true);
  const [activeAlgo, setActiveAlgo] = useState<AlgorithmKey>('improved');
  const [selectedNodeId, setSelectedNodeId] = useState<number>(2);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [truckProgress, setTruckProgress] = useState<number | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(MAIN_SAMPLE_CODE);
      setCopiedCode(true);
      window.setTimeout(() => setCopiedCode(false), 1800);
    } catch {
      // Ignore if clipboard unavailable
    }
  };

  const suite = useMemo(
    () => runBenchmarkSuite(nodes, DEFAULT_ACO_PARAMS, seed, allowReportRef),
    [nodes, seed, allowReportRef]
  );

  useEffect(() => {
    if (!isPlaying) return;
    const maxStep = Math.max(1, suite[activeAlgo].route.length - 1);
    const timer = window.setInterval(() => {
      setTruckProgress((prev) => {
        const current = prev === null ? 0 : prev;
        const next = current + 0.09;
        if (next >= maxStep) {
          setIsPlaying(false);
          return maxStep;
        }
        return next;
      });
    }, 45);
    return () => window.clearInterval(timer);
  }, [isPlaying, activeAlgo, suite]);

  const handleRandomize = () => {
    const nextSeed = seed + 31;
    setSeed(nextSeed);
    setAllowReportRef(false);
    setNodes(getScenarioNodes('customRandom', nextSeed));
    setTruckProgress(null);
    setIsPlaying(false);
  };

  const handleReset = () => {
    setNodes(getScenarioNodes('report42'));
    setSeed(42);
    setAllowReportRef(true);
    setSelectedNodeId(2);
    setTruckProgress(null);
    setIsPlaying(false);
  };

  const handleFillChange = (binId: number, fillLevel: number) => {
    setAllowReportRef(false);
    setNodes((prev) =>
      prev.map((n) => (n.id === binId ? { ...n, fillLevel } : n))
    );
  };

  const handleTogglePlay = () => {
    const maxStep = suite[activeAlgo].route.length - 1;
    if (truckProgress === null || truckProgress >= maxStep) {
      setTruckProgress(0);
    }
    setIsPlaying((p) => !p);
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? nodes[1];
  const selectedUrgency =
    selectedNode && selectedNode.fillLevel !== null
      ? computeUrgency(selectedNode.fillLevel, DEFAULT_ACO_PARAMS.urgencyThreshold)
      : 0;
  const selectedStatus = selectedNode ? getOperationalStatus(selectedNode.fillLevel) : null;

  const distSavedKm = suite.nn.distance - suite.improved.distance;
  const prioGainPct =
    suite.standard.priorityScore > 0
      ? ((suite.standard.priorityScore - suite.improved.priorityScore) /
          suite.standard.priorityScore) *
        100
      : 0;

  const stdRanks = new Map<number, number>();
  suite.standard.route.slice(1, -1).forEach((id, idx) => stdRanks.set(id, idx + 1));
  const impRanks = new Map<number, number>();
  suite.improved.route.slice(1, -1).forEach((id, idx) => impRanks.set(id, idx + 1));

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Clean 3-Zone Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-[1140px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-8">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setTab('simulator');
            }}
            className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            Smart Waste ACO
          </a>

          <nav className="flex items-center gap-6 text-sm font-medium">
            <button
              onClick={() => setTab('simulator')}
              className={`py-4 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                tab === 'simulator'
                  ? 'border-teal-700 text-slate-900 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Simulator
            </button>
            <button
              onClick={() => setTab('charts')}
              className={`py-4 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                tab === 'charts'
                  ? 'border-teal-700 text-slate-900 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Charts &amp; Data
            </button>
            <button
              onClick={() => setTab('formulas')}
              className={`py-4 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                tab === 'formulas'
                  ? 'border-teal-700 text-slate-900 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Formulas &amp; Code
            </button>
            <a
              href="/assets/aistudio/Smart_Waste_Collection_ACO_Report_d66c051f.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="py-4 border-b-2 border-transparent text-slate-500 hover:text-slate-900 whitespace-nowrap shrink-0"
            >
              Report PDF
            </a>
          </nav>

          <button
            onClick={handleRandomize}
            className="px-4 py-2 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Randomize Map
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-[1140px] w-full mx-auto px-4 sm:px-6 py-8">
        {tab === 'simulator' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                  Smart Waste Collection Route Optimizer
                </h1>
                <p className="text-sm text-slate-600 mt-1">
                  Improved Ant Colony Optimization collects full bins earlier while keeping travel distance minimal.
                </p>
              </div>
              {!allowReportRef && (
                <button
                  onClick={handleReset}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md cursor-pointer whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Default</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left: Map & Simple Toggle */}
              <div className="lg:col-span-7 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-md">
                    {(
                      [
                        ['improved', 'Improved ACO'],
                        ['standard', 'Standard ACO'],
                        ['nn', 'Nearest Neighbour'],
                      ] as Array<[AlgorithmKey, string]>
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => {
                          setActiveAlgo(key);
                          setTruckProgress(null);
                          setIsPlaying(false);
                        }}
                        className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          activeAlgo === key
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleTogglePlay}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{isPlaying ? 'Pause' : 'Play Route'}</span>
                  </button>
                </div>

                <CityMapCanvas
                  suite={suite}
                  activeAlgo={activeAlgo}
                  truckStepProgress={truckProgress}
                  selectedNodeId={selectedNodeId}
                  onSelectNode={(id) => {
                    if (id !== 0) setSelectedNodeId(id);
                  }}
                />
              </div>

              {/* Right: Clean Summary & Single Bin Control */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-200">
                    <h2 className="text-sm font-semibold text-slate-900">Algorithm Comparison</h2>
                  </div>
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                        <th className="py-2.5 px-4">Method</th>
                        <th className="py-2.5 px-4 text-right">Distance</th>
                        <th className="py-2.5 px-4 text-right">Priority Penalty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr
                        onClick={() => setActiveAlgo('nn')}
                        className={`cursor-pointer hover:bg-slate-50 ${
                          activeAlgo === 'nn' ? 'bg-slate-50' : ''
                        }`}
                      >
                        <td className="py-3 px-4 font-medium text-slate-800">Nearest Neighbour</td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">
                          {suite.nn.distance.toFixed(2)} km
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">
                          {suite.nn.priorityScore.toFixed(4)}
                        </td>
                      </tr>
                      <tr
                        onClick={() => setActiveAlgo('standard')}
                        className={`cursor-pointer hover:bg-slate-50 ${
                          activeAlgo === 'standard' ? 'bg-sky-50/50' : ''
                        }`}
                      >
                        <td className="py-3 px-4 font-medium text-sky-700">Standard ACO</td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">
                          {suite.standard.distance.toFixed(2)} km
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">
                          {suite.standard.priorityScore.toFixed(4)}
                        </td>
                      </tr>
                      <tr
                        onClick={() => setActiveAlgo('improved')}
                        className={`cursor-pointer hover:bg-teal-50/40 ${
                          activeAlgo === 'improved' ? 'bg-teal-50/60' : ''
                        }`}
                      >
                        <td className="py-3 px-4 font-semibold text-teal-800">Improved ACO</td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">
                          {suite.improved.distance.toFixed(2)} km
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-teal-700">
                          {suite.improved.priorityScore.toFixed(4)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Simple Plain-English Result */}
                <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2 text-sm text-slate-700">
                  <div className="font-semibold text-slate-900 text-xs">Key Result</div>
                  <p className="text-xs leading-relaxed">
                    Improved ACO saves{' '}
                    <strong className="font-mono text-slate-900">
                      {distSavedKm.toFixed(2)} km
                    </strong>{' '}
                    over Nearest Neighbour and improves critical bin urgency by{' '}
                    <strong className="font-mono text-teal-700">
                      {prioGainPct >= 0 ? '+' : ''}
                      {prioGainPct.toFixed(1)}%
                    </strong>{' '}
                    compared to Standard ACO.
                  </p>
                </div>

                {/* Simple Bin Fill Editor */}
                {selectedNode && selectedNode.fillLevel !== null && (
                  <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-900">
                        {selectedNode.label}
                      </span>
                      <span className="text-xs font-mono text-slate-500">
                        Urgency: {selectedUrgency.toFixed(2)}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <label htmlFor="bin-fill">Fill Level</label>
                        <span className="font-mono font-semibold text-slate-900">
                          {selectedNode.fillLevel}%
                        </span>
                      </div>
                      <input
                        id="bin-fill"
                        type="range"
                        min={0}
                        max={100}
                        value={selectedNode.fillLevel}
                        onChange={(e) => handleFillChange(selectedNode.id, Number(e.target.value))}
                        className="w-full accent-teal-700 cursor-pointer"
                      />
                    </div>

                    {selectedStatus && (
                      <div className="text-xs text-slate-500">
                        Status: <span className="font-medium text-slate-800">{selectedStatus.label}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === 'charts' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                Charts &amp; Bin Data
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Distance, priority penalty, convergence over 100 iterations, and visit order per bin.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SimpleBarCard
                title="Travel Distance (km)"
                unit="km"
                decimals={2}
                items={[
                  { label: 'Nearest Neighbour', value: suite.nn.distance, color: '#64748B' },
                  { label: 'Standard ACO', value: suite.standard.distance, color: '#0284C7' },
                  { label: 'Improved ACO', value: suite.improved.distance, color: '#0F766E' },
                ]}
              />
              <SimpleBarCard
                title="Priority Penalty Score"
                unit=""
                decimals={4}
                items={[
                  { label: 'Nearest Neighbour', value: suite.nn.priorityScore, color: '#64748B' },
                  { label: 'Standard ACO', value: suite.standard.priorityScore, color: '#0284C7' },
                  { label: 'Improved ACO', value: suite.improved.priorityScore, color: '#0F766E' },
                ]}
              />
            </div>

            <ConvergenceChart
              standardHistory={suite.standard.history}
              improvedHistory={suite.improved.history}
            />

            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <th className="py-2.5 px-4">Node</th>
                      <th className="py-2.5 px-4 text-right">Coords</th>
                      <th className="py-2.5 px-4 text-right">Fill</th>
                      <th className="py-2.5 px-4 text-right">Urgency</th>
                      <th className="py-2.5 px-4 text-right">Std ACO Stop</th>
                      <th className="py-2.5 px-4 text-right">Improved ACO Stop</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {nodes.map((node, idx) => (
                      <tr key={node.id} className="hover:bg-slate-50">
                        <td className="py-2 px-4 font-medium text-slate-900">{node.label}</td>
                        <td className="py-2 px-4 text-right font-mono tabular-nums text-slate-600">
                          ({node.x}, {node.y})
                        </td>
                        <td className="py-2 px-4 text-right font-mono tabular-nums text-slate-900">
                          {node.fillLevel !== null ? `${node.fillLevel}%` : '—'}
                        </td>
                        <td className="py-2 px-4 text-right font-mono tabular-nums text-slate-700">
                          {(suite.urgencies[idx] ?? 0).toFixed(2)}
                        </td>
                        <td className="py-2 px-4 text-right font-mono tabular-nums text-slate-600">
                          {stdRanks.get(node.id) ?? 'Depot'}
                        </td>
                        <td className="py-2 px-4 text-right font-mono tabular-nums font-semibold text-teal-700">
                          {impRanks.get(node.id) ?? 'Depot'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab === 'formulas' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                Formulas &amp; Main Algorithm Code
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Core mathematical equations and Python implementation of Priority-Aware Improved ACO.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-1.5">
                <div className="text-xs font-semibold text-slate-700">1. Urgency Calculation</div>
                <div className="font-mono text-sm font-semibold text-teal-800">
                  Uᵢ = max(0, (Fᵢ − 70) / 30)
                </div>
                <p className="text-xs text-slate-500">
                  Bins with fill &le; 70% have 0 urgency; above 70%, urgency scales linearly up to 1.0.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-1.5">
                <div className="text-xs font-semibold text-slate-700">2. Priority Penalty Score</div>
                <div className="font-mono text-sm font-semibold text-teal-800">
                  P(route) = (1 / n) · Σ [ (k / n) · U_π(k) ]
                </div>
                <p className="text-xs text-slate-500">
                  Penalizes visiting urgent bins at late tour positions k. Lower P means faster critical service.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-1.5">
                <div className="text-xs font-semibold text-slate-700">3. Composite Objective Function</div>
                <div className="font-mono text-sm font-semibold text-teal-800">
                  J(route) = D(route) + λ · P(route) &nbsp;(λ = 20)
                </div>
                <p className="text-xs text-slate-500">
                  Combines total Euclidean travel distance D (km) and priority penalty P into a single cost.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-1.5">
                <div className="text-xs font-semibold text-slate-700">4. Enhanced Transition Rule</div>
                <div className="font-mono text-sm font-semibold text-teal-800">
                  pᵢⱼ ∝ τ(i,j)^α · η(i,j)^β · (1 + κ · Uⱼ)
                </div>
                <p className="text-xs text-slate-500">
                  Multiplies pheromone τ and inverse distance η by (1 + κ·Uⱼ) with α=1, β=3, κ=2, ρ=0.4.
                </p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Main Python Implementation (Improved ACO)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Core urgency, objective function, and ant colony optimization loop
                  </p>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  {copiedCode ? (
                    <Check className="w-3.5 h-3.5 text-teal-700" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                </button>
              </div>
              <pre className="p-4 bg-slate-950 text-slate-100 text-xs font-mono overflow-x-auto leading-relaxed">
                <code>{MAIN_SAMPLE_CODE}</code>
              </pre>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
