import { type SystemEvent } from "../deterministic-contract";

export type MunisibleRegistryShape = {
  municipalAuthority: {
    level: string;
    permissions: string[];
  };
  lineage: {
    activeMunicipalEpoch: string | null;
    activeMunicipalCycle: string | null;
    artifacts: Record<string, string | null>;
  };
  activationFlags: {
    municipalBootstrap: boolean;
    municipalHarmonized: boolean;
    municipalSealed: boolean;
    municipalQuantumDeterminism: boolean;
    municipalFinalized: boolean;
  };
};

export type MunicipalEventLike = SystemEvent & {
  municipalityId?: string;
  citizenId?: string;
  evidenceHash?: string;
};

export function normalizeMunicipalEvent<T extends MunicipalEventLike>(
  event: T,
  registry: MunisibleRegistryShape,
): T & { municipalityId: string } {
  return {
    ...event,
    type: event.type.trim(),
    municipalityId:
      event.municipalityId?.trim() ||
      `municipality-${registry.municipalAuthority.level}`,
  };
}
