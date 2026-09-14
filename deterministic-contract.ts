// Root deterministic governance contract for Beast System 3.0.
// Evaluates lineage, registries, governance artifacts, and events, then emits
// invariant violations, lineage repair directives, and orchestration actions.
// Encodes constitutional, sovereign, self-healing execution as a single, pure contract artifact.

import {
  type ConstitutionalIntelligenceInput,
  type ConstitutionalThresholds,
  type ConstitutionalViolation,
  type GovernanceAction,
  type GovernanceArtifact,
  type GovernanceEvent,
  type GovernanceSeverity,
  type LineageNode,
  type LineageRepair,
  type MissingArtifact,
  type PredictedAction,
  type RegistrySnapshot,
  detectBrokenLineage,
  findMissingArtifacts,
  runConstitutionalIntelligenceCore,
} from "./constitutional-intelligence-core";

export type LineageRef = {
  epochId: string;
  cycleId?: string;
  sealHash?: string;
  quantumHash?: string;
};

export type LineageState = {
  activeEpochId: string | null;
  activeCycleId: string | null;
  artifacts: Record<
    string,
    | string
    | {
        id: string;
        nodeId?: string;
      }
    | Record<string, string>
    | undefined
  >;
  nodes: LineageNode[];
  refs?: LineageRef[];
};

export type CitizenObject = {
  id: string;
  wellbeingScore?: number;
  authorityWeight?: number;
  assignedMinistry?: string;
};

export type InvariantViolation = {
  code: string;
  severity: GovernanceSeverity;
  message: string;
};

export type LineageRepairDirective = {
  kind: "repair-lineage" | "generate-artifact";
  nodeId: string;
  priority: GovernanceSeverity;
  reason: string;
  artifactType?: string;
};

export type DeterministicInput = {
  lineage: LineageState;
  registries: RegistrySnapshot;
  governanceArtifacts: GovernanceArtifact[];
  events: GovernanceEvent[];
  citizens?: CitizenObject[];
  constitutionalRules?: Partial<ConstitutionalThresholds>;
};

export type DeterministicOutput = {
  actions: PredictedAction[];
  invariants: InvariantViolation[];
  repairs: LineageRepairDirective[];
  sovereigntyScore: number;
  violations: ConstitutionalViolation[];
};

export function runDeterministicContract(
  input: DeterministicInput,
): DeterministicOutput {
  const normalizedInput = normalizeContractInput(input);
  const invariants = evaluateInvariants(normalizedInput);
  const report = runConstitutionalIntelligenceCore(normalizedInput);
  const repairs = generateLineageRepairs(
    report.missingArtifacts,
    report.lineageRepairs,
  );
  const actions = evaluateConstitutionalRules(report.predictedActions, invariants);

  return {
    actions,
    invariants,
    repairs,
    sovereigntyScore: report.sovereigntyScore,
    violations: report.detectedViolations,
  };
}

export function evaluateInvariants(
  input: ConstitutionalIntelligenceInput & {
    lineageState: LineageState;
    citizens: CitizenObject[];
  },
): InvariantViolation[] {
  const invariants: InvariantViolation[] = [];
  const nodeIds = new Set(input.lineage.map((node) => node.id));
  const missingArtifacts = findMissingArtifacts(
    input.lineage,
    input.governanceArtifacts,
  );
  const brokenLineage = detectBrokenLineage(input.lineage);

  if (!input.lineageState.activeEpochId) {
    invariants.push({
      code: "ACTIVE_EPOCH_REQUIRED",
      severity: "critical",
      message: "An active epoch must exist before deterministic execution can proceed.",
    });
  }

  if (input.lineageState.activeCycleId && !input.lineageState.activeEpochId) {
    invariants.push({
      code: "ACTIVE_CYCLE_REQUIRES_EPOCH",
      severity: "critical",
      message: "An active cycle cannot exist without an active parent epoch.",
    });
  }

  if (
    input.lineageState.artifacts["quantum-proof"] &&
    !input.lineageState.artifacts["seal-manifest"]
  ) {
    invariants.push({
      code: "QUANTUM_REQUIRES_SEAL",
      severity: "critical",
      message: "Quantum determinism cannot exist before the seal manifest is present.",
    });
  }

  if (
    input.lineageState.artifacts["seal-manifest"] &&
    !input.lineageState.activeCycleId
  ) {
    invariants.push({
      code: "SEAL_REQUIRES_CYCLE",
      severity: "high",
      message: "Seal artifacts must remain bound to an active cycle lineage.",
    });
  }

  if (
    input.lineageState.activeEpochId &&
    input.lineageState.refs?.some(
      (ref) => ref.cycleId && ref.epochId !== input.lineageState.activeEpochId,
    )
  ) {
    invariants.push({
      code: "LINEAGE_REF_EPOCH_MISMATCH",
      severity: "high",
      message: "Cycle lineage references must remain bound to the active epoch.",
    });
  }

  if (
    input.citizens.length === 0 &&
    input.governanceEvents.some(isMinistryRoutingEvent)
  ) {
    invariants.push({
      code: "CITIZEN_REQUIRED_FOR_MINISTRY_ROUTING",
      severity: "medium",
      message: "Citizen context must exist before deterministic ministry routing occurs.",
    });
  }

  for (const artifact of input.governanceArtifacts) {
    if (artifact.linkedNodeId && !nodeIds.has(artifact.linkedNodeId)) {
      invariants.push({
        code: "ARTIFACT_PARENT_MISSING",
        severity: "high",
        message: `Artifact ${artifact.id} references missing lineage node ${artifact.linkedNodeId}.`,
      });
    }
  }

  invariants.push(
    ...missingArtifacts.map((artifact) => ({
      code: "MISSING_PARENT_ARTIFACT",
      severity: "high" as const,
      message: `Required artifact ${artifact.artifactType} is missing for lineage node ${artifact.nodeId}.`,
    })),
    ...brokenLineage.map((repair) => ({
      code: "LINEAGE_STATE_INTEGRITY",
      severity: "critical" as const,
      message: repair.reason,
    })),
  );

  return dedupeInvariantViolations(invariants);
}

