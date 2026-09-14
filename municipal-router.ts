import {
  municipalBootstrap,
  municipalFinalizer,
  municipalHarmonizer,
  municipalQuantumDeterminism,
  municipalSeal,
} from "./Munisible_MunicipalRouter/modules";
import { type LineageState } from "./deterministic-contract";

export type MunicipalHashAction =
  | ReturnType<typeof municipalBootstrap>
  | ReturnType<typeof municipalHarmonizer>
  | ReturnType<typeof municipalSeal>
  | ReturnType<typeof municipalQuantumDeterminism>
  | ReturnType<typeof municipalFinalizer>;

export function evaluateMunicipal(
  event: { type: string },
  lineage: LineageState,
): MunicipalHashAction[] {
  const actions: MunicipalHashAction[] = [];

  if (event.type === "MunicipalEpochStabilized") {
    actions.push(municipalBootstrap(lineage));
  }

  if (event.type === "MunicipalBootstrapHashEmitted") {
    actions.push(municipalHarmonizer(lineage));
  }

  if (event.type === "MunicipalHarmonizedHashEmitted") {
    actions.push(municipalSeal(lineage));
  }

  if (event.type === "MunicipalSealHashEmitted") {
    actions.push(municipalQuantumDeterminism(lineage));
  }

  if (event.type === "MunicipalQuantumDeterminismHashEmitted") {
    actions.push(municipalFinalizer(lineage));
  }

  return actions;
}
