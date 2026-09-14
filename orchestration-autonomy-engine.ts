import {
  bindAutonomyRouterToDeterministicContract,
  type RouterBindingResult,
} from "./autonomy-router-binding";
import {
  type GovernanceArtifacts,
  type LineageState,
  type OrchestrationAction,
  type RegistryState,
  type SystemEvent,
} from "./deterministic-contract";

export type LucrLifecycleOperation = "buy" | "sell" | "mint" | "burn";

export type LucrLifecycleRequest = {
  requestId?: string;
  operation: LucrLifecycleOperation;
  citizenId: string;
  walletAddress: string;
  amount: number;
  paymentAmount?: number;
  paymentAsset?: "ETH" | "USDC";
  reason?: string;
};

export type LucrQuote = {
  paymentAsset: "ETH" | "USDC" | "LUCR";
  paymentAmount: number;
  lucrAmount: number;
};

export type LucrExecutionStep = {
  stage: "market-router" | "governance" | "token-core" | "offchain";
  method:
    | "quote-buy"
    | "quote-sell"
    | "request-mint"
    | "request-burn"
    | "mint"
    | "burn"
    | "transfer-lucr"
    | "transfer-stable"
    | "update-registries"
    | "run-deterministic-contract";
  reason: string;
};

export type LucrAutonomyExecution = {
  request: LucrLifecycleRequest;
  event: SystemEvent;
  binding: RouterBindingResult;
  authorizedActions: OrchestrationAction[];
  blockedActions: OrchestrationAction[];
  quote: LucrQuote;
  executionSteps: LucrExecutionStep[];
  allowed: boolean;
};

export function orchestrateLucrLifecycle(
  request: LucrLifecycleRequest,
  lineage: LineageState,
  registries: RegistryState,
  governanceArtifacts: GovernanceArtifacts,
): LucrAutonomyExecution {
  const event = mapLucrRequestToEvent(request);
  const binding = bindAutonomyRouterToDeterministicContract(
    event,
    lineage,
    registries,
    governanceArtifacts,
  );
  const quote = quoteLucrLifecycle(request, registries);
  const authorizedActions = filterAuthorizedLucrActions(request, binding);
  const blockedActions = binding.blockedRouterActions;

  return {
    request,
    event,
    binding,
    authorizedActions,
    blockedActions,
    quote,
    executionSteps: buildExecutionSteps(request, quote, authorizedActions),
    allowed:
      binding.shouldExecute &&
      blockedActions.length === 0 &&
      authorizedActions.length > 0,
  };
}

export function quoteLucrLifecycle(
  request: LucrLifecycleRequest,
  registries: RegistryState,
): LucrQuote {
  const rewardMultiplier = 1 + registries.lucr.rewardRate;
  const burnMultiplier = Math.max(0, 1 - registries.lucr.burnRate);

  switch (request.operation) {
    case "buy": {
      const paymentAmount = request.paymentAmount ?? request.amount;
      return {
        paymentAsset: request.paymentAsset ?? "USDC",
        paymentAmount,
        lucrAmount: roundToFour(paymentAmount * rewardMultiplier),
      };
    }
    case "sell":
      return {
        paymentAsset: request.paymentAsset ?? "USDC",
        paymentAmount: roundToFour(request.amount * burnMultiplier),
        lucrAmount: request.amount,
      };
    case "mint":
      return {
        paymentAsset: "LUCR",
        paymentAmount: 0,
        lucrAmount: roundToFour(request.amount),
      };
    case "burn":
      return {
        paymentAsset: "LUCR",
        paymentAmount: request.amount,
        lucrAmount: 0,
      };
  }
}

function filterAuthorizedLucrActions(
  request: LucrLifecycleRequest,
  binding: RouterBindingResult,
): OrchestrationAction[] {
  const allowedByBinding = binding.allowedRouterActions;

  switch (request.operation) {
    case "buy":
    case "sell":
      return allowedByBinding.filter((action) => action.action === "rebalance-lucr");
    case "mint":
      return allowedByBinding.filter(
        (action) =>
          action.action === "rebalance-lucr" ||
          action.action === "trigger-wellbeing-epoch",
      );
    case "burn":
      return allowedByBinding.filter(
        (action) =>
          action.action === "rebalance-lucr" ||
          action.action === "run-constitutional-audit",
      );
  }
}

function buildExecutionSteps(
  request: LucrLifecycleRequest,
  quote: LucrQuote,
  actions: OrchestrationAction[],
): LucrExecutionStep[] {
  if (actions.length === 0) {
    return [
      {
        stage: "offchain",
        method: "run-deterministic-contract",
        reason: "Deterministic contract denied autonomous LUCR execution.",
      },
    ];
  }

  const commonSteps: LucrExecutionStep[] = [
    {
      stage: "offchain",
      method: "run-deterministic-contract",
      reason: "Evaluate constitutional invariants and deterministic governance before execution.",
    },
    {
      stage: "offchain",
      method: "update-registries",
      reason: "Persist LUCR state, citizen impacts, and governance audit logs after execution.",
    },
  ];

  switch (request.operation) {
    case "buy":
      return [
        {
          stage: "market-router",
          method: "quote-buy",
          reason: `Quote ${quote.lucrAmount} LUCR for ${quote.paymentAmount} ${quote.paymentAsset}.`,
        },
        {
          stage: "governance",
          method: "request-mint",
          reason: "Governance authorizes router-originated LUCR minting for the purchase.",
        },
        {
          stage: "token-core",
          method: "mint",
          reason: "Mint LUCR to the citizen wallet after deterministic authorization.",
        },
        ...commonSteps,
      ];
    case "sell":
      return [
        {
          stage: "market-router",
          method: "transfer-lucr",
          reason: "Transfer LUCR from the citizen to the market router.",
        },
        {
          stage: "market-router",
          method: "quote-sell",
          reason: `Quote ${quote.lucrAmount} payout for ${request.amount} LUCR.`,
        },
        {
          stage: "market-router",
          method: "transfer-stable",
          reason: "Send the deterministic payout asset to the citizen.",
        },
        {
          stage: "governance",
          method: "request-burn",
          reason: "Governance authorizes router-originated LUCR burn after payout.",
        },
        {
          stage: "token-core",
          method: "burn",
          reason: "Burn LUCR received by the router after deterministic authorization.",
        },
        ...commonSteps,
      ];
    case "mint":
      return [
        {
          stage: "governance",
          method: "request-mint",
          reason: "Governance authorizes system-originated LUCR minting.",
        },
        {
          stage: "token-core",
          method: "mint",
          reason: "Mint LUCR to the citizen wallet for the approved policy outcome.",
        },
        ...commonSteps,
      ];
    case "burn":
      return [
        {
          stage: "governance",
          method: "request-burn",
          reason: "Governance authorizes system-originated LUCR burn.",
        },
        {
          stage: "token-core",
          method: "burn",
          reason: "Burn LUCR from the governed source wallet after deterministic authorization.",
        },
        ...commonSteps,
      ];
  }
}

function mapLucrRequestToEvent(request: LucrLifecycleRequest): SystemEvent {
  const requestIdentity =
    request.requestId ??
    `${request.citizenId}-${request.amount}-${request.paymentAmount ?? 0}-${request.walletAddress}`;

  return {
    id: `lucr-${request.operation}-${requestIdentity}`,
    type: `lucr-${request.operation}`,
    domain: "tokenomics",
    severity: request.operation === "burn" ? "high" : "medium",
    resolved: false,
  };
}

function roundToFour(value: number): number {
  return Math.round(value * 10000) / 10000;
}
