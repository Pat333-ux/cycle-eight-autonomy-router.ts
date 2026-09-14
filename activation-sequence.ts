import type { GovernanceSeverity } from "./constitutional-intelligence-core";
import type { GovernanceArtifacts, LineageState } from "./deterministic-contract";
import type { ActivationEvent } from "./autonomous-activation-engine";

export type ActivationCondition = {
  code: string;
  satisfied: boolean;
  reason: string;
  severity: GovernanceSeverity;
};

export type ActivationLineage = {
  activationId: string;
  linkedNodeId?: string;
  epochId: string | null;
  cycleId: string | null;
  parentActivationId?: string;
};

export type ActivationArtifact = {
  id: string;
  type: string;
  status: "present" | "missing";
  required: boolean;
  linkedNodeId?: string;
};

export type ActivationSeal = {
  sealId: string;
  sealHash: string;
  inputs: string[];
};

export type ActivationQuantumDeterminism = {
  proofId: string;
  proofHash: string;
  reproducible: boolean;
};

export type ActivationStage = {
  stage:
    | "activation-conditions"
    | "activation-lineage"
    | "activation-artifacts"
    | "activation-seal"
    | "activation-quantum-determinism"
    | "activation-finalization";
  completed: boolean;
  reason: string;
};

export type ActivationSequence = {
  event: ActivationEvent;
  conditions: ActivationCondition[];
  lineage: ActivationLineage;
  artifacts: ActivationArtifact[];
  seal: ActivationSeal;
  quantumDeterminism: ActivationQuantumDeterminism;
  stages: ActivationStage[];
  finalized: boolean;
  finalizationReason: string;
};

export function buildActivationSequence(input: {
  event: ActivationEvent;
  lineage: LineageState;
  governanceArtifacts: GovernanceArtifacts;
}): ActivationSequence {
  const linkedNodeId = input.event.lineageNodeId ?? resolveLinkedNodeId(input.lineage);
  const lineage = buildActivationLineage(input.event, linkedNodeId);
  const conditions = buildActivationConditions(input.event, linkedNodeId);
  const finalizable =
    conditions.every((condition) => condition.satisfied) || isProtectiveActivation(input.event);
  const seal = buildActivationSeal(input.event, lineage, conditions);
  const quantumDeterminism = buildActivationQuantumDeterminism(
    input.event,
    seal,
    input.governanceArtifacts,
    finalizable,
  );
  const artifacts = buildActivationArtifacts(
    input.event,
    linkedNodeId,
    seal,
    quantumDeterminism,
    finalizable,
  );
  const stages = buildActivationStages(conditions, linkedNodeId, artifacts, quantumDeterminism, finalizable);

  return {
    event: input.event,
    conditions,
    lineage,
    artifacts,
    seal,
    quantumDeterminism,
    stages,
    finalized: finalizable,
    finalizationReason: finalizable
      ? "Activation satisfied deterministic sequencing rules and sealed its lineage."
      : "Activation remains unsealed until readiness, lineage, and routing conditions all resolve.",
  };
}

function buildActivationConditions(
  event: ActivationEvent,
  linkedNodeId?: string,
): ActivationCondition[] {
  const isProtective = isProtectiveActivation(event);

  return [
    {
      code: "ACTIVATION_TRIGGER_THRESHOLD",
      satisfied:
        event.thresholdSnapshot.overallActivationScore >=
          event.thresholdSnapshot.triggerThreshold || event.severity === "critical",
      reason: "Activation must cross the deterministic self-trigger threshold or be critical.",
      severity: "high",
    },
    {
      code: "CONSTITUTIONAL_CONTINUITY",
      satisfied:
        !event.thresholdSnapshot.hasBlockingInvariant ||
        isProtective ||
        event.thresholdSnapshot.evidenceIntegrityScore >= event.thresholdSnapshot.auditThreshold,
      reason: "Activation must preserve constitutional continuity or fall back into protective audit routing.",
      severity: "critical",
    },
    {
      code: "SOVEREIGNTY_SEAL_THRESHOLD",
      satisfied:
        event.thresholdSnapshot.sovereigntyScore >= 45 ||
        event.thresholdSnapshot.constitutionalScore >= 45 ||
        isProtective,
      reason: "Activation seals require minimum sovereign coherence unless the event is protective.",
      severity: "high",
    },
    {
      code: "LINEAGE_BINDING",
      satisfied: Boolean(linkedNodeId),
      reason: "Activation must bind to an epoch or cycle lineage node before finalization.",
      severity: "critical",
    },
    {
      code: "ROUTE_TARGET_RESOLUTION",
      satisfied: event.routeTargets.length > 0,
      reason: "Activation must resolve at least one sovereign route target.",
      severity: "high",
    },
    {
      code: "MUNICIPAL_CONTEXT_READY",
      satisfied:
        !requiresMunicipalContext(event) || Boolean(event.municipalityId) || isProtective,
      reason: "Municipal, task-force, and informant activations require municipal context unless the event is protective.",
      severity: "medium",
    },
  ];
}

