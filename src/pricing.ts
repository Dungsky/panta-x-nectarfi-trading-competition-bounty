import type { MarketOutcome, MarketState } from './types.js';

export class PredictionPricingModel {
  /**
   * Computes implied probability of YES outcome using Logarithmic Market Scoring Rule (LMSR)
   * P(YES) = exp(q_yes / b) / (exp(q_yes / b) + exp(q_no / b))
   */
  static getImpliedProbability(market: MarketState): { pYes: number; pNo: number } {
    const b = Number(market.liquidityParamB);
    const qYes = Number(market.yesPool);
    const qNo = Number(market.noPool);

    if (b <= 0) {
      throw new Error('Liquidity parameter b must be strictly positive');
    }

    // Normalize exponent to prevent floating point overflow
    const maxQ = Math.max(qYes, qNo);
    const expYes = Math.exp((qYes - maxQ) / b);
    const expNo = Math.exp((qNo - maxQ) / b);
    const sum = expYes + expNo;

    const pYes = expYes / sum;
    const pNo = expNo / sum;

    return {
      pYes: Math.max(0.0001, Math.min(0.9999, pYes)),
      pNo: Math.max(0.0001, Math.min(0.9999, pNo))
    };
  }

  /**
   * Kelly Criterion Optimal Bet Sizing:
   * f* = (b * p - q) / b
   * where:
   *   b = net fractional odds received on the wager (odds - 1)
   *   p = probability of winning
   *   q = probability of losing (1 - p)
   */
  static calculateKellySize(
    bankrollUsdg: number,
    estimatedProb: number,
    marketPrice: number,
    fractionalKelly: number = 0.5 // Half-Kelly for conservative capital preservation
  ): number {
    if (marketPrice <= 0 || marketPrice >= 1 || estimatedProb <= marketPrice) {
      return 0;
    }

    const odds = 1 / marketPrice;
    const b = odds - 1;
    const p = estimatedProb;
    const q = 1 - p;

    const fullKellyFraction = (b * p - q) / b;
    if (fullKellyFraction <= 0) return 0;

    const targetFraction = Math.min(fullKellyFraction * fractionalKelly, 0.25); // Cap at 25% max bankroll per market
    return Math.floor(bankrollUsdg * targetFraction * 100) / 100;
  }

  /**
   * Estimates output shares for a given amount in USDG, accounting for protocol fees
   */
  static estimateSharesOut(
    amountInUsdg: bigint,
    outcome: MarketOutcome,
    market: MarketState
  ): { sharesOut: bigint; effectivePrice: number; feePaid: bigint } {
    const feePaid = (amountInUsdg * BigInt(market.feeBps)) / 10000n;
    const netAmount = amountInUsdg - feePaid;

    const { pYes, pNo } = this.getImpliedProbability(market);
    const basePrice = outcome === 'YES' ? pYes : pNo;

    // Approximating marginal share yield for size
    const rawShares = Number(netAmount) / basePrice;
    const sharesOut = BigInt(Math.floor(rawShares));
    const effectivePrice = Number(amountInUsdg) / (rawShares || 1);

    return {
      sharesOut,
      effectivePrice,
      feePaid
    };
  }
}
