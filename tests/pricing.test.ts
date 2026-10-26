import { describe, it, expect } from 'vitest';
import { PredictionPricingModel } from '../src/pricing.js';
import type { MarketState } from '../src/types.js';

describe('PredictionPricingModel Invariants', () => {
  const sampleMarket: MarketState = {
    marketId: 'solana-breakpoint-winner-2026',
    question: 'Will Solana break $300 before Q4 2026?',
    yesPool: 50_000n,
    noPool: 50_000n,
    liquidityParamB: 10_000n,
    feeBps: 30,
    status: 'OPEN'
  };

  it('should return symmetrical 50/50 probability on balanced pools', () => {
    const { pYes, pNo } = PredictionPricingModel.getImpliedProbability(sampleMarket);
    expect(pYes).toBeCloseTo(0.5, 2);
    expect(pNo).toBeCloseTo(0.5, 2);
    expect(pYes + pNo).toBeCloseTo(1.0, 4);
  });

  it('should shift probability towards YES when YES pool has more weight', () => {
    const skewedMarket: MarketState = {
      ...sampleMarket,
      yesPool: 80_000n,
      noPool: 20_000n
    };
    const { pYes, pNo } = PredictionPricingModel.getImpliedProbability(skewedMarket);
    expect(pYes).toBeGreaterThan(0.5);
    expect(pNo).toBeLessThan(0.5);
  });

  it('should compute safe Kelly bet size and cap at max risk threshold', () => {
    const bankroll = 10_000;
    const estimatedProb = 0.65;
    const marketPrice = 0.50;

    const betSize = PredictionPricingModel.calculateKellySize(bankroll, estimatedProb, marketPrice);
    expect(betSize).toBeGreaterThan(0);
    expect(betSize).toBeLessThanOrEqual(bankroll * 0.25); // Invariant: max 25% allocation
  });

  it('should return 0 bet size if no edge exists (estimated <= marketPrice)', () => {
    const betSize = PredictionPricingModel.calculateKellySize(10_000, 0.45, 0.50);
    expect(betSize).toBe(0);
  });
});
