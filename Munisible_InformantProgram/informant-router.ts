import { type RegistryState } from "../deterministic-contract";

export type InformantRegistry = {
  informants: Array<{
    id: string;
    permissions: string[];
    wellbeing: string;
    status: "active" | "inactive";
  }>;
};

export type InformantRouterAction =
  | {
      kind: "UPDATE_REGISTRY";
      registryId: "munisible-informants.json";
      patch: Record<string, string>;
    }
  | {
      kind: "TRIGGER_WORKFLOW";
      repo: "Munisible_InformantProgram";
      workflowId: "validate-evidence";
    };

export function evaluateInformant(
  event: { type: string },
  _registries: RegistryState,
  registry: InformantRegistry,
): InformantRouterAction[] {
  const actions: InformantRouterAction[] = [];
  const activeInformant = registry.informants[0];

  if (
    event.type === "InformantRegistered" &&
    activeInformant?.permissions.includes("report")
  ) {
    actions.push({
      kind: "UPDATE_REGISTRY",
      registryId: "munisible-informants.json",
      patch: { status: "active" },
    });
  }

  if (
    event.type === "EvidenceSubmitted" &&
    activeInformant?.permissions.includes("evidence.submit")
  ) {
    actions.push({
      kind: "TRIGGER_WORKFLOW",
      repo: "Munisible_InformantProgram",
      workflowId: "validate-evidence",
    });
  }

  return actions;
}
