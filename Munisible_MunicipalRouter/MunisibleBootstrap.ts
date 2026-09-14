import { type LineageState } from "../deterministic-contract";

export function municipalBootstrap(lineage: LineageState) {
  return {
    kind: "EMIT_HASH" as const,
    hashType: "MunicipalBootstrapHash" as const,
    lineage,
  };
}