export function generateLineageRepairs(
  missingArtifacts: MissingArtifact[],
  lineageRepairs: LineageRepair[],
): LineageRepairDirective[] {
  const directives = [
    ...lineageRepairs.map<LineageRepairDirective>((repair) => ({
      kind: "repair-lineage",
      nodeId: repair.nodeId,
      priority: "critical",
      reason: repair.reason,
    })),
    ...missingArtifacts.map<LineageRepairDirective>((artifact) => ({
      kind: "generate-artifact",
      nodeId: artifact.nodeId,
      artifactType: artifact.artifactType,
      priority: "high",
      reason: `Regenerate ${artifact.artifactType} for lineage node ${artifact.nodeId}.`,
    })),
  ];

  return dedupeRepairDirectives(directives);
}

export function evaluateConstitutionalRules(
  predictedActions: PredictedAction[],
  invariants: InvariantViolation[],
): PredictedAction[] {
  const actions = [...predictedActions];

  if (
    invariants.some((invariant) => invariant.severity === "critical") &&
    !actions.some((action) => action.action === "run-constitutional-audit")
  ) {
    actions.unshift({
      action: "run-constitutional-audit",
      reason: "Critical invariant violations require constitutional audit before execution.",
      priority: "critical",
    });
  }

  return dedupePredictedActions(actions);
}

function normalizeContractInput(
  input: DeterministicInput,
): ConstitutionalIntelligenceInput & {
  lineageState: LineageState;
  citizens: CitizenObject[];
} {
  return {
    lineage: input.lineage.nodes,
    lineageState: input.lineage,
    registries: input.registries,
    governanceArtifacts: mergeLineageArtifacts(
      input.lineage,
      input.governanceArtifacts,
    ),
    governanceEvents: input.events,
    thresholds: input.constitutionalRules,
    citizens: input.citizens ?? [],
  };
}

function mergeLineageArtifacts(
  lineage: LineageState,
  governanceArtifacts: GovernanceArtifact[],
): GovernanceArtifact[] {
  const defaultNodeId = lineage.activeCycleId ?? lineage.activeEpochId ?? undefined;
  const artifactEntries = Object.entries(lineage.artifacts).flatMap(
    ([type, value]) => toGovernanceArtifacts(type, value, defaultNodeId),
  );

  const merged = new Map<string, GovernanceArtifact>();
  for (const artifact of [...governanceArtifacts, ...artifactEntries]) {
    merged.set(
      `${artifact.linkedNodeId ?? ""}:${artifact.type}:${artifact.id}`,
      artifact,
    );
  }

  return [...merged.values()];
}

function dedupePredictedActions(actions: PredictedAction[]): PredictedAction[] {
  const seen = new Set<GovernanceAction>();

  return actions.filter((action) => {
    if (seen.has(action.action)) {
      return false;
    }

    seen.add(action.action);
    return true;
  });
}

function dedupeInvariantViolations(
  invariants: InvariantViolation[],
): InvariantViolation[] {
  const seen = new Set<string>();

  return invariants.filter((invariant) => {
    const key = `${invariant.code}:${invariant.message}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function dedupeRepairDirectives(
  directives: LineageRepairDirective[],
): LineageRepairDirective[] {
  const seen = new Set<string>();

  return directives.filter((directive) => {
    const key = `${directive.kind}:${directive.nodeId}:${directive.artifactType ?? ""}:${directive.reason}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function isMinistryRoutingEvent(event: GovernanceEvent): boolean {
  return event.domain === "ministry" || event.type.toLowerCase().includes("ministry");
}

function toGovernanceArtifacts(
  type: string,
  value: LineageState["artifacts"][string],
  defaultNodeId?: string,
): GovernanceArtifact[] {
  if (!value) {
    return [];
  }

  if (typeof value === "string") {
    return [
      {
        id: value,
        type,
        status: "present",
        required: true,
        linkedNodeId: defaultNodeId,
      },
    ];
  }

  if (hasArtifactId(value)) {
    return [
      {
        id: value.id,
        type,
        status: "present",
        required: true,
        linkedNodeId: value.nodeId ?? defaultNodeId,
      },
    ];
  }

  return Object.entries(value).map(([nodeId, artifactId]) => ({
    id: artifactId,
    type,
    status: "present",
    required: true,
    linkedNodeId: nodeId,
  }));
}

function hasArtifactId(
  value: Exclude<LineageState["artifacts"][string], string | undefined>,
): value is { id: string; nodeId?: string } {
  return "id" in value;
}
