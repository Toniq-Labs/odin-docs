import { describe, it, expect } from 'vitest';
import { getPriceImpact } from '../../utils/getPriceImpact';
import { Token } from '../../types/token';

describe('getPriceImpact', () => {
  // Sample token data based on ODINDOG token
  const sampleToken: Pick<
    Token,
    | "id"
    | "name"
    | "image"
    | "price"
    | "ticker"
    | "token_liquidity"
    | "btc_liquidity"
    | "user_lp_tokens"
    | "user_btc_liquidity"
    | "user_token_liquidity"
    | "sold"
    | "bonded"
    | "decimals"
    | "divisibility"
  > = {
    id: "2jjj",
    name: "ODINDOG",
    image: "5707baf4-9a4f-4618-b2d6-19d2b397c488.webp",
    price: 330189,
    ticker: "ODINDOG",
    token_liquidity: BigInt("91549588409635445"),
    btc_liquidity: BigInt("302286688964"),
    user_lp_tokens: BigInt("71796470791782687"),
    user_btc_liquidity: BigInt("134734285721"),
    user_token_liquidity: BigInt("40806274831960704"),
    sold: BigInt("1680000000000000000"),
    bonded: true,
    decimals: 3,
    divisibility: 8,
  };

  // Non-bonded token for testing bonding curve calculations
  const unbondedToken: typeof sampleToken = {
    id: "2xxx",
    name: "UNBONDED TOKEN",
    image: "5707baf4-9a4f-4618-b2d6-19d2b397c488.webp",
    price: 984,
    ticker: "UNBONDED",
    token_liquidity: BigInt(0),
    btc_liquidity: BigInt(0),
    user_lp_tokens: BigInt(0),
    user_btc_liquidity: BigInt(0),
    user_token_liquidity: BigInt(0),
    sold: BigInt("963485413186288939"),
    bonded: false,
    decimals: 3,
    divisibility: 8,
  };

  describe('bonded token scenarios', () => {
    it('should calculate price impact for 1 BTC buy order', () => {
      const priceImpact = getPriceImpact("btc", "1", sampleToken, true);
      
      expect(priceImpact).not.toBeNull();
      expect(typeof priceImpact).toBe('number');
      expect(((priceImpact || 0) * 100).toFixed(2)).toBe("32.92"); // %
    });

    it('should calculate price impact for 100000 ODINDOG buy order', () => {
      const priceImpact = getPriceImpact("token", "100000", sampleToken, true);
      
      expect(priceImpact).not.toBeNull();
      expect(typeof priceImpact).toBe('number');
      expect(((priceImpact || 0) * 100).toFixed(2)).toBe("12.83"); 
    });

    it('should calculate price impact for 100000 ODINDOG sell order', () => {
      const priceImpact = getPriceImpact("token", "100000", sampleToken, false);
      
      expect(priceImpact).not.toBeNull();
      expect(typeof priceImpact).toBe('number');
      expect(((priceImpact || 0) * 100).toFixed(2)).toBe("10.30");
    });

    it('should calculate price impact for 1.57 BTC sell order', () => {
      const priceImpact = getPriceImpact("btc", "1.57", sampleToken, false);
      
      expect(priceImpact).not.toBeNull();
      expect(typeof priceImpact).toBe('number');
      expect(((priceImpact || 0) * 100).toFixed(2)).toBe("52.20"); 
    });
  });

  describe('unbonded token scenarios', () => {
    it('should calculate price impact for 0.01 BTC buy on bonding curve', () => {
      const priceImpact = getPriceImpact("btc", "0.01", unbondedToken, true);
      
      expect(priceImpact).not.toBeNull();
      expect(typeof priceImpact).toBe('number');
      expect(((priceImpact || 0) * 100).toFixed(2)).toBe("11.79");
    });

    it('should calculate price impact for 100000 UNBONDED sell on bonding curve', () => {
      const priceImpact = getPriceImpact("token", "100000", unbondedToken, false);
      
      expect(priceImpact).not.toBeNull();
      expect(typeof priceImpact).toBe('number');
      expect(((priceImpact || 0) * 100).toFixed(2)).toBe("2.13");

    });
  });

  describe('edge cases', () => {
    it('should return null for zero amount', () => {
      const priceImpact = getPriceImpact("btc", "0", sampleToken, true);
      
      expect(priceImpact).toBeNull();
    });

    it('should return null for empty string amount', () => {
      const priceImpact = getPriceImpact("btc", "", sampleToken, true);
      
      expect(priceImpact).toBeNull();
    });

    it('should return null for NaN amount', () => {
      const priceImpact = getPriceImpact("btc", "not-a-number", sampleToken, true);
      
      expect(priceImpact).toBeNull();
    });

    it('should return null when btc_liquidity is null for bonded token', () => {
      const tokenWithNullLiquidity = {
        ...sampleToken,
        btc_liquidity: null as any,
      };
      
      const priceImpact = getPriceImpact("btc", "1000000", tokenWithNullLiquidity, true);
      
      expect(priceImpact).toBeNull();
    });

    it('should return null when token_liquidity is null for bonded token', () => {
      const tokenWithNullLiquidity = {
        ...sampleToken,
        token_liquidity: null as any,
      };
      
      const priceImpact = getPriceImpact("btc", "1000000", tokenWithNullLiquidity, true);
      
      expect(priceImpact).toBeNull();
    });
  });

  describe('price impact calculations', () => {
    it('should have different price impacts for different amounts', () => {
      const smallAmount = getPriceImpact("btc", "1", sampleToken, true);
      const largeAmount = getPriceImpact("btc", "2", sampleToken, true);
      
      expect(smallAmount).not.toBeNull();
      expect(largeAmount).not.toBeNull();
      expect(largeAmount!).toBeGreaterThan(smallAmount!);
    });

    it('should have different price impacts for buy vs sell', () => {
      const buyImpact = getPriceImpact("btc", "1", sampleToken, true);
      const sellImpact = getPriceImpact("btc", "1", sampleToken, false);
      
      expect(buyImpact).not.toBeNull();
      expect(sellImpact).not.toBeNull();
      // Both should be positive but potentially different values
      expect(buyImpact!).toBeGreaterThan(0);
      expect(sellImpact!).toBeGreaterThan(0);

      expect(sellImpact).toBeGreaterThan(buyImpact!);
    });

    it('should handle very small amounts', () => {
      const priceImpact = getPriceImpact("btc", "0.0000001", sampleToken, true);
      
      expect(priceImpact).not.toBeNull();
      expect(typeof priceImpact).toBe('number');
      expect(priceImpact).toBeGreaterThanOrEqual(0);
    });
  });
});