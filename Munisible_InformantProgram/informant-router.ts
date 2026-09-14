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
  const registeringInformant = registry.informants.find(
    (informant) =>
      informant.status === "inactive" &&
      informant.permissions.includes("report"),
  );
  const evidenceInformant = registry.informants.find(
    (informant) =>
      informant.status === "active" &&
      informant.permissions.includes("evidence.submit"),
  );

  if (
    event.type === "InformantRegistered" &&
    registeringInformant
  ) {
    actions.push({
      kind: "UPDATE_REGISTRY",
      registryId: "munisible-informants.json",
      patch: {
        id: registeringInformant.id,
        status: "active",
      },
    });
  }

  if (
    event.type === "EvidenceSubmitted" &&
    evidenceInformant
  ) {
    actions.push({
      kind: "TRIGGER_WORKFLOW",
      repo: "Munisible_InformantProgram",
      workflowId: "validate-evidence",
    });
  }

  return actions;
}
