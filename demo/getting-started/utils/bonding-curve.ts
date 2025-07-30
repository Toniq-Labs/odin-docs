export const TOKEN_DECIMALS = BigInt(100_000_000_000); // 10^11 millitokens per token

export interface Curve {
  name: string;
  a: number;
  b: number;
  c: number;
}
export const CURRENT_CURVE = {
  name: "standard",
  a: 0.11803,
  b: 0.0000002200866,
  c: 0,
};
/**
 * Convert a BTC amount to token amount based on the curve.
 * @param curve - The curve parameters.
 * @param btcAmount - The amount in millisatoshis.
 * @param currentSupply - The current supply in millitokens.
 * @param isBuy - Whether the operation is a buy (true) or sell (false).
 * @returns The token amount in millitokens.
 */
export function getTokenAmount(
  curve: Curve,
  btcAmount: bigint,
  currentSupply: bigint,
  isBuy: boolean,
): bigint {
  const btcInSats = Number(btcAmount) / 1000.0; // Convert millisats to sats
  const x1 = Number(currentSupply) / Number(TOKEN_DECIMALS); // Convert millitokens to tokens

  const x2 =
    (1.0 / curve.b) *
    Math.log((curve.b / curve.a) * btcInSats + Math.exp(curve.b * x1));

  // Convert result back to millitokens
  return BigInt(
    Math.abs(Math.floor((isBuy ? x2 - x1 : x1 - x2) * Number(TOKEN_DECIMALS))),
  );
}

/**
 * Convert a token amount to BTC amount based on the curve.
 * @param curve - The curve parameters.
 * @param tokenAmount - The token amount in millitokens.
 * @param currentSupply - The current supply in millitokens.
 * @param isBuy - Whether the operation is a buy (true) or sell (false).
 * @returns The BTC amount in millisatoshis.
 */
export function getBtcAmount(
  curve: Curve,
  tokenAmount: bigint,
  currentSupply: bigint,
  isBuy: boolean,
): bigint {
  const tokens = Number(tokenAmount) / Number(TOKEN_DECIMALS); // Convert millitokens to tokens
  const x = Number(currentSupply) / Number(TOKEN_DECIMALS); // Convert millitokens to tokens

  const x1 = isBuy ? x : x - tokens;
  const x2 = isBuy ? x + tokens : x;

  const totalCostInSats =
    (curve.a / curve.b) * (Math.exp(curve.b * x2) - Math.exp(curve.b * x1));

  // Convert to millisats
  return BigInt(Math.abs(Math.ceil(totalCostInSats * 1000)));
}

/**
 * Get the price at a specific supply level based on the curve.
 * @param curve - The curve parameters.
 * @param tokensSold - The tokens sold in millitokens.
 * @returns The price in millisatoshis.
 */
export function getPriceAtSupply(curve: Curve, tokensSold: bigint): bigint {
  const x = Number(tokensSold) / Number(TOKEN_DECIMALS); // Convert millitokens to tokens
  const price = curve.a * Math.exp(curve.b * x);

  // Convert to millisats
  return BigInt(Math.abs(Math.ceil(price * 1000)));
}
