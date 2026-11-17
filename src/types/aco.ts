export interface WasteNode {
  id: number; // 0 = Depot, 1..N = Waste Bins
  label: string;
  x: number;
  y: number;
  fillLevel: number | null; // null for Depot, 0..100 for bins
}

export interface ACOParams {
  ants: number; // m
  iterations: number; // T
  alpha: number; // pheromone weight
  beta: number; // distance weight
  evaporation: number; // rho
  q: number; // pheromone deposit constant Q
  kappa: number; // urgency multiplier
  lambda: number; // priority penalty weight
  distanceScale: number; // km per unit (default 0.2)
  urgencyThreshold: number; // % threshold (default 70)
}

export type AlgorithmKey = 'nn' | 'standard' | 'improved';

export interface IterationSnapshot {
  iteration: number;
  bestCost: number;
  bestDistance: number;
  bestPriority: number;
  bestRoute: number[];
  iterationBestCost: number;
  // Upper-triangle pheromone edges with top intensities for visualization
  topEdges: Array<{ u: number; v: number; strength: number }>;
}

export interface AlgorithmResult {
  key: AlgorithmKey;
  name: string;
  route: number[];
  distance: number; // D(route) in km
  priorityScore: number; // P(route)
  objectiveCost: number; // J(route) = D + lambda * P
  history: IterationSnapshot[];
  elapsedMs: number;
}

export interface BenchmarkSuite {
  nn: AlgorithmResult;
  standard: AlgorithmResult;
  improved: AlgorithmResult;
  nodes: WasteNode[];
  distanceMatrix: number[][];
  urgencies: number[]; // indexed by binId - 1 (or map)
  isReportBaseline: boolean;
}

export interface TrialRunRow {
  trial: number;
  standardDistance: number;
  standardPriority: number;
  standardObjective: number;
  improvedDistance: number;
  improvedPriority: number;
  improvedObjective: number;
}

export interface StatisticalSummary {
  trials: TrialRunRow[];
  standard: {
    meanDistance: number;
    stdDistance: number;
    meanPriority: number;
    meanObjective: number;
  };
  improved: {
    meanDistance: number;
    stdDistance: number;
    meanPriority: number;
    meanObjective: number;
  };
  priorityImprovementPct: number;
  distanceDeltaKm: number;
  distanceDeltaPct: number;
}

export type ScenarioPresetId = 'report42' | 'peakCommercial' | 'eastSideSurge' | 'customRandom';
