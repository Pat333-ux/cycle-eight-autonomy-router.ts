export type GovernanceDomain =
  | "constitution"
  | "compliance"
  | "wellbeing"
  | "lineage"
  | "tokenomics"
  | "orchestration"
  | "ministry";

export type GovernanceSeverity = "low" | "medium" | "high" | "critical";

export type LineageStatus =
  | "bootstrap"
  | "harmonized"
  | "sealed"
  | "finalized";

export type ArtifactStatus = "present" | "missing" | "stale";

export type MinistryName =
  | "Treasury"
  | "Health"
  | "Justice"
  | "Interior"
  | "Coordination"
  | "Archives";

export interface LineageNode {
  id: string;
  hash?: string;
  parentId?: string;
  parentHash?: string;
  expectedParentHash?: string;
  status: LineageStatus;
  epochId?: string;
  cycleId?: string;
}

export interface GovernanceArtifact {
  id: string;
  type: string;
  status: ArtifactStatus;
  required: boolean;
  linkedNodeId?: string;
}

export interface GovernanceEvent {
  id: string;
  type: string;
  domain: GovernanceDomain;
  severity: GovernanceSeverity;
  resolved?: boolean;
}

export interface LucrTokenomicsState {
  circulatingSupply: number;
  reserveRatio: number;
  rewardRate: number;
  burnRate: number;
}

export interface RegistrySnapshot {
  citizenCount: number;
  previousCitizenCount?: number;
  wellbeingScore: number;
  authorityBalanceScore: number;
  cycleStabilityScore: number;
  complianceScore: number;
  municipalCompliance: boolean;
  federalCompliance: boolean;
  traumaIncidents: number;
  lineageIntegrityScore?: number;
  lucr: LucrTokenomicsState;
}

export interface ConstitutionalThresholds {
  minimumWellbeingScore: number;
  minimumAuthorityBalanceScore: number;
  minimumCycleStabilityScore: number;
  minimumComplianceScore: number;
  minimumReserveRatio: number;
  criticalTraumaIncidents: number;
}

export interface ConstitutionalIntelligenceInput {
  lineage: LineageNode[];
  registries: RegistrySnapshot;
  governanceArtifacts: GovernanceArtifact[];
  governanceEvents: GovernanceEvent[];
  thresholds?: Partial<ConstitutionalThresholds>;
}

export interface ConstitutionalViolation {
  code: string;
  domain: GovernanceDomain;
  severity: GovernanceSeverity;
  message: string;
}

export type GovernanceAction =
  | "run-constitutional-audit"
  | "trigger-stability-cycle"
  | "trigger-wellbeing-epoch"
  | "reconstruct-lineage"
  | "rebalance-lucr";

export interface PredictedAction {
  action: GovernanceAction;
  reason: string;
  priority: GovernanceSeverity;
}

export interface MissingArtifact {
  nodeId: string;
  artifactType: string;
}

export interface LineageRepair {
  nodeId: string;
  reason: string;
}

export interface TokenomicsDirective {
  reserveRatio: number;
  rewardRate: number;
  burnRate: number;
  reason: string;
}

export interface MinistryRoute {
  ministry: MinistryName;
  reason: string;
}

export interface AutonomousDirective {
  kind:
    | "trigger-epoch"
    | "trigger-cycle"
    | "run-audit"
    | "rebalance-tokenomics"
    | "repair-lineage"
    | "generate-artifact"
    | "route-ministry";
  priority: GovernanceSeverity;
  payload: Record<string, string | number | boolean>;
}

export interface ConstitutionalIntelligenceReport {
  sovereigntyScore: number;
  wellbeingScore: number;
  authorityBalanceScore: number;
  complianceScore: number;
  cycleStabilityScore: number;
  detectedViolations: ConstitutionalViolation[];
  predictedActions: PredictedAction[];
  missingArtifacts: MissingArtifact[];
  lineageRepairs: LineageRepair[];
  ministryRoutes: MinistryRoute[];
  tokenomicsDirective: TokenomicsDirective;
  directives: AutonomousDirective[];
}

const defaultThresholds: ConstitutionalThresholds = {
  minimumWellbeingScore: 75,
  minimumAuthorityBalanceScore: 70,
  minimumCycleStabilityScore: 72,
  minimumComplianceScore: 80,
  minimumReserveRatio: 0.2,
  criticalTraumaIncidents: 1,
};

