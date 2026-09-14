import {
  runConstitutionalIntelligenceCore,
  type ConstitutionalIntelligenceReport,
  type ConstitutionalThresholds,
  type GovernanceSeverity,
  type MinistryName,
} from "./constitutional-intelligence-core";
import {
  runDeterministicContract,
  type CitizenObject,
  type DeterministicOutput,
  type GovernanceArtifacts,
  type LineageState,
  type OrchestrationAction,
  type RegistryState,
  type SystemEvent,
} from "./deterministic-contract";
import type { MunisibleRegistry } from "./munisible-binding";

export type ActivationRouteTarget =
  | "ministries"
  | "municipal-operations"
  | "tokenomics"
  | "citizen-governance"
  | "evidence-integrity"
  | "wellbeing-engines"
  | "federal-filings"
  | "dao-governance"
  | "task-force"
  | "informant-program";

export type ActivationClass =
  | "wellbeing-epoch"
  | "governance-cycle"
  | "constitutional-audit"
  | "lineage-repair"
  | "tokenomic-adjustment"
  | "ministry-directive"
  | "municipal-operation"
  | "citizen-governance"
  | "evidence-integrity"
  | "federal-filing"
  | "dao-governance"
  | "task-force"
  | "informant-program";

export type ActivationSourceAction =
  | OrchestrationAction["action"]
  | "synthetic-municipal-activation"
  | "synthetic-citizen-governance"
  | "synthetic-evidence-integrity"
  | "synthetic-federal-filing"
  | "synthetic-dao-governance"
  | "synthetic-task-force"
  | "synthetic-informant-program";

export type MinistryRegistry = {
  ministry: MinistryName;
  autonomyEnabled: boolean;
  readinessScore: number;
  backlog: number;
  activeDirectives?: number;
};

export type CitizenRegistryEntry = CitizenObject & {
  municipalityId?: string;
  governanceParticipationScore?: number;
  unresolvedEvidenceCount?: number;
  informantEligible?: boolean;
  taskForceEligible?: boolean;
};

export type MunicipalActivationRegistry = MunisibleRegistry & {
  municipalityId: string;
  activeOperations: number;
  activationPressure: number;
  evidenceBacklog?: number;
  wellbeingAlerts?: number;
  federalFilingsDue?: number;
  daoProposalsDue?: number;
};

export type ActivationThresholdSnapshot = {
  triggerThreshold: number;
  sealThreshold: number;
  auditThreshold: number;
  constitutionalScore: number;
  sovereigntyScore: number;
  wellbeingActivationScore: number;
  stabilityActivationScore: number;
  municipalActivationScore: number;
  ministryActivationScore: number;
  citizenGovernanceScore: number;
  tokenomicsActivationScore: number;
  evidenceIntegrityScore: number;
  federalActivationScore: number;
  daoActivationScore: number;
  overallActivationScore: number;
  hasBlockingInvariant: boolean;
};

export type ActivationEvent = {
  id: string;
  type: "AutonomousActivationTriggered";
  domain: "orchestration";
  severity: GovernanceSeverity;
  activationClass: ActivationClass;
  routeTargets: ActivationRouteTarget[];
  reasons: string[];
  sourceActions: ActivationSourceAction[];
  thresholdSnapshot: ActivationThresholdSnapshot;
  lineageNodeId?: string;
  epochId: string | null;
  cycleId: string | null;
  municipalityId?: string;
  ministries: MinistryName[];
  citizenIds: string[];
};

export type AutonomousActivationInput = {
  lineage: LineageState;
  registries: RegistryState;
  governanceArtifacts: GovernanceArtifacts;
  governanceEvents?: SystemEvent[];
  citizens?: CitizenRegistryEntry[];
  ministryRegistries?: MinistryRegistry[];
  municipalRegistries?: MunicipalActivationRegistry[];
  constitutionalRules?: Partial<ConstitutionalThresholds>;
};

export type AutonomousActivationOutput = {
  constitutionalReport: ConstitutionalIntelligenceReport;
  deterministicOutput: DeterministicOutput;
  thresholds: ActivationThresholdSnapshot;
  activationEvents: ActivationEvent[];
};

