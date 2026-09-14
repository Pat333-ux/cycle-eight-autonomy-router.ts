import {
  type ConstitutionalIntelligenceReport,
  type GovernanceArtifact,
  runConstitutionalIntelligenceCore,
} from "./constitutional-intelligence-core";
import {
  type DeterministicInput,
  type DeterministicOutput,
  type GovernanceArtifacts,
  type LineageState,
  type OrchestrationAction,
  type RegistryState,
  runDeterministicContract,
} from "./deterministic-contract";
import {
  normalizeMunicipalEvent,
  type MunicipalEventLike,
  type MunisibleRegistryShape,
} from "./Munisible_Core/MunicipalEventNormalizer";
import {
  evaluateInformant,
  type InformantRouterAction,
} from "./informant-router";
import {
  evaluateMunicipal,
  type MunicipalHashAction,
} from "./municipal-router";
import {
  evaluateTaskForce,
  type TaskForceRouterAction,
} from "./taskforce-router";

export type MunisibleRegistry = MunisibleRegistryShape;

export type MunisibleTaskForce = {
  taskforces: Array<{
    id: string;
    permissions: string[];
    status: "active" | "inactive";
  }>;
};

export type MunisibleInformants = {
  informants: Array<{
    id: string;
    permissions: string[];
    wellbeing: string;
    status: "active" | "inactive";
  }>;
};

export type MunisibleArtifacts = {
  registry: MunisibleRegistry;
  taskforce: MunisibleTaskForce;
  informants: MunisibleInformants;
};

export type MunicipalBindingEvent = MunicipalEventLike & {
  municipalityId: string;
};

export type MunicipalExecutionAction =
  | OrchestrationAction
  | MunicipalHashAction
  | TaskForceRouterAction
  | InformantRouterAction;

export type MunisibleBindingResult = {
  normalizedEvent: MunicipalBindingEvent;
  deterministicInput: DeterministicInput;
  deterministicOutput: DeterministicOutput;
  constitutionalReport: ConstitutionalIntelligenceReport;
  routerActions: MunicipalHashAction[];
  taskForceActions: TaskForceRouterAction[];
  informantActions: InformantRouterAction[];
  municipalActions: MunicipalExecutionAction[];
  blockedByDeterminism: boolean;
};

export function bindMunisibleToDeterministicContract(
  event: MunicipalEventLike,
  lineage: LineageState,
  registries: RegistryState,
  governanceArtifacts: GovernanceArtifacts,
  munisibleArtifacts: MunisibleArtifacts,
): MunisibleBindingResult {
  const normalizedEvent = normalizeMunicipalEvent(
    event,
    munisibleArtifacts.registry,
  );
  const effectiveGovernanceArtifacts = buildMunisibleGovernanceArtifacts(
    governanceArtifacts,
    lineage,
    normalizedEvent,
    munisibleArtifacts,
  );
  const deterministicInput: DeterministicInput = {
    lineage,
    registries,
    governanceArtifacts: effectiveGovernanceArtifacts,
    events: [normalizedEvent],
    citizens: normalizedEvent.citizenId
      ? [{ id: normalizedEvent.citizenId }]
      : undefined,
  };
  const deterministicOutput = runDeterministicContract(
    deterministicInput,
    effectiveGovernanceArtifacts,
  );
  const constitutionalReport = runConstitutionalIntelligenceCore({
    lineage: lineage.nodes,
    registries,
    governanceArtifacts: effectiveGovernanceArtifacts,
    governanceEvents: [normalizedEvent],
  });

  if (
    deterministicOutput.invariants.length > 0 ||
    deterministicOutput.repairs.length > 0
  ) {
    return {
      normalizedEvent,
      deterministicInput,
      deterministicOutput,
      constitutionalReport,
      routerActions: [],
      taskForceActions: [],
      informantActions: [],
      municipalActions: dedupeMunicipalActions(deterministicOutput.actions),
      blockedByDeterminism: true,
    };
  }

  const routerActions = evaluateMunicipal(normalizedEvent, lineage);
  const taskForceActions = evaluateTaskForce(
    normalizedEvent,
    registries,
    munisibleArtifacts.taskforce,
  );
  const informantActions = evaluateInformant(
    normalizedEvent,
    registries,
    munisibleArtifacts.informants,
  );

  return {
    normalizedEvent,
    deterministicInput,
    deterministicOutput,
    constitutionalReport,
    routerActions,
    taskForceActions,
    informantActions,
    municipalActions: dedupeMunicipalActions([
      ...deterministicOutput.actions,
      ...routerActions,
      ...taskForceActions,
      ...informantActions,
    ]),
    blockedByDeterminism: false,
  };
}

