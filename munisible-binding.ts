import {
  type ConstitutionalIntelligenceReport,
  type GovernanceArtifact,
  type GovernanceSeverity,
  type RegistrySnapshot,
  runConstitutionalIntelligenceCore,
} from "./constitutional-intelligence-core";
import {
  buildDeterministicGovernanceArtifacts,
  type DeterministicOutput,
  type GovernanceArtifacts,
  type LineageState,
  type OrchestrationAction,
  type RegistryState,
  type SystemEvent,
  runDeterministicContract,
} from "./deterministic-contract";

export type MunisibleRegistry = {
  municipalityId: string;
  authorityLevels: Record<string, string>;
  taskForcePermissions: Record<string, boolean>;
  informantProgramPermissions: Record<string, boolean | string>;
  complianceRules: Record<string, boolean>;
  activationFlags: Record<string, boolean>;
  lineageState: Record<string, string | null>;
};

export type MunisibleTaskForce = {
  taskForceId: string;
  identity: Record<string, string>;
  permissions: Record<string, boolean>;
  routingRules: Record<string, string>;
  auditRules: Record<string, boolean>;
  wellbeingRules: Record<string, boolean | number>;
};

export type MunisibleInformants = {
  programId: string;
  identity: Record<string, string>;
  permissions: Record<string, boolean | string>;
  evidenceIntegrityRules: Record<string, boolean>;
  routingRules: Record<string, string>;
  wellbeingRules: Record<string, boolean>;
};

export type MunisibleArtifacts = {
  registry: MunisibleRegistry;
  taskForce: MunisibleTaskForce;
  informants: MunisibleInformants;
};

export type MunicipalBindingEvent = SystemEvent & {
  municipalityId: string;
  citizenId?: string;
  evidenceHash?: string;
};

export type MunicipalAction =
  | {
      kind: "route-github";
      priority: GovernanceSeverity;
      target: "Munisible_Core" | "Munisible_TaskForce" | "Munisible_InformantProgram" | "Munisible_MunicipalRouter";
      reason: string;
    }
  | {
      kind: "route-chain";
      priority: GovernanceSeverity;
      target: "municipal-governance-ledger";
      reason: string;
    }
  | {
      kind: "route-registry";
      priority: GovernanceSeverity;
      target: "municipal-registry";
      reason: string;
    }
  | {
      kind: "route-ministry";
      priority: GovernanceSeverity;
      target: "municipal-wellbeing" | "municipal-compliance" | "municipal-intelligence";
      reason: string;
    }
  | {
      kind: "activate-task-force";
      priority: GovernanceSeverity;
      target: string;
      reason: string;
    }
  | {
      kind: "protect-informant";
      priority: GovernanceSeverity;
      target: string;
      reason: string;
    }
  | {
      kind: "protect-citizen";
      priority: GovernanceSeverity;
      target: string;
      reason: string;
    }
  | {
      kind: "run-municipal-audit";
      priority: GovernanceSeverity;
      target: "municipal-audit";
      reason: string;
    };

export type MunicipalWatchdogStatus = {
  compliant: boolean;
  evidenceIntegrityOk: boolean;
  wellbeingProtected: boolean;
  lineageStable: boolean;
};

export type MunisibleBindingResult = {
  normalizedEvent: MunicipalBindingEvent;
  deterministicOutput: DeterministicOutput;
  constitutionalReport: ConstitutionalIntelligenceReport;
  municipalActions: MunicipalAction[];
  watchdog: MunicipalWatchdogStatus;
};

export function bindMunisibleOperations(
  event: MunicipalBindingEvent,
  lineage: LineageState,
  registries: RegistryState,
  governanceArtifacts: GovernanceArtifacts,
  munisibleArtifacts: MunisibleArtifacts,
): MunisibleBindingResult {
  const normalizedEvent = normalizeMunicipalEvent(event, munisibleArtifacts.registry);
  const municipalGovernanceArtifacts = mergeMunicipalArtifacts(
    governanceArtifacts,
    lineage,
    munisibleArtifacts,
    normalizedEvent,
  );
  const effectiveGovernanceArtifacts = buildDeterministicGovernanceArtifacts(
    lineage,
    municipalGovernanceArtifacts,
  );
  const deterministicOutput = runDeterministicContract({
    lineage,
    registries,
    governanceArtifacts: effectiveGovernanceArtifacts,
    events: [normalizedEvent],
  }, effectiveGovernanceArtifacts);
  const constitutionalReport = runConstitutionalIntelligenceCore({
    lineage: lineage.nodes,
    registries,
    governanceArtifacts: effectiveGovernanceArtifacts,
    governanceEvents: [normalizedEvent],
  });
  const municipalActions = routeMunicipalActions(
    normalizedEvent,
    registries,
    deterministicOutput,
    constitutionalReport,
    munisibleArtifacts,
  );

  return {
    normalizedEvent,
    deterministicOutput,
    constitutionalReport,
    municipalActions,
    watchdog: evaluateMunicipalWatchdog(
      normalizedEvent,
      deterministicOutput,
      constitutionalReport,
      munisibleArtifacts,
    ),
  };
}