export function runAutonomousActivationEngine(
  input: AutonomousActivationInput,
): AutonomousActivationOutput {
  const governanceEvents = input.governanceEvents?.length
    ? input.governanceEvents
    : [buildActivationHeartbeat(input.lineage)];
  const constitutionalReport = runConstitutionalIntelligenceCore({
    lineage: input.lineage.nodes,
    registries: input.registries,
    governanceArtifacts: input.governanceArtifacts,
    governanceEvents,
    thresholds: input.constitutionalRules,
  });
  const deterministicOutput = runDeterministicContract({
    lineage: input.lineage,
    registries: input.registries,
    governanceArtifacts: input.governanceArtifacts,
    events: governanceEvents,
    citizens: input.citizens?.map(stripCitizenActivationFields),
    constitutionalRules: input.constitutionalRules,
  });
  const thresholds = computeActivationThresholds(
    constitutionalReport,
    deterministicOutput,
    input.registries,
    input.citizens ?? [],
    input.ministryRegistries ?? [],
    input.municipalRegistries ?? [],
  );
  const activationEvents = emitActivationEvents(
    constitutionalReport,
    deterministicOutput,
    thresholds,
    input.lineage,
    input.citizens ?? [],
    input.ministryRegistries ?? [],
    input.municipalRegistries ?? [],
  );

  return {
    constitutionalReport,
    deterministicOutput,
    thresholds,
    activationEvents,
  };
}

export function computeActivationThresholds(
  constitutionalReport: ConstitutionalIntelligenceReport,
  deterministicOutput: DeterministicOutput,
  registries: RegistryState,
  citizens: CitizenRegistryEntry[],
  ministries: MinistryRegistry[],
  municipalities: MunicipalActivationRegistry[],
): ActivationThresholdSnapshot {
  const constitutionalScore = clamp(
    average([
      constitutionalReport.wellbeingScore,
      constitutionalReport.authorityBalanceScore,
      constitutionalReport.complianceScore,
      constitutionalReport.cycleStabilityScore,
    ]),
  );
  const wellbeingActivationScore = clamp(
    Math.max(
      0,
      (75 - constitutionalReport.wellbeingScore) * 4 +
        registries.traumaIncidents * 20,
    ),
  );
  const stabilityActivationScore = clamp(
    Math.max(
      0,
      (72 - constitutionalReport.cycleStabilityScore) * 6 +
        (100 - constitutionalReport.authorityBalanceScore) * 0.35,
    ),
  );
  const municipalActivationScore = clamp(
    average([
      ...municipalities.map((municipality) =>
        municipality.activationPressure +
        (municipality.evidenceBacklog ?? 0) * 9 +
        (municipality.wellbeingAlerts ?? 0) * 12 +
        (municipality.activeOperations > 0 ? 8 : 0),
      ),
      registries.municipalCompliance ? 35 : 82,
    ]),
  );
  const ministryActivationScore = clamp(
    average([
      ...ministries.map((ministry) =>
        (ministry.autonomyEnabled ? 18 : 45) +
        ministry.backlog * 11 +
        Math.max(0, 100 - ministry.readinessScore) * 0.65 +
        (ministry.activeDirectives ?? 0) * 7,
      ),
      constitutionalReport.ministryRoutes.length * 14,
    ]),
  );
  const citizenGovernanceScore = clamp(
    average([
      ...citizens.map((citizen) =>
        Math.max(0, 100 - (citizen.governanceParticipationScore ?? 100)) * 0.6 +
        Math.max(0, 75 - (citizen.wellbeingScore ?? 75)) * 1.25 +
        (citizen.unresolvedEvidenceCount ?? 0) * 14,
      ),
      registries.traumaIncidents * 20,
    ]),
  );
  const tokenomicsActivationScore = clamp(
    average([
      Math.max(0, 100 - registries.lucr.reserveRatio * 100),
      Math.max(0, registries.lucr.rewardRate * 100),
      Math.max(0, registries.lucr.burnRate * 100),
      Math.max(
        0,
        registries.citizenCount - (registries.previousCitizenCount ?? registries.citizenCount),
      ) * 7,
    ]),
  );
  const evidenceIntegrityScore = clamp(
    average([
      deterministicOutput.invariants.length * 18,
      deterministicOutput.repairs.length * 22,
      constitutionalReport.missingArtifacts.length * 16,
      ...municipalities.map((municipality) => (municipality.evidenceBacklog ?? 0) * 12),
      ...citizens.map((citizen) => (citizen.unresolvedEvidenceCount ?? 0) * 14),
    ]),
  );
  const federalActivationScore = clamp(
    average([
      registries.federalCompliance ? 25 : 88,
      ...municipalities.map((municipality) => (municipality.federalFilingsDue ?? 0) * 18),
      deterministicOutput.actions.some((action) => action.action === "run-constitutional-audit")
        ? 72
        : 30,
    ]),
  );
  const daoActivationScore = clamp(
    average([
      Math.max(0, 100 - registries.authorityBalanceScore),
      ...municipalities.map((municipality) => (municipality.daoProposalsDue ?? 0) * 16),
      constitutionalReport.directives.length * 8,
      deterministicOutput.actions.length * 10,
    ]),
  );
  const sovereigntyScore = constitutionalReport.sovereigntyScore;

  return {
    triggerThreshold: 60,
    sealThreshold: 72,
    auditThreshold: 80,
    constitutionalScore,
    sovereigntyScore,
    wellbeingActivationScore,
    stabilityActivationScore,
    municipalActivationScore,
    ministryActivationScore,
    citizenGovernanceScore,
    tokenomicsActivationScore,
    evidenceIntegrityScore,
    federalActivationScore,
    daoActivationScore,
    overallActivationScore: clamp(
      average([
        constitutionalScore,
        sovereigntyScore,
        wellbeingActivationScore,
        stabilityActivationScore,
        municipalActivationScore,
        ministryActivationScore,
        citizenGovernanceScore,
        tokenomicsActivationScore,
        evidenceIntegrityScore,
        federalActivationScore,
        daoActivationScore,
      ]),
    ),
    hasBlockingInvariant: deterministicOutput.invariants.some(
      (invariant) => invariant.severity === "critical",
    ),
  };
}