export const bindMunisibleOperations = bindMunisibleToDeterministicContract;

function buildMunisibleGovernanceArtifacts(
  governanceArtifacts: GovernanceArtifact[],
  lineage: LineageState,
  event: MunicipalBindingEvent,
  munisibleArtifacts: MunisibleArtifacts,
): GovernanceArtifact[] {
  const linkedNodeId = resolveMunicipalLinkedNodeId(lineage, event);
  const municipalArtifacts: GovernanceArtifact[] = [
    {
      id: `municipal-authority-${munisibleArtifacts.registry.municipalAuthority.level}`,
      type: "municipal-authority",
      status: "present",
      required: true,
      linkedNodeId,
    },
  ];

  for (const hashType of municipalHashTypes) {
    const hash = munisibleArtifacts.registry.lineage.artifacts[hashType];
    if (!hash) {
      continue;
    }

    municipalArtifacts.push({
      id: hash,
      type: hashType,
      status: "present",
      required: false,
      linkedNodeId,
    });
  }

  if (event.evidenceHash) {
    municipalArtifacts.push({
      id: event.evidenceHash,
      type: "municipal-evidence-integrity",
      status: "present",
      required: false,
      linkedNodeId,
    });
  }

  return dedupeGovernanceArtifacts([
    ...governanceArtifacts,
    ...municipalArtifacts,
  ]);
}

function dedupeMunicipalActions(
  actions: MunicipalExecutionAction[],
): MunicipalExecutionAction[] {
  const uniqueActions = new Map<string, MunicipalExecutionAction>();

  for (const action of actions) {
    const key =
      "action" in action
        ? `deterministic:${action.action}`
        : getMunicipalActionKey(action);

    if (!uniqueActions.has(key)) {
      uniqueActions.set(key, action);
    }
  }

  return [...uniqueActions.values()];
}

function dedupeGovernanceArtifacts(
  artifacts: GovernanceArtifact[],
): GovernanceArtifact[] {
  const uniqueArtifacts = new Map<string, GovernanceArtifact>();

  for (const artifact of artifacts) {
    uniqueArtifacts.set(
      `${artifact.type}:${artifact.linkedNodeId ?? "global"}:${artifact.id}`,
      artifact,
    );
  }

  return [...uniqueArtifacts.values()];
}

function getMunicipalActionKey(action: Exclude<MunicipalExecutionAction, OrchestrationAction>): string {
  switch (action.kind) {
    case "EMIT_HASH":
      return `${action.kind}:${action.hashType}`;
    case "UPDATE_REGISTRY":
      return `${action.kind}:${action.registryId}:${JSON.stringify(action.patch)}`;
    case "TRIGGER_WORKFLOW":
      return `${action.kind}:${action.repo}:${action.workflowId}`;
  }
}

function resolveMunicipalLinkedNodeId(
  lineage: LineageState,
  event: MunicipalBindingEvent,
): string | undefined {
  if (lineage.activeCycleId) {
    const activeCycleNode = lineage.nodes.find(
      (node) => node.cycleId === lineage.activeCycleId,
    );
    if (activeCycleNode) {
      return activeCycleNode.id;
    }
  }

  if (lineage.activeEpochId) {
    const activeEpochNode = lineage.nodes.find(
      (node) => node.epochId === lineage.activeEpochId,
    );
    if (activeEpochNode) {
      return activeEpochNode.id;
    }
  }

  return lineage.nodes[0]?.id ?? event.municipalityId;
}

const municipalHashTypes = [
  "MunicipalBootstrapHash",
  "MunicipalHarmonizedHash",
  "MunicipalSealHash",
  "MunicipalQuantumDeterminismHash",
  "MunicipalFinalDeterministicHash",
] as const;
