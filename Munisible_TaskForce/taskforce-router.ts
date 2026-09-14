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
  const activeTaskForce = registry.taskforces[0];

  if (
    event.type === "MunicipalFinalDeterministicHashEmitted" &&
    activeTaskForce?.permissions.includes("deploy")
  ) {
    actions.push({
      kind: "UPDATE_REGISTRY",
      registryId: "munisible-taskforce.json",
      patch: { status: "active" },
    });
  }

  if (
    event.type === "EvidenceSubmitted" &&
    activeTaskForce &&
    (activeTaskForce.permissions.includes("audit") ||
      activeTaskForce.permissions.includes("evidence.collect"))
  ) {
    actions.push({
      kind: "TRIGGER_WORKFLOW",
      repo: "Munisible_TaskForce",
      workflowId: "audit-evidence",
    });
  }

  return actions;
}