function emitActivationEvents(
  constitutionalReport: ConstitutionalIntelligenceReport,
  deterministicOutput: DeterministicOutput,
  thresholds: ActivationThresholdSnapshot,
  lineage: LineageState,
  citizens: CitizenRegistryEntry[],
  ministries: MinistryRegistry[],
  municipalities: MunicipalActivationRegistry[],
): ActivationEvent[] {
  const activationEvents = new Map<ActivationClass, ActivationEvent>();
  const lineageNodeId = resolveActivationLineageNodeId(lineage);
  const primaryMunicipality = selectPrimaryMunicipality(municipalities);
  const atRiskCitizenIds = citizens
    .filter(
      (citizen) =>
        (citizen.wellbeingScore ?? 100) < 75 ||
        (citizen.unresolvedEvidenceCount ?? 0) > 0 ||
        (citizen.governanceParticipationScore ?? 100) < 60,
    )
    .map((citizen) => citizen.id);

  for (const action of deterministicOutput.actions) {
    switch (action.action) {
      case "trigger-wellbeing-epoch":
        upsertActivationEvent(
          activationEvents,
          buildActivationEvent("wellbeing-epoch", {
            severity: action.priority,
            reasons: [action.reason],
            sourceActions: [action.action],
            routeTargets: ["wellbeing-engines", "citizen-governance", "ministries"],
            ministries: ["Health", "Coordination"],
            citizenIds: atRiskCitizenIds,
            lineage,
            lineageNodeId,
            thresholds,
            municipalityId: primaryMunicipality?.municipalityId,
          }),
        );
        break;
      case "trigger-stability-cycle":
        upsertActivationEvent(
          activationEvents,
          buildActivationEvent("governance-cycle", {
            severity: action.priority,
            reasons: [action.reason],
            sourceActions: [action.action],
            routeTargets: ["citizen-governance", "dao-governance", "municipal-operations"],
            ministries: ["Coordination", "Interior"],
            citizenIds: atRiskCitizenIds,
            lineage,
            lineageNodeId,
            thresholds,
            municipalityId: primaryMunicipality?.municipalityId,
          }),
        );
        break;
      case "run-constitutional-audit":
        upsertActivationEvent(
          activationEvents,
          buildActivationEvent("constitutional-audit", {
            severity: action.priority,
            reasons: [action.reason],
            sourceActions: [action.action],
            routeTargets: ["evidence-integrity", "federal-filings", "ministries"],
            ministries: ["Justice", "Archives"],
            citizenIds: [],
            lineage,
            lineageNodeId,
            thresholds,
            municipalityId: primaryMunicipality?.municipalityId,
          }),
        );
        break;
      case "reconstruct-lineage":
        upsertActivationEvent(
          activationEvents,
          buildActivationEvent("lineage-repair", {
            severity: action.priority,
            reasons: [action.reason],
            sourceActions: [action.action],
            routeTargets: ["evidence-integrity", "municipal-operations", "federal-filings"],
            ministries: ["Archives", "Justice"],
            citizenIds: [],
            lineage,
            lineageNodeId,
            thresholds,
            municipalityId: primaryMunicipality?.municipalityId,
          }),
        );
        break;
      case "rebalance-lucr":
        upsertActivationEvent(
          activationEvents,
          buildActivationEvent("tokenomic-adjustment", {
            severity: action.priority,
            reasons: [action.reason],
            sourceActions: [action.action],
            routeTargets: ["tokenomics", "dao-governance", "ministries"],
            ministries: ["Treasury", "Coordination"],
            citizenIds: [],
            lineage,
            lineageNodeId,
            thresholds,
            municipalityId: primaryMunicipality?.municipalityId,
          }),
        );
        break;
      case "authorize-lucr-buy":
      case "authorize-lucr-sell":
      case "authorize-lucr-mint":
      case "authorize-lucr-burn":
        break;
    }
  }

  for (const route of constitutionalReport.ministryRoutes) {
    upsertActivationEvent(
      activationEvents,
      buildActivationEvent("ministry-directive", {
        severity: "medium",
        reasons: [route.reason],
        sourceActions: [],
        routeTargets: ["ministries"],
        ministries: [route.ministry],
        citizenIds: [],
        lineage,
        lineageNodeId,
        thresholds,
        municipalityId: primaryMunicipality?.municipalityId,
      }),
    );
  }

  if (
    primaryMunicipality &&
    thresholds.municipalActivationScore >= thresholds.triggerThreshold
  ) {
    upsertActivationEvent(
      activationEvents,
      buildActivationEvent("municipal-operation", {
        severity: severityFromScore(thresholds.municipalActivationScore),
        reasons: ["Municipal activation pressure crossed the deterministic self-start threshold."],
        sourceActions: ["synthetic-municipal-activation"],
        routeTargets: ["municipal-operations", "ministries"],
        ministries: ["Interior", "Coordination"],
        citizenIds: atRiskCitizenIds,
        lineage,
        lineageNodeId,
        thresholds,
        municipalityId: primaryMunicipality?.municipalityId,
      }),
    );
  }

  if (thresholds.citizenGovernanceScore >= thresholds.triggerThreshold) {
    upsertActivationEvent(
      activationEvents,
      buildActivationEvent("citizen-governance", {
        severity: severityFromScore(thresholds.citizenGovernanceScore),
        reasons: ["Citizen governance pressure crossed the deterministic self-direction threshold."],
        sourceActions: ["synthetic-citizen-governance"],
        routeTargets: ["citizen-governance", "wellbeing-engines", "dao-governance"],
        ministries: ["Coordination", "Health"],
        citizenIds: atRiskCitizenIds,
        lineage,
        lineageNodeId,
        thresholds,
        municipalityId: primaryMunicipality?.municipalityId,
      }),
    );
  }

  if (thresholds.evidenceIntegrityScore >= thresholds.triggerThreshold) {
    upsertActivationEvent(
      activationEvents,
      buildActivationEvent("evidence-integrity", {
        severity: severityFromScore(thresholds.evidenceIntegrityScore),
        reasons: ["Evidence integrity pressure crossed the deterministic audit threshold."],
        sourceActions: ["synthetic-evidence-integrity"],
        routeTargets: ["evidence-integrity", "federal-filings", "ministries"],
        ministries: ["Justice", "Archives"],
        citizenIds: [],
        lineage,
        lineageNodeId,
        thresholds,
        municipalityId: primaryMunicipality?.municipalityId,
      }),
    );
  }

  if (thresholds.federalActivationScore >= thresholds.triggerThreshold) {
    upsertActivationEvent(
      activationEvents,
      buildActivationEvent("federal-filing", {
        severity: severityFromScore(thresholds.federalActivationScore),
        reasons: ["Federal filing pressure crossed the deterministic governance threshold."],
        sourceActions: ["synthetic-federal-filing"],
        routeTargets: ["federal-filings", "ministries"],
        ministries: ["Justice", "Archives"],
        citizenIds: [],
        lineage,
        lineageNodeId,
        thresholds,
        municipalityId: primaryMunicipality?.municipalityId,
      }),
    );
  }

  if (thresholds.daoActivationScore >= thresholds.triggerThreshold) {
    upsertActivationEvent(
      activationEvents,
      buildActivationEvent("dao-governance", {
        severity: severityFromScore(thresholds.daoActivationScore),
        reasons: ["DAO governance pressure crossed the deterministic self-governance threshold."],
        sourceActions: ["synthetic-dao-governance"],
        routeTargets: ["dao-governance", "tokenomics", "citizen-governance"],
        ministries: ["Coordination", "Treasury"],
        citizenIds: atRiskCitizenIds,
        lineage,
        lineageNodeId,
        thresholds,
        municipalityId: primaryMunicipality?.municipalityId,
      }),
    );
  }

  if (
    primaryMunicipality &&
    citizens.some((citizen) => citizen.taskForceEligible) &&
    thresholds.municipalActivationScore >= thresholds.triggerThreshold
  ) {
    upsertActivationEvent(
      activationEvents,
      buildActivationEvent("task-force", {
        severity: severityFromScore(thresholds.municipalActivationScore),
        reasons: ["Task-force eligibility and municipal pressure require autonomous field activation."],
        sourceActions: ["synthetic-task-force"],
        routeTargets: ["task-force", "municipal-operations", "evidence-integrity"],
        ministries: ["Interior", "Justice"],
        citizenIds: citizens.filter((citizen) => citizen.taskForceEligible).map((citizen) => citizen.id),
        lineage,
        lineageNodeId,
        thresholds,
        municipalityId: primaryMunicipality?.municipalityId,
      }),
    );
  }

  if (
    primaryMunicipality &&
    citizens.some((citizen) => citizen.informantEligible) &&
    thresholds.evidenceIntegrityScore >= thresholds.triggerThreshold
  ) {
    upsertActivationEvent(
      activationEvents,
      buildActivationEvent("informant-program", {
        severity: severityFromScore(thresholds.evidenceIntegrityScore),
        reasons: ["Informant eligibility and evidence pressure require autonomous witness activation."],
        sourceActions: ["synthetic-informant-program"],
        routeTargets: ["informant-program", "evidence-integrity", "municipal-operations"],
        ministries: ["Justice", "Interior"],
        citizenIds: citizens.filter((citizen) => citizen.informantEligible).map((citizen) => citizen.id),
        lineage,
        lineageNodeId,
        thresholds,
        municipalityId: primaryMunicipality?.municipalityId,
      }),
    );
  }

  return [...activationEvents.values()].sort(
    (left, right) => severityRank(left.severity) - severityRank(right.severity),
  );
}