const requiredArtifactsByStatus: Record<LineageStatus, string[]> = {
  bootstrap: ["bootstrap-record"],
  harmonized: ["bootstrap-record", "harmonization-report"],
  sealed: ["bootstrap-record", "harmonization-report", "seal-manifest"],
  finalized: [
    "bootstrap-record",
    "harmonization-report",
    "seal-manifest",
    "quantum-proof",
    "cycle-report",
  ],
};

const ministryByDomain: Record<GovernanceDomain, MinistryName> = {
  constitution: "Justice",
  compliance: "Interior",
  wellbeing: "Health",
  lineage: "Archives",
  tokenomics: "Treasury",
  orchestration: "Coordination",
  ministry: "Coordination",
};

const ministryByAction: Record<GovernanceAction, MinistryName> = {
  "run-constitutional-audit": "Justice",
  "trigger-stability-cycle": "Coordination",
  "trigger-wellbeing-epoch": "Coordination",
  "reconstruct-lineage": "Archives",
  "rebalance-lucr": "Treasury",
};

const directiveKindByAction: Record<
  GovernanceAction,
  AutonomousDirective["kind"]
> = {
  "run-constitutional-audit": "run-audit",
  "trigger-stability-cycle": "trigger-cycle",
  "trigger-wellbeing-epoch": "trigger-epoch",
  "reconstruct-lineage": "repair-lineage",
  "rebalance-lucr": "rebalance-tokenomics",
};

const citizenGrowthRewardFactor = 0.001;
const maximumCitizenGrowthReward = 0.02;
const stabilityReserveAdjustment = 0.02;
const wellbeingReserveAdjustment = 0.01;

export function runConstitutionalIntelligenceCore(
  input: ConstitutionalIntelligenceInput,
): ConstitutionalIntelligenceReport {
  const thresholds = { ...defaultThresholds, ...input.thresholds };
  const missingArtifacts = findMissingArtifacts(
    input.lineage,
    input.governanceArtifacts,
  );
  const lineageRepairs = detectBrokenLineage(input.lineage);
  const detectedViolations = [
    ...evaluateRegistryViolations(input.registries, thresholds),
    ...evaluateGovernanceEvents(input.governanceEvents),
    ...missingArtifacts.map<ConstitutionalViolation>((artifact) => ({
      code: "MISSING_ARTIFACT",
      domain: "lineage",
      severity: "high",
      message: `Missing ${artifact.artifactType} for lineage node ${artifact.nodeId}.`,
    })),
    ...lineageRepairs.map<ConstitutionalViolation>((repair) => ({
      code: "BROKEN_LINEAGE",
      domain: "lineage",
      severity: "critical",
      message: repair.reason,
    })),
  ];

  const predictedActions = predictGovernanceActions(
    input.registries,
    detectedViolations,
    missingArtifacts,
    lineageRepairs,
    thresholds,
  );
  const ministryRoutes = routeMinistries(detectedViolations, predictedActions);
  const tokenomicsDirective = rebalanceTokenomics(input.registries, thresholds);
  const directives = buildDirectives(
    predictedActions,
    missingArtifacts,
    lineageRepairs,
    ministryRoutes,
    tokenomicsDirective,
  );

  return {
    sovereigntyScore: calculateSovereigntyScore(
      input.registries,
      detectedViolations,
      lineageRepairs,
    ),
    wellbeingScore: normalizeScore(input.registries.wellbeingScore),
    authorityBalanceScore: normalizeScore(
      input.registries.authorityBalanceScore,
    ),
    complianceScore: normalizeScore(input.registries.complianceScore),
    cycleStabilityScore: normalizeScore(input.registries.cycleStabilityScore),
    detectedViolations,
    predictedActions,
    missingArtifacts,
    lineageRepairs,
    ministryRoutes,
    tokenomicsDirective,
    directives,
  };
}

