import { type LineageState } from "../deterministic-contract";

export function municipalQuantumDeterminism(lineage: LineageState) {
  return {
    kind: "EMIT_HASH" as const,
    hashType: "MunicipalQuantumDeterminismHash" as const,
    lineage,
  };
}