function buildActivationEvent(
  activationClass: ActivationClass,
  input: {
    severity: GovernanceSeverity;
    reasons: string[];
    sourceActions: ActivationSourceAction[];
    routeTargets: ActivationRouteTarget[];
    ministries: MinistryName[];
    citizenIds: string[];
    lineage: LineageState;
    lineageNodeId?: string;
    thresholds: ActivationThresholdSnapshot;
    municipalityId?: string;
  },
): ActivationEvent {
  return {
    id: `activation-${activationClass}-${(input.lineage.activeCycleId ?? input.lineage.activeEpochId ?? "root").toLowerCase()}`,
    type: "AutonomousActivationTriggered",
    domain: "orchestration",
    severity: input.severity,
    activationClass,
    routeTargets: distinct(input.routeTargets),
    reasons: distinct(input.reasons),
    sourceActions: distinct(input.sourceActions),
    thresholdSnapshot: input.thresholds,
    lineageNodeId: input.lineageNodeId,
    epochId: input.lineage.activeEpochId,
    cycleId: input.lineage.activeCycleId,
    municipalityId: input.municipalityId,
    ministries: distinct(input.ministries),
    citizenIds: distinct(input.citizenIds),
  };
}

function upsertActivationEvent(
  activationEvents: Map<ActivationClass, ActivationEvent>,
  candidate: ActivationEvent,
): void {
  const existing = activationEvents.get(candidate.activationClass);
  if (!existing) {
    activationEvents.set(candidate.activationClass, candidate);
    return;
  }

  activationEvents.set(candidate.activationClass, {
    ...existing,
    severity:
      severityRank(candidate.severity) < severityRank(existing.severity)
        ? candidate.severity
        : existing.severity,
    routeTargets: distinct([...existing.routeTargets, ...candidate.routeTargets]),
    reasons: distinct([...existing.reasons, ...candidate.reasons]),
    sourceActions: distinct([...existing.sourceActions, ...candidate.sourceActions]),
    ministries: distinct([...existing.ministries, ...candidate.ministries]),
    citizenIds: distinct([...existing.citizenIds, ...candidate.citizenIds]),
    municipalityId: existing.municipalityId ?? candidate.municipalityId,
  });
}

