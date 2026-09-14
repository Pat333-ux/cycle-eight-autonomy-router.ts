import {
  type GovernanceArtifacts,
  type LineageState,
  type OrchestrationAction,
  type RegistryState,
  type SystemEvent,
} from "./deterministic-contract";
import { detectBrokenLineage, findMissingArtifacts } from "./constitutional-intelligence-core";

export type CycleEightRouterInput = {
  event: SystemEvent;
  lineage: LineageState;
  registries: RegistryState;
  governanceArtifacts: GovernanceArtifacts;
};

export function evaluateCycleEight(
  input: CycleEightRouterInput,
): OrchestrationAction[] {
  const { event, lineage, registries, governanceArtifacts } = input;
  const proposedActions: OrchestrationAction[] = [];
  const lineageRepairs = detectBrokenLineage(lineage.nodes);
  const missingArtifacts = findMissingArtifacts(lineage.nodes, governanceArtifacts);

  if (isAuditEvent(event) || event.severity === "critical") {
    proposedActions.push({
      action: "run-constitutional-audit",
      reason: `Router elevated ${event.type} for constitutional audit.`,
      priority: "critical",
    });
  }

  if (isWellbeingEvent(event, registries)) {
    proposedActions.push({
      action: "trigger-wellbeing-epoch",
      reason: `Router detected wellbeing pressure from ${event.type}.`,
      priority: "critical",
    });
  }

  if (isStabilityEvent(event, registries)) {
    proposedActions.push({
      action: "trigger-stability-cycle",
      reason: `Router detected cycle instability from ${event.type}.`,
      priority: "high",
    });
  }

  if (lineageRepairs.length > 0 || missingArtifacts.length > 0 || isLineageEvent(event)) {
    proposedActions.push({
      action: "reconstruct-lineage",
      reason: `Router detected lineage recovery conditions from ${event.type}.`,
      priority: "critical",
    });
  }

  if (isTokenomicsEvent(event, registries)) {
    proposedActions.push({
      action: "rebalance-lucr",
      reason: `Router detected LUCR rebalance pressure from ${event.type}.`,
      priority: "medium",
    });
  }

  return dedupeActions(proposedActions);
}

function dedupeActions(actions: OrchestrationAction[]): OrchestrationAction[] {
  const seen = new Set<string>();

  return actions.filter((action) => {
    if (seen.has(action.action)) {
      return false;
    }

    seen.add(action.action);
    return true;
  });
}

function isAuditEvent(event: SystemEvent): boolean {
  return (
    event.domain === "constitution" ||
    event.domain === "compliance" ||
    event.type.toLowerCase().includes("audit")
  );
}

function isWellbeingEvent(
  event: SystemEvent,
  registries: RegistryState,
): boolean {
  return (
    event.domain === "wellbeing" ||
    registries.wellbeingScore < 75 ||
    registries.traumaIncidents > 0
  );
}

function isStabilityEvent(
  event: SystemEvent,
  registries: RegistryState,
): boolean {
  return (
    event.domain === "orchestration" ||
    registries.cycleStabilityScore < 72
  );
}

function isLineageEvent(event: SystemEvent): boolean {
  return event.domain === "lineage";
}

function isTokenomicsEvent(
  event: SystemEvent,
  registries: RegistryState,
): boolean {
  return (
    event.domain === "tokenomics" ||
    registries.citizenCount > (registries.previousCitizenCount ?? registries.citizenCount) ||
    registries.lucr.reserveRatio < 0.2
  );
}