export function normalizeMunicipalEvent(
  event: MunicipalBindingEvent,
  registry: MunisibleRegistry,
): MunicipalBindingEvent {
  return {
    ...event,
    municipalityId: registry.municipalityId,
    type: event.type.trim(),
  };
}

export function evaluateMunicipalRulesEngine(
  event: MunicipalBindingEvent,
  registries: RegistrySnapshot,
  deterministicOutput: DeterministicOutput,
  constitutionalReport: ConstitutionalIntelligenceReport,
  munisibleArtifacts: MunisibleArtifacts,
): MunicipalAction[] {
  const actions: MunicipalAction[] = [];
  const hasCriticalInvariant = deterministicOutput.invariants.some(
    (invariant) => invariant.severity === "critical",
  );
  const hasEvidenceGap =
    !event.evidenceHash &&
    Boolean(munisibleArtifacts.registry.complianceRules.requireEvidenceIntegrity);
  const hasTaskForceActivation =
    munisibleArtifacts.registry.activationFlags.municipalBootstrap ||
    munisibleArtifacts.registry.activationFlags.municipalHarmonizer ||
    munisibleArtifacts.registry.activationFlags.municipalSeal ||
    munisibleArtifacts.registry.activationFlags.municipalQuantumDeterminism ||
    munisibleArtifacts.registry.activationFlags.municipalFinalizer;

  if (hasCriticalInvariant || event.severity === "critical") {
    actions.push({
      kind: "run-municipal-audit",
      target: "municipal-audit",
      priority: "critical",
      reason: "Critical deterministic findings require a municipal audit.",
    });
    actions.push({
      kind: "route-github",
      target: "Munisible_Core",
      priority: "critical",
      reason: "Escalate critical deterministic findings to the municipal core repository.",
    });
  }

  if (hasTaskForceActivation && munisibleArtifacts.taskForce.permissions.activate) {
    actions.push({
      kind: "activate-task-force",
      target: munisibleArtifacts.taskForce.taskForceId,
      priority: event.severity === "critical" ? "critical" : "high",
      reason: "Municipal activation flags authorize deterministic task force activation.",
    });
  }

  if (hasEvidenceGap) {
    actions.push({
      kind: "route-registry",
      target: "municipal-registry",
      priority: "high",
      reason: "Evidence integrity requirements require registry remediation.",
    });
    actions.push({
      kind: "route-github",
      target: "Munisible_InformantProgram",
      priority: "high",
      reason: "Missing evidence hash must be remediated through the informant program.",
    });
  }

  if (
    registries.traumaIncidents > 0 ||
    constitutionalReport.wellbeingScore < 75
  ) {
    const isInformantEvent = isInformantProtectionEvent(event);
    actions.push(
      isInformantEvent
        ? {
            kind: "protect-informant",
            target: event.citizenId ?? munisibleArtifacts.informants.programId,
            priority: "critical",
            reason: "Trauma-prevention safeguards require municipal informant protection.",
          }
        : {
            kind: "protect-citizen",
            target: event.citizenId ?? event.municipalityId,
            priority: "critical",
            reason: "Trauma-prevention safeguards require municipal citizen protection.",
          },
    );
    actions.push({
      kind: "route-ministry",
      target: "municipal-wellbeing",
      priority: "critical",
      reason: "Wellbeing protections must be routed through the municipal wellbeing office.",
    });
  }

  if (deterministicOutput.repairs.length > 0) {
    actions.push({
      kind: "route-github",
      target: "Munisible_MunicipalRouter",
      priority: "high",
      reason: "Broken lineage or missing artifacts require municipal router healing.",
    });
  }

  if (constitutionalReport.detectedViolations.some((violation) => violation.domain === "compliance")) {
    actions.push({
      kind: "route-ministry",
      target: "municipal-compliance",
      priority: "high",
      reason: "Municipal compliance findings must be routed for constitutional review.",
    });
  }

  if (normalizedMunicipalIntelligenceNeeded(event, constitutionalReport, munisibleArtifacts)) {
    actions.push({
      kind: "route-ministry",
      target: "municipal-intelligence",
      priority: "medium",
      reason: "Municipal intelligence routing is required for citizen-level signal handling.",
    });
    if (munisibleArtifacts.taskForce.permissions.routeCitizens) {
      actions.push({
        kind: "route-github",
        target: "Munisible_TaskForce",
        priority: "medium",
        reason: "Task force routing is required for the municipal intelligence execution path.",
      });
    }
  }

  return dedupeMunicipalActions(actions);
}

