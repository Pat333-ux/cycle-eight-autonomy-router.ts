import { type LineageState } from "../deterministic-contract";

export function municipalSeal(lineage: LineageState) {
  return {
    kind: "EMIT_HASH" as const,
    hashType: "MunicipalSealHash" as const,
    lineage,
  };
}
