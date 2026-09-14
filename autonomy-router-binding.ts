// Binds cycle-eight-autonomy-router.ts to deterministic-contract.ts.

import { evaluateCycleEight } from "./cycle-eight-autonomy-router";
import {
  type DeterministicInput,
  type DeterministicOutput,
  type GovernanceArtifacts,
  type LineageState,
  type OrchestrationAction,
  type RegistryState,
  type SystemEvent,
  runDeterministicContract,
} from "./deterministic-contract";

export type RouterBindingResult = {
  deterministicInput: DeterministicInput;
  deterministicOutput: DeterministicOutput;
  proposedRouterActions: OrchestrationAction[];
  allowedRouterActions: OrchestrationAction[];
  blockedRouterActions: OrchestrationAction[];
  shouldExecute: boolean;
};

export function bindAutonomyRouterToDeterministicContract(
  event: SystemEvent,
  lineage: LineageState,
  registries: RegistryState,
  governanceArtifacts: GovernanceArtifacts,
): RouterBindingResult {
  const normalizedEvent = normalizeSystemEvent(event);
  const deterministicInput = normalizeBindingInput(
    normalizedEvent,
    lineage,
    registries,
    governanceArtifacts,
  );
  const deterministicOutput = runDeterministicContract(deterministicInput);
  const proposedRouterActions = evaluateCycleEight({
    event: normalizedEvent,
    lineage,
    registries,
    governanceArtifacts: deterministicInput.governanceArtifacts,
  });
  const allowedRouterActions = filterAllowedRouterActions(
    proposedRouterActions,
    deterministicOutput,
  );
  const blockedRouterActions = proposedRouterActions.filter(
    (action) =>
      !allowedRouterActions.some((allowed) => allowed.action === action.action),
  );

  return {
    deterministicInput,
    deterministicOutput,
    proposedRouterActions,
    allowedRouterActions,
    blockedRouterActions,
    shouldExecute: allowedRouterActions.length > 0,
  };
}

export function normalizeBindingInput(
  event: SystemEvent,
  lineage: LineageState,
  registries: RegistryState,
  governanceArtifacts: GovernanceArtifacts,
): DeterministicInput {
  return {
    lineage,
    registries,
    governanceArtifacts,
    events: [event],
  };
}

export function filterAllowedRouterActions(
  proposedActions: OrchestrationAction[],
  deterministicOutput: DeterministicOutput,
): OrchestrationAction[] {
  const allowedActionTypes = new Set(
    deterministicOutput.actions.map((action) => action.action),
  );

  if (hasBlockingInvariant(deterministicOutput)) {
    return proposedActions.filter(
      (action) =>
        action.action === "run-constitutional-audit" &&
        allowedActionTypes.has(action.action),
    );
  }

  return proposedActions.filter((action) => allowedActionTypes.has(action.action));
}

function normalizeSystemEvent(event: SystemEvent): SystemEvent {
  return {
    ...event,
    type: event.type,
  };
}

function hasBlockingInvariant(output: DeterministicOutput): boolean {
  return output.invariants.some((invariant) => invariant.severity === "critical");
}
