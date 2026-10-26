import { describe, it, expect } from 'vitest';
import { PantaNectarFiTradingEngine } from '../src/engine.js';
import type { MarketState, OrderIntent } from '../src/types.js';

describe('PantaNectarFiTradingEngine Execution & Hedging', () => {
  const engine = new PantaNectarFiTradingEngine();

  const market: MarketState = {
    marketId: 'nectarfi-competition-vol-market',
    question: 'NectarFi 30-day competition volume exceeds $10M USDG?',
    yesPool: 25_000n,
    noPool: 25_000n,
    liquidityParamB: 5_000n,
    feeBps: 25,
    status: 'OPEN'
  };

  engine.registerMarket(market);

  it('should successfully execute a YES trade and track compute units', async () => {
    const order: OrderIntent = {
      marketId: 'nectarfi-competition-vol-market',
      outcome: 'YES',
      amountInUsdg: 500n,
      minSharesOut: 800n,
      maxSlippageBps: 100
    };

    const receipt = await engine.executeTrade(order);
    expect(receipt.marketId).toBe('nectarfi-competition-vol-market');
    expect(receipt.outcome).toBe('YES');
    expect(receipt.sharesPurchased).toBeGreaterThanOrEqual(order.minSharesOut);
    expect(receipt.computeUnitsConsumed).toBeLessThan(100_000);
  });

  it('should update delta hedge position when exposure changes', () => {
    const hedge = engine.getHedgingPosition('nectarfi-competition-vol-market');
    expect(hedge).toBeDefined();
    expect(hedge?.predictionMarketExposure).toBe(500);
    expect(hedge?.spotHedgeBalance).toBe(-400); // 80% negative delta hedge
  });

  it('should reject execution when market is closed/resolved', async () => {
    const closedMarket: MarketState = {
      ...market,
      marketId: 'resolved-market',
      status: 'RESOLVED',
      resolvedOutcome: 'YES'
    };
    engine.registerMarket(closedMarket);

    const order: OrderIntent = {
      marketId: 'resolved-market',
      outcome: 'YES',
      amountInUsdg: 100n,
      minSharesOut: 1n,
      maxSlippageBps: 100
    };

    await expect(engine.executeTrade(order)).rejects.toThrow('Cannot execute trade on non-open market');
  });
});
