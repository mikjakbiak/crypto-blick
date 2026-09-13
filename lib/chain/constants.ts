import { parseEther } from "viem";

/** User with at least this ETH pays own gas. Below this, operator sponsors. */
export const SELF_PAY_MIN_WEI = parseEther("0.0001");

export const MIN_GIFT_WEI = parseEther("0.001");
