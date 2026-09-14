import { type RegistryState } from "../deterministic-contract";

export type TaskForceRegistry = {
  taskforces: Array<{
    id: string;
    permissions: string[];
    status: "active" | "inactive";
  }>;
};

export type TaskForceRouterAction =
  | {
      kind: "UPDATE_REGISTRY";
      registryId: "munisible-taskforce.json";
      patch: Record<string, string>;
    }
  | {
      kind: "TRIGGER_WORKFLOW";
      repo: "Munisible_TaskForce";
      workflowId: "audit-evidence";
    };

export function evaluateTaskForce(
  event: { type: string },
  _registries: RegistryState,
  registry: TaskForceRegistry,
): TaskForceRouterAction[] {
  const actions: TaskForceRouterAction[] = [];
  const deploymentTaskForce = registry.taskforces.find(
    (taskForce) =>
      taskForce.status === "inactive" &&
      taskForce.permissions.includes("deploy"),
  );
  const evidenceTaskForce = registry.taskforces.find(
    (taskForce) =>
      taskForce.status === "active" &&
      (taskForce.permissions.includes("audit") ||
        taskForce.permissions.includes("evidence.collect")),
  );

  if (
    event.type === "MunicipalFinalDeterministicHashEmitted" &&
    deploymentTaskForce
  ) {
    actions.push({
      kind: "UPDATE_REGISTRY",
      registryId: "munisible-taskforce.json",
      patch: {
        id: deploymentTaskForce.id,
        status: "active",
      },
    });
  }

  if (
    event.type === "EvidenceSubmitted" &&
    evidenceTaskForce
  ) {
    actions.push({
      kind: "TRIGGER_WORKFLOW",
      repo: "Munisible_TaskForce",
      workflowId: "audit-evidence",
    });
  }

  return actions;
}
