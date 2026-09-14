import type { GovernanceSeverity, MinistryName } from "./constitutional-intelligence-core";
import type { GovernanceArtifacts, LineageState } from "./deterministic-contract";
import {
  buildActivationSequence,
  type ActivationSequence,
} from "./activation-sequence";
import type {
  ActivationClass,
  ActivationEvent,
  ActivationRouteTarget,
} from "./autonomous-activation-engine";

export type ActivationHandler =
  | "routeMinistries"
  | "bindMunisibleOperations"
  | "orchestrateLucrLifecycle"
  | "runDeterministicContract"
  | "runConstitutionalIntelligenceCore";

export type ActivationDispatch = {
  activationEventId: string;
  activationClass: ActivationClass;
  target: ActivationRouteTarget;
  handler: ActivationHandler;
  method: string;
  reason: string;
  priority: GovernanceSeverity;
  sealId: string;
  lineageNodeId?: string;
  municipalityId?: string;
  ministry?: MinistryName;
  citizenIds: string[];
};

export type ActivationRoutingResult = {
  activationEvent: ActivationEvent;
  sequence: ActivationSequence;
  dispatches: ActivationDispatch[];
  blockedTargets: ActivationRouteTarget[];
  readyForExecution: boolean;
};

export function routeActivationEvents(
  events: ActivationEvent[],
  lineage: LineageState,
  governanceArtifacts: GovernanceArtifacts,
): ActivationRoutingResult[] {
  return events.map((event) => routeActivationEvent(event, lineage, governanceArtifacts));
}

export function routeActivationEvent(
  event: ActivationEvent,
  lineage: LineageState,
  governanceArtifacts: GovernanceArtifacts,
): ActivationRoutingResult {
  const sequence = buildActivationSequence({
    event,
    lineage,
    governanceArtifacts,
  });
  const targetsAllowedWhilePending = new Set<ActivationRouteTarget>([
    "evidence-integrity",
    "federal-filings",
  ]);
  const blockedTargets = sequence.finalized
    ? []
    : event.routeTargets.filter((target) => !targetsAllowedWhilePending.has(target));
  const dispatchTargets = sequence.finalized
    ? event.routeTargets
    : event.routeTargets.filter((target) => targetsAllowedWhilePending.has(target));

  return {
    activationEvent: event,
    sequence,
    dispatches: dispatchTargets.flatMap((target) => mapTargetToDispatch(target, event, sequence)),
    blockedTargets,
    readyForExecution: sequence.finalized && blockedTargets.length === 0,
  };
}

function mapTargetToDispatch(
  target: ActivationRouteTarget,
  event: ActivationEvent,
  sequence: ActivationSequence,
): ActivationDispatch[] {
  switch (target) {
    case "ministries":
      return (event.ministries.length > 0
        ? event.ministries
        : (["Coordination"] as MinistryName[])
      ).map((ministry) => ({
        activationEventId: event.id,
        activationClass: event.activationClass,
        target,
        handler: "routeMinistries",
        method: "dispatch-constitutional-directive",
        reason: joinReasons(event.reasons),
        priority: event.severity,
        sealId: sequence.seal.sealId,
        lineageNodeId: sequence.lineage.linkedNodeId,
        municipalityId: event.municipalityId,
        ministry,
        citizenIds: event.citizenIds,
      }));
    case "municipal-operations":
      return [buildDispatch(target, event, sequence, "bindMunisibleOperations", methodByTarget(target, event))];
    case "tokenomics":
      return [buildDispatch(target, event, sequence, "orchestrateLucrLifecycle", methodByTarget(target, event))];
    case "citizen-governance":
      return [buildDispatch(target, event, sequence, "runDeterministicContract", methodByTarget(target, event))];
    case "evidence-integrity":
      return [buildDispatch(target, event, sequence, "runDeterministicContract", methodByTarget(target, event))];
    case "wellbeing-engines":
      return [buildDispatch(target, event, sequence, "runDeterministicContract", methodByTarget(target, event))];
    case "federal-filings":
      return [
        buildDispatch(
          target,
          event,
          sequence,
          "runConstitutionalIntelligenceCore",
          methodByTarget(target, event),
        ),
      ];
    case "dao-governance":
      return [buildDispatch(target, event, sequence, "runDeterministicContract", methodByTarget(target, event))];
    case "task-force":
      return [buildDispatch(target, event, sequence, "bindMunisibleOperations", methodByTarget(target, event))];
    case "informant-program":
      return [buildDispatch(target, event, sequence, "bindMunisibleOperations", methodByTarget(target, event))];
  }
}

function buildDispatch(
  target: ActivationRouteTarget,
  event: ActivationEvent,
  sequence: ActivationSequence,
  handler: ActivationHandler,
  method: string,
): ActivationDispatch {
  return {
    activationEventId: event.id,
    activationClass: event.activationClass,
    target,
    handler,
    method,
    reason: joinReasons(event.reasons),
    priority: event.severity,
    sealId: sequence.seal.sealId,
    lineageNodeId: sequence.lineage.linkedNodeId,
    municipalityId: event.municipalityId,
    citizenIds: event.citizenIds,
  };
}

function methodByTarget(
  target: ActivationRouteTarget,
  event: ActivationEvent,
): string {
  switch (target) {
    case "ministries":
      return "dispatch-constitutional-directive";
    case "municipal-operations":
      return event.activationClass === "lineage-repair"
        ? "repair-municipal-lineage"
        : "start-municipal-operation";
    case "tokenomics":
      return "rebalance-lucr";
    case "citizen-governance":
      return event.activationClass === "governance-cycle"
        ? "start-governance-cycle"
        : "start-citizen-governance";
    case "evidence-integrity":
      return "seal-evidence-integrity";
    case "wellbeing-engines":
      return "start-wellbeing-epoch";
    case "federal-filings":
      return "prepare-federal-filing";
    case "dao-governance":
      return "open-dao-governance-sequence";
    case "task-force":
      return "activate-task-force";
    case "informant-program":
      return "activate-informant-program";
  }
}

function joinReasons(reasons: string[]): string {
  return [...new Set(reasons)].join("; ");
}