function buildActivationLineage(
  event: ActivationEvent,
  linkedNodeId?: string,
): ActivationLineage {
  return {
    activationId: event.id,
    linkedNodeId,
    epochId: event.epochId,
    cycleId: event.cycleId,
    parentActivationId: event.cycleId
      ? `activation-parent-${event.cycleId.toLowerCase()}`
      : event.epochId
        ? `activation-parent-${event.epochId.toLowerCase()}`
        : undefined,
  };
}

function buildActivationArtifacts(
  event: ActivationEvent,
  linkedNodeId: string | undefined,
  seal: ActivationSeal,
  quantumDeterminism: ActivationQuantumDeterminism,
  finalized: boolean,
): ActivationArtifact[] {
  return [
    {
      id: `${event.id}-conditions`,
      type: "activation-condition-record",
      status: "present",
      required: true,
      linkedNodeId,
    },
    {
      id: `${event.id}-lineage`,
      type: "activation-lineage-record",
      status: linkedNodeId ? "present" : "missing",
      required: true,
      linkedNodeId,
    },
    {
      id: seal.sealId,
      type: "activation-seal",
      status: finalized ? "present" : "missing",
      required: true,
      linkedNodeId,
    },
    {
      id: quantumDeterminism.proofId,
      type: "activation-quantum-proof",
      status: finalized ? "present" : "missing",
      required: true,
      linkedNodeId,
    },
    {
      id: `${event.id}-finalization`,
      type: "activation-finalization-record",
      status: finalized ? "present" : "missing",
      required: true,
      linkedNodeId,
    },
  ];
}

function buildActivationSeal(
  event: ActivationEvent,
  lineage: ActivationLineage,
  conditions: ActivationCondition[],
): ActivationSeal {
  const inputs = [
    event.id,
    event.activationClass,
    lineage.linkedNodeId ?? "unbound",
    lineage.epochId ?? "no-epoch",
    lineage.cycleId ?? "no-cycle",
    ...conditions.map((condition) => `${condition.code}:${condition.satisfied}`),
    ...event.routeTargets,
    ...event.reasons,
  ];

  return {
    sealId: `${event.id}-seal`,
    sealHash: deterministicHash(inputs.join("|")),
    inputs,
  };
}

function buildActivationQuantumDeterminism(
  event: ActivationEvent,
  seal: ActivationSeal,
  governanceArtifacts: GovernanceArtifacts,
  finalized: boolean,
): ActivationQuantumDeterminism {
  const artifactIds = governanceArtifacts
    .filter((artifact) => artifact.status === "present")
    .map((artifact) => artifact.id)
    .sort()
    .slice(0, 25);

  return {
    proofId: `${event.id}-quantum-proof`,
    proofHash: deterministicHash(
      [event.id, seal.sealHash, ...artifactIds, finalized ? "finalized" : "pending"].join("|"),
    ),
    reproducible: finalized,
  };
}

function buildActivationStages(
  conditions: ActivationCondition[],
  linkedNodeId: string | undefined,
  artifacts: ActivationArtifact[],
  quantumDeterminism: ActivationQuantumDeterminism,
  finalized: boolean,
): ActivationStage[] {
  return [
    {
      stage: "activation-conditions",
      completed: conditions.every((condition) => condition.satisfied),
      reason: "Activation conditions establish the self-start and self-governance threshold gate.",
    },
    {
      stage: "activation-lineage",
      completed: Boolean(linkedNodeId),
      reason: "Activation lineage binds the sequence to the active epoch or cycle node.",
    },
    {
      stage: "activation-artifacts",
      completed: artifacts
        .filter((artifact) => artifact.required)
        .every((artifact) => artifact.status === "present"),
      reason: "Activation artifacts preserve conditions, lineage, seal, and finalization evidence.",
    },
    {
      stage: "activation-seal",
      completed: finalized,
      reason: "Activation seals certify that the sequence crossed its deterministic threshold.",
    },
    {
      stage: "activation-quantum-determinism",
      completed: quantumDeterminism.reproducible,
      reason: "Quantum determinism requires reproducible proof generation from the same lineage and artifact inputs.",
    },
    {
      stage: "activation-finalization",
      completed: finalized,
      reason: "Finalization closes the activation sequence into a sovereign audit-ready record.",
    },
  ];
}

function requiresMunicipalContext(event: ActivationEvent): boolean {
  return (
    event.activationClass === "municipal-operation" ||
    event.activationClass === "task-force" ||
    event.activationClass === "informant-program" ||
    event.routeTargets.includes("municipal-operations")
  );
}

function isProtectiveActivation(event: ActivationEvent): boolean {
  return (
    event.activationClass === "constitutional-audit" ||
    event.activationClass === "lineage-repair" ||
    event.activationClass === "evidence-integrity" ||
    event.activationClass === "federal-filing"
  );
}

function resolveLinkedNodeId(lineage: LineageState): string | undefined {
  if (lineage.activeCycleId) {
    return lineage.nodes.find((node) => node.cycleId === lineage.activeCycleId)?.id;
  }

  if (lineage.activeEpochId) {
    return lineage.nodes.find((node) => node.epochId === lineage.activeEpochId)?.id;
  }

  return lineage.nodes[0]?.id;
}

function deterministicHash(value: string): string {
  let hash = 2166136261;

  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return `activation-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}