function stripCitizenActivationFields(citizen: CitizenRegistryEntry): CitizenObject {
  return {
    id: citizen.id,
    wellbeingScore: citizen.wellbeingScore,
    authorityWeight: citizen.authorityWeight,
    assignedMinistry: citizen.assignedMinistry,
  };
}

function buildActivationHeartbeat(lineage: LineageState): SystemEvent {
  return {
    id: `activation-heartbeat-${lineage.activeCycleId ?? lineage.activeEpochId ?? "root"}`,
    type: "autonomous-activation-heartbeat",
    domain: "orchestration",
    severity: "low",
    resolved: false,
  };
}

function resolveActivationLineageNodeId(lineage: LineageState): string | undefined {
  if (lineage.activeCycleId) {
    return lineage.nodes.find((node) => node.cycleId === lineage.activeCycleId)?.id;
  }

  if (lineage.activeEpochId) {
    return lineage.nodes.find((node) => node.epochId === lineage.activeEpochId)?.id;
  }

  return lineage.nodes[0]?.id;
}

function selectPrimaryMunicipality(
  municipalities: MunicipalActivationRegistry[],
): MunicipalActivationRegistry | undefined {
  return municipalities
    .slice()
    .sort(
      (left, right) =>
        right.activationPressure +
          (right.evidenceBacklog ?? 0) * 10 +
          (right.wellbeingAlerts ?? 0) * 12 -
        (left.activationPressure +
          (left.evidenceBacklog ?? 0) * 10 +
          (left.wellbeingAlerts ?? 0) * 12),
    )[0];
}

function severityFromScore(score: number): GovernanceSeverity {
  if (score >= 85) {
    return "critical";
  }
  if (score >= 72) {
    return "high";
  }
  if (score >= 60) {
    return "medium";
  }
  return "low";
}

function average(values: number[]): number {
  const usableValues = values.filter((value) => Number.isFinite(value));
  if (usableValues.length === 0) {
    return 0;
  }

  return usableValues.reduce((sum, value) => sum + value, 0) / usableValues.length;
}

function clamp(value: number, minimum = 0, maximum = 100): number {
  return Math.max(minimum, Math.min(maximum, roundToFour(value)));
}

function roundToFour(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function distinct<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function severityRank(severity: GovernanceSeverity): number {
  switch (severity) {
    case "critical":
      return 0;
    case "high":
      return 1;
    case "medium":
      return 2;
    case "low":
      return 3;
  }
}
