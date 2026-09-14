import { type LineageState } from "../deterministic-contract";

export function municipalHarmonizer(lineage: LineageState) {
  return {
    kind: "EMIT_HASH" as const,
    hashType: "MunicipalHarmonizedHash" as const,
    lineage,
  };
}
