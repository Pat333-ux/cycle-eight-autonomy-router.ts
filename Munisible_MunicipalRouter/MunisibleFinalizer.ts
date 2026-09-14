import { type LineageState } from "../deterministic-contract";

export function municipalFinalizer(lineage: LineageState) {
  return {
    kind: "EMIT_HASH" as const,
    hashType: "MunicipalFinalDeterministicHash" as const,
    lineage,
  };
}