export function routeMunicipalActions(
  event: MunicipalBindingEvent,
  registries: RegistrySnapshot,
  deterministicOutput: DeterministicOutput,
  constitutionalReport: ConstitutionalIntelligenceReport,
  munisibleArtifacts: MunisibleArtifacts,
): MunicipalAction[] {
  const rulesEngineActions = evaluateMunicipalRulesEngine(
    event,
    registries,
    deterministicOutput,
    constitutionalReport,
    munisibleArtifacts,
  );
  const deterministicActions = deterministicOutput.actions.map((action) =>
    mapDeterministicActionToMunicipalRoute(action),
  );

  return dedupeMunicipalActions([
    ...rulesEngineActions,
    ...deterministicActions.filter(
      (action): action is MunicipalAction => action !== null,
    ),
  ]);
}

export function evaluateMunicipalWatchdog(
  event: MunicipalBindingEvent,
  deterministicOutput: DeterministicOutput,
  constitutionalReport: ConstitutionalIntelligenceReport,
  munisibleArtifacts: MunisibleArtifacts,
): MunicipalWatchdogStatus {
  return {
    compliant:
      deterministicOutput.invariants.every(
        (invariant) => invariant.severity !== "critical",
      ) &&
      constitutionalReport.complianceScore >= 80,
    evidenceIntegrityOk:
      Boolean(event.evidenceHash) ||
      !munisibleArtifacts.registry.complianceRules.requireEvidenceIntegrity,
    wellbeingProtected:
      constitutionalReport.wellbeingScore >= 75 ||
      constitutionalReport.predictedActions.some(
        (action) => action.action === "trigger-wellbeing-epoch",
      ),
    lineageStable:
      deterministicOutput.repairs.length === 0 &&
      constitutionalReport.lineageRepairs.length === 0,
  };
}

function mergeMunicipalArtifacts(
  governanceArtifacts: GovernanceArtifact[],
  lineage: LineageState,
  munisibleArtifacts: MunisibleArtifacts,
  event: MunicipalBindingEvent,
): GovernanceArtifact[] {
  const linkedNodeId =
    lineage.activeCycleId ??
    lineage.activeEpochId ??
    lineage.nodes[0]?.id ??
    event.municipalityId;

  return [
    ...governanceArtifacts,
    {
      id: `${munisibleArtifacts.registry.municipalityId}-authority`,
      type: "municipal-authority",
      status: "present",
      required: true,
      linkedNodeId,
    },
    {
      id: `${munisibleArtifacts.taskForce.taskForceId}-activation`,
      type: "municipal-taskforce-activation",
      status: munisibleArtifacts.taskForce.permissions.activate ? "present" : "missing",
      required: true,
      linkedNodeId,
    },
    {
      id: `${munisibleArtifacts.informants.programId}-evidence`,
      type: "municipal-evidence-integrity",
      status:
        event.evidenceHash ||
        !munisibleArtifacts.informants.evidenceIntegrityRules.requireHashChain
          ? "present"
          : "missing",
      required: true,
      linkedNodeId,
    },
  ];
}

function mapDeterministicActionToMunicipalRoute(
  action: OrchestrationAction,
): MunicipalAction | null {
  switch (action.action) {
    case "run-constitutional-audit":
      return {
        kind: "run-municipal-audit",
        target: "municipal-audit",
        priority: action.priority,
        reason: action.reason,
      };
    case "trigger-stability-cycle":
    case "reconstruct-lineage":
      return {
        kind: "route-github",
        target: "Munisible_MunicipalRouter",
        priority: action.priority,
        reason: action.reason,
      };
    case "trigger-wellbeing-epoch":
      return {
        kind: "route-ministry",
        target: "municipal-wellbeing",
        priority: action.priority,
        reason: action.reason,
      };
    case "rebalance-lucr":
      return {
        kind: "route-chain",
        target: "municipal-governance-ledger",
        priority: action.priority,
        reason: action.reason,
      };
  }

  return null;
}

function normalizedMunicipalIntelligenceNeeded(
  event: MunicipalBindingEvent,
  constitutionalReport: ConstitutionalIntelligenceReport,
  munisibleArtifacts: MunisibleArtifacts,
): boolean {
  return (
    Boolean(event.citizenId) &&
    munisibleArtifacts.informants.permissions.receiveRouting === true &&
    constitutionalReport.detectedViolations.length > 0
  );
}

function isInformantProtectionEvent(
  event: MunicipalBindingEvent,
): boolean {
  return event.type.toLowerCase().includes("informant");
}

function dedupeMunicipalActions(
  actions: MunicipalAction[],
): MunicipalAction[] {
  const merged = new Map<string, MunicipalAction>();

  for (const action of actions) {
    const key = `${action.kind}:${action.target}`;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, action);
      continue;
    }

    const prioritizedAction =
      severityRank(action.priority) < severityRank(existing.priority)
        ? action
        : existing;

    merged.set(key, {
      ...prioritizedAction,
      priority:
        severityRank(action.priority) < severityRank(existing.priority)
          ? action.priority
          : existing.priority,
      reason: joinDistinctReasons(existing.reason, action.reason),
    });
  }

  return [...merged.values()];
}

function joinDistinctReasons(left: string, right: string): string {
  return [...new Set([left, right])].join("; ");
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