export function findMissingArtifacts(
  lineage: LineageNode[],
  artifacts: GovernanceArtifact[],
): MissingArtifact[] {
  const available = new Set(
    artifacts
      .filter((artifact) => artifact.status === "present")
      .map((artifact) => `${artifact.linkedNodeId ?? ""}:${artifact.type}`),
  );
  const inferredMissing = lineage.flatMap((node) =>
    requiredArtifactsByStatus[node.status]
      .filter((artifactType) => !available.has(`${node.id}:${artifactType}`))
      .map((artifactType) => ({ nodeId: node.id, artifactType })),
  );
  const explicitMissing = artifacts
    .filter((artifact) => artifact.required && artifact.status !== "present")
    .map((artifact) => ({
      nodeId: artifact.linkedNodeId ?? `artifact:${artifact.id}`,
      artifactType: artifact.type,
    }));

  return dedupeMissingArtifacts([...inferredMissing, ...explicitMissing]);
}

export function detectBrokenLineage(lineage: LineageNode[]): LineageRepair[] {
  const lineageById = new Map(lineage.map((node) => [node.id, node]));

  return lineage.flatMap((node) => {
    const repairs: LineageRepair[] = [];

    if (!node.hash) {
      repairs.push({
        nodeId: node.id,
        reason: `Lineage node ${node.id} is missing its deterministic hash.`,
      });
    }

    if (!node.parentId) {
      return repairs;
    }

    const parent = lineageById.get(node.parentId);
    if (!parent) {
      repairs.push({
        nodeId: node.id,
        reason: `Lineage node ${node.id} references missing parent ${node.parentId}.`,
      });
      return repairs;
    }

    if (!parent.hash) {
      repairs.push({
        nodeId: node.id,
        reason: `Parent lineage node ${parent.id} is missing its deterministic hash.`,
      });
    }

    const expectedHashMismatch =
      Boolean(node.expectedParentHash) &&
      parent.hash !== node.expectedParentHash;
    const storedHashMismatch =
      Boolean(node.parentHash) && node.parentHash !== parent.hash;

    if (parent.hash && (expectedHashMismatch || storedHashMismatch)) {
      repairs.push({
        nodeId: node.id,
        reason: `Lineage node ${node.id} has inconsistent parent hash data for ${parent.id}.`,
      });
    }

    return repairs;
  });
}

export function evaluateRegistryViolations(
  registries: RegistrySnapshot,
  thresholds: ConstitutionalThresholds,
): ConstitutionalViolation[] {
  const violations: ConstitutionalViolation[] = [];

  if (registries.wellbeingScore < thresholds.minimumWellbeingScore) {
    violations.push({
      code: "LOW_WELLBEING",
      domain: "wellbeing",
      severity: "critical",
      message: "Wellbeing score fell below the constitutional floor.",
    });
  }

  if (
    registries.traumaIncidents >= thresholds.criticalTraumaIncidents &&
    registries.traumaIncidents > 0
  ) {
    violations.push({
      code: "TRAUMA_PREVENTION_BREACH",
      domain: "wellbeing",
      severity: "critical",
      message: "Trauma prevention incident threshold has been breached.",
    });
  }

  if (
    registries.authorityBalanceScore <
    thresholds.minimumAuthorityBalanceScore
  ) {
    violations.push({
      code: "AUTHORITY_IMBALANCE",
      domain: "constitution",
      severity: "high",
      message: "Authority balance is outside constitutional tolerance.",
    });
  }

  if (registries.cycleStabilityScore < thresholds.minimumCycleStabilityScore) {
    violations.push({
      code: "CYCLE_INSTABILITY",
      domain: "orchestration",
      severity: "high",
      message: "Cycle stability indicates proactive intervention is required.",
    });
  }

  if (registries.complianceScore < thresholds.minimumComplianceScore) {
    violations.push({
      code: "COMPLIANCE_SCORE_BREACH",
      domain: "compliance",
      severity: "critical",
      message: "Compliance score is below the constitutional minimum.",
    });
  }

  if (!registries.municipalCompliance || !registries.federalCompliance) {
    violations.push({
      code: "JURISDICTIONAL_NON_COMPLIANCE",
      domain: "compliance",
      severity: "critical",
      message: "Municipal or federal compliance protections are not satisfied.",
    });
  }

  if (registries.lucr.reserveRatio < thresholds.minimumReserveRatio) {
    violations.push({
      code: "LOW_LUCR_RESERVE",
      domain: "tokenomics",
      severity: "high",
      message: "LUCR reserve ratio is below the constitutional minimum.",
    });
  }

  return violations;
}

