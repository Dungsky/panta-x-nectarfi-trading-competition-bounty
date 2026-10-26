export type MarketOutcome = 'YES' | 'NO';

export interface MarketState {
  marketId: string;
  question: string;
  yesPool: bigint;
  noPool: bigint;
  liquidityParamB: bigint;
  feeBps: number; // e.g. 30 = 0.3%
  status: 'OPEN' | 'RESOLVED';
  resolvedOutcome?: MarketOutcome;
}

export interface OrderIntent {
  marketId: string;
  outcome: MarketOutcome;
  amountInUsdg: bigint;
  minSharesOut: bigint;
  maxSlippageBps: number;
}

export interface ExecutionReceipt {
  txSignature: string;
  marketId: string;
  outcome: MarketOutcome;
  sharesPurchased: bigint;
  avgPrice: number;
  feePaidUsdg: bigint;
  computeUnitsConsumed: number;
  timestamp: number;
}

export interface HedgingPosition {
  predictionMarketExposure: number; // in USDG
  hedgeRatio: number;
  spotHedgeBalance: number;
  unrealizedPnL: number;
}
