import { Token } from "../types/token";
import { convertToPreciseBigInt } from "../utils/bigint";
import {
  CURRENT_CURVE,
  getBtcAmount,
  getTokenAmount,
} from "../utils/bonding-curve";

export const getPriceImpact = (
  currency: "btc" | "token",
  amount: string,
  token: Pick<
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
  >,
  isBuy: boolean,
) => {
  const MSAT_MULTI = BigInt(10 ** (token.decimals + token.divisibility));

  if (Number(amount) === 0 || isNaN(+amount)) return null;
  let tradePrice = BigInt(0);
  if (token.bonded) {
    if (token.btc_liquidity === null || token.token_liquidity === null) {
      return null;
    }
    const btcLiquidity = BigInt(token.btc_liquidity);
    const tokenLiquidity = BigInt(token.token_liquidity);
    const k = BigInt(token.btc_liquidity) * BigInt(token.token_liquidity);
    if (currency === "btc") {
      const btcAmount = convertToPreciseBigInt(amount);
      if (isBuy) {
        const effectiveBtc = (btcAmount * BigInt(995)) / BigInt(1000);
        const newTokens = k / (btcLiquidity + effectiveBtc);
        const tokenAmount = tokenLiquidity - newTokens;
        tradePrice = (effectiveBtc * MSAT_MULTI) / tokenAmount;
      } else {
        if (btcAmount > btcLiquidity) return null;
        const effectiveBtc = (btcAmount * BigInt(1000)) / BigInt(995);
        const newTokens = k / (btcLiquidity - effectiveBtc);
        const tokenAmount = newTokens - tokenLiquidity;
        tradePrice = (effectiveBtc * MSAT_MULTI) / tokenAmount;
      }
    } else {
      const tokenAmount = convertToPreciseBigInt(
        amount,
        token.divisibility + token.decimals,
      );
      if (isBuy) {
        if (tokenAmount > tokenLiquidity) return null;
        const newBtc = k / (tokenLiquidity - tokenAmount);
        const btcNeeded = newBtc - btcLiquidity;
        const effectiveBtc = (btcNeeded * BigInt(1000)) / BigInt(995);
        tradePrice = (effectiveBtc * MSAT_MULTI) / tokenAmount;
      } else {
        const newTokens = tokenLiquidity + tokenAmount;
        const newBtc = k / newTokens;
        const btcAmount = btcLiquidity - newBtc;
        const effectiveBtc = (btcAmount * BigInt(995)) / BigInt(1000);
        tradePrice = (effectiveBtc * MSAT_MULTI) / tokenAmount;
      }
    }
  } else {
    if (currency === "btc") {
      const tokenAmount = getTokenAmount(
        CURRENT_CURVE,
        (convertToPreciseBigInt(amount) * BigInt(99)) / BigInt(100),
        BigInt(token.sold),
        isBuy,
      );
      if (tokenAmount > BigInt(0)) {
        tradePrice =
          (convertToPreciseBigInt(amount) * MSAT_MULTI) / tokenAmount;
      }
    } else {
      const btcAmount =
        (getBtcAmount(
          CURRENT_CURVE,
          convertToPreciseBigInt(amount),
          BigInt(token.sold),
          isBuy,
        ) *
          BigInt(99)) /
        BigInt(100);
      tradePrice = (btcAmount * MSAT_MULTI) / convertToPreciseBigInt(amount);
    }
  }
  if (tradePrice == BigInt(0)) {
    return null;
  }
  if (isBuy) {
    return (Number(tradePrice) - token.price) / token.price;
  } else {
    return (token.price - Number(tradePrice)) / token.price;
  }
};