export function evaluateGovernanceEvents(
  events: GovernanceEvent[],
): ConstitutionalViolation[] {
  return events
    .filter((event) => !event.resolved && isMaterialSeverity(event.severity))
    .map((event) => ({
      code: `EVENT_${event.type.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`,
      domain: event.domain,
      severity: event.severity,
      message: `Unresolved governance event ${event.id} requires constitutional response.`,
    }));
}

export function predictGovernanceActions(
  registries: RegistrySnapshot,
  violations: ConstitutionalViolation[],
  missingArtifacts: MissingArtifact[],
  lineageRepairs: LineageRepair[],
  thresholds: ConstitutionalThresholds,
): PredictedAction[] {
  const actions: PredictedAction[] = [];
  const hasCriticalViolation = violations.some(
    (violation) => violation.severity === "critical",
  );

  if (hasCriticalViolation || registries.complianceScore < thresholds.minimumComplianceScore) {
    actions.push({
      action: "run-constitutional-audit",
      reason: "Critical constitutional or compliance signals require immediate audit.",
      priority: "critical",
    });
  }

  if (registries.cycleStabilityScore < thresholds.minimumCycleStabilityScore) {
    actions.push({
      action: "trigger-stability-cycle",
      reason: "Cycle stability is below the deterministic threshold.",
      priority: "high",
    });
  }

  if (
    registries.wellbeingScore < thresholds.minimumWellbeingScore ||
    registries.traumaIncidents > 0
  ) {
    actions.push({
      action: "trigger-wellbeing-epoch",
      reason: "Wellbeing rules require a proactive protection epoch.",
      priority: "critical",
    });
  }

  if (missingArtifacts.length > 0 || lineageRepairs.length > 0) {
    actions.push({
      action: "reconstruct-lineage",
      reason: "Lineage integrity requires artifact regeneration or hash repair.",
      priority: "critical",
    });
  }

  if (hasTokenomicsAdjustment(registries, thresholds)) {
    actions.push({
      action: "rebalance-lucr",
      reason: "LUCR parameters require proactive constitutional rebalancing.",
      priority: "medium",
    });
  }

  return dedupeActions(actions);
}

export function rebalanceTokenomics(
  registries: RegistrySnapshot,
  thresholds: ConstitutionalThresholds,
): TokenomicsDirective {
  const citizenGrowth = Math.max(
    0,
    registries.citizenCount -
      (registries.previousCitizenCount ?? registries.citizenCount),
  );
  const stabilityPressure =
    registries.cycleStabilityScore < thresholds.minimumCycleStabilityScore
      ? stabilityReserveAdjustment
      : 0;
  const wellbeingPressure =
    registries.wellbeingScore < thresholds.minimumWellbeingScore
      ? wellbeingReserveAdjustment
      : 0;
  const growthReward =
    citizenGrowth > 0
      ? Math.min(
          citizenGrowth * citizenGrowthRewardFactor,
          maximumCitizenGrowthReward,
        )
      : 0;

  return {
    reserveRatio: roundToFour(
      Math.max(
        thresholds.minimumReserveRatio,
        registries.lucr.reserveRatio + stabilityPressure + wellbeingPressure,
      ),
    ),
    rewardRate: roundToFour(
      Math.max(0, registries.lucr.rewardRate + growthReward - wellbeingPressure),
    ),
    burnRate: roundToFour(
      Math.max(0, registries.lucr.burnRate + stabilityPressure),
    ),
    reason:
      citizenGrowth > 0
        ? "Citizen growth and constitutional stability signals require updated LUCR parameters."
        : "Constitutional safeguards maintain LUCR reserves under current system conditions.",
  };
}

export function routeMinistries(
  violations: ConstitutionalViolation[],
  actions: PredictedAction[],
): MinistryRoute[] {
  const routes = new Map<MinistryName, MinistryRoute>();

  for (const violation of violations) {
    const ministry = ministryByDomain[violation.domain];
    routes.set(ministry, {
      ministry,
      reason: violation.message,
    });
  }

  for (const action of actions) {
    const ministry = ministryByAction[action.action];
    routes.set(ministry, {
      ministry,
      reason: action.reason,
    });
  }

  return [...routes.values()];
}

