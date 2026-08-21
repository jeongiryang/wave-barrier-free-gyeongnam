export type FieldImpactLevel = "high_risk" | "caution" | "clear" | "unknown";
export type FieldElementState = "detected" | "not_visible";
export type FieldImageQuality = "usable" | "too_dark" | "too_blurry" | "unrelated" | "unknown";

export type FieldElement = {
  type: string;
  label: string;
  barrier: boolean;
  detected: boolean;
  state: FieldElementState;
  severity: "low" | "medium" | "high" | "unknown";
  confidence: number | null;
  description: string;
};

export type FieldObstacle = {
  type: string;
  label: string;
  estimated: boolean;
  measurement: null;
  measurementNote: string;
  description: string;
};

export type FieldUserImpact = { level: FieldImpactLevel; label: string; reasons: string[] };

export type FieldAnalysis = {
  source: "vlm_analysis";
  model: string;
  analyzedAt: string;
  imageQuality: FieldImageQuality;
  retakeGuidance: string;
  sceneDescription: string;
  elements: FieldElement[];
  obstacles: FieldObstacle[];
  userTypeImpacts: Record<string, FieldUserImpact>;
  overallConfidence: number | null;
  requiresHumanVerification: boolean;
  usable: boolean;
};

export type FieldScanConflict = { element: string; label: string; message: string };
export type FieldScanGuidance = FieldUserImpact & { profile: string };

export type FieldScanResponse = {
  scanId: string | null;
  stored: boolean;
  analysis: FieldAnalysis;
  retakeGuidance?: string;
  officialData?: { source: "official_api"; name: string; provider: string; features: string[]; details: string[]; knownFields: number; unknownFields: number };
  conflicts?: FieldScanConflict[];
  guidance?: FieldScanGuidance[];
};

export type FieldScanState = "idle" | "preparing" | "analyzing" | "done" | "retake" | "error";
