import { Token } from "../types/token";
import { convertToPreciseBigInt } from "./bigint";
import {
  CURRENT_CURVE,
  getBtcAmount,
  getTokenAmount,
} from "./bonding-curve";

export const getMinimumReceived = (
  currency: "btc" | "token",
  amount: string,
  token: Pick<
    Token,
    | "id"
    | "name"
    | "price"
    | "ticker"
    | "token_liquidity"
    | "btc_liquidity"
    | "sold"
    | "bonded"
    | "divisibility"
    | "decimals"
  >,
  isBuy: boolean,
) => {
  if (token.bonded) {
    if (token.btc_liquidity === null || token.token_liquidity === null) {
      return 0;
    }
    const btcLiquidity = BigInt(token.btc_liquidity);
    const tokenLiquidity = BigInt(token.token_liquidity);
    const k = btcLiquidity * tokenLiquidity;
    if (currency === "btc") {
      const btcAmount = convertToPreciseBigInt(amount);
      if (isBuy) {
        const effectiveBtc = (btcAmount * BigInt(995)) / BigInt(1000);
        const newTokens = k / (btcLiquidity + effectiveBtc);
        const tokenAmount = tokenLiquidity - newTokens;
        return Number(tokenAmount);
      } else {
        if (btcAmount > btcLiquidity) return 0;
        const effectiveBtc = (btcAmount * BigInt(1000)) / BigInt(995);
        const newTokens = k / (btcLiquidity - effectiveBtc);
        const tokenAmount = newTokens - tokenLiquidity;
        return Number(tokenAmount);
      }
    } else {
      const tokenAmount = convertToPreciseBigInt(
        amount,
        token.divisibility + token.decimals,
      );
      if (isBuy) {
        if (tokenAmount > tokenLiquidity) return 0;
        const newBtc = k / (tokenLiquidity - tokenAmount);
        const btcNeeded = newBtc - btcLiquidity;
        const effectiveBtc = (btcNeeded * BigInt(1000)) / BigInt(995);
        return Number(effectiveBtc);
      } else {
        const newTokens = tokenLiquidity + tokenAmount;
        const newBtc = k / newTokens;
        const btcAmount = btcLiquidity - newBtc;
        const effectiveBtc = (btcAmount * BigInt(995)) / BigInt(1000);
        return Number(effectiveBtc);
      }
    }
  } else {
    if (currency === "btc") {
      return Number(
        getTokenAmount(
          CURRENT_CURVE,
          (convertToPreciseBigInt(amount) * BigInt(99)) / BigInt(100),
          BigInt(token.sold),
          isBuy,
        ),
      );
    } else {
      return Number(
        (getBtcAmount(
          CURRENT_CURVE,
          convertToPreciseBigInt(amount),
          BigInt(token.sold),
          isBuy,
        ) *
          BigInt(99)) /
          BigInt(100),
      );
    }
  }
};