export function buildDirectives(
  actions: PredictedAction[],
  missingArtifacts: MissingArtifact[],
  lineageRepairs: LineageRepair[],
  ministryRoutes: MinistryRoute[],
  tokenomicsDirective: TokenomicsDirective,
): AutonomousDirective[] {
  const actionDirectives = actions
    .filter((action) => action.action !== "rebalance-lucr")
    .map<AutonomousDirective>((action) => ({
      kind: directiveKindByAction[action.action],
      priority: action.priority,
      payload: {
        action: action.action,
        reason: action.reason,
      },
    }));

  const artifactDirectives = missingArtifacts.map<AutonomousDirective>((artifact) => ({
    kind: "generate-artifact",
    priority: "high",
    payload: {
      nodeId: artifact.nodeId,
      artifactType: artifact.artifactType,
    },
  }));

  const repairDirectives = lineageRepairs.map<AutonomousDirective>((repair) => ({
    kind: "repair-lineage",
    priority: "critical",
    payload: {
      nodeId: repair.nodeId,
      reason: repair.reason,
    },
  }));

  const ministryDirectives = ministryRoutes.map<AutonomousDirective>((route) => ({
    kind: "route-ministry",
    priority: "medium",
    payload: {
      ministry: route.ministry,
      reason: route.reason,
    },
  }));

  const shouldEmitTokenomicsDirective = actions.some(
    (action) => action.action === "rebalance-lucr",
  );

  return sortDirectives([
    ...actionDirectives,
    ...artifactDirectives,
    ...repairDirectives,
    ...ministryDirectives,
    ...(shouldEmitTokenomicsDirective
      ? [
          {
            kind: "rebalance-tokenomics" as const,
            priority: "medium" as const,
            payload: {
              action: "rebalance-lucr",
              reserveRatio: tokenomicsDirective.reserveRatio,
              rewardRate: tokenomicsDirective.rewardRate,
              burnRate: tokenomicsDirective.burnRate,
              reason: tokenomicsDirective.reason,
            },
          },
        ]
      : []),
  ]);
}

export function calculateSovereigntyScore(
  registries: RegistrySnapshot,
  violations: ConstitutionalViolation[],
  lineageRepairs: LineageRepair[],
): number {
  const baseScore =
    registries.wellbeingScore * 0.3 +
    registries.authorityBalanceScore * 0.2 +
    registries.complianceScore * 0.3 +
    registries.cycleStabilityScore * 0.2;
  const violationPenalty = violations.reduce(
    (penalty, violation) => penalty + severityPenalty(violation.severity),
    0,
  );
  const lineagePenalty = lineageRepairs.length * 4;

  return normalizeScore(baseScore - violationPenalty - lineagePenalty);
}

function dedupeActions(actions: PredictedAction[]): PredictedAction[] {
  const seen = new Set<string>();

  return actions.filter((action) => {
    if (seen.has(action.action)) {
      return false;
    }

    seen.add(action.action);
    return true;
  });
}

function hasTokenomicsAdjustment(
  registries: RegistrySnapshot,
  thresholds: ConstitutionalThresholds,
): boolean {
  const directive = rebalanceTokenomics(registries, thresholds);

  return (
    registries.lucr.reserveRatio !== directive.reserveRatio ||
    registries.lucr.rewardRate !== directive.rewardRate ||
    registries.lucr.burnRate !== directive.burnRate
  );
}

function dedupeMissingArtifacts(
  artifacts: MissingArtifact[],
): MissingArtifact[] {
  const seen = new Set<string>();

  return artifacts.filter((artifact) => {
    const key = `${artifact.nodeId}:${artifact.artifactType}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function sortDirectives(
  directives: AutonomousDirective[],
): AutonomousDirective[] {
  const priorityOrder: Record<GovernanceSeverity, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  return [...directives].sort(
    (left, right) => priorityOrder[left.priority] - priorityOrder[right.priority],
  );
}

function severityPenalty(severity: GovernanceSeverity): number {
  switch (severity) {
    case "critical":
      return 12;
    case "high":
      return 8;
    case "medium":
      return 4;
    case "low":
      return 1;
  }
}

function isMaterialSeverity(severity: GovernanceSeverity): boolean {
  return severity === "medium" || severity === "high" || severity === "critical";
}

function normalizeScore(value: number): number {
  return Math.max(0, Math.min(100, roundToTwo(value)));
}

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundToFour(value: number): number {
  return Math.round(value * 10000) / 10000;
}
