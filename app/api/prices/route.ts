import { NextResponse } from "next/server";

const priceIds = ["bitcoin", "ethereum", "solana", "avalanche-2", "chainlink", "ripple", "dogecoin"] as const;
const apiUrl =
  "https://api.coingecko.com/api/v3/simple/price?vs_currencies=usd&ids=" +
  priceIds.join(",") +
  "&include_market_cap=true&include_24hr_change=true&include_last_updated_at=true";

function fallback() {
  const now = Math.floor(Date.now() / 1000);
  return {
    bitcoin: { usd: 87420, usd_market_cap: 1730000000000, usd_24h_change: 4.8, last_updated_at: now },
    ethereum: { usd: 4910, usd_market_cap: 590000000000, usd_24h_change: 7.2, last_updated_at: now },
    solana: { usd: 198.1, usd_market_cap: 98000000000, usd_24h_change: -1.3, last_updated_at: now },
    "avalanche-2": { usd: 63.77, usd_market_cap: 26000000000, usd_24h_change: 3.9, last_updated_at: now },
    chainlink: { usd: 31.52, usd_market_cap: 19000000000, usd_24h_change: 2.4, last_updated_at: now },
    ripple: { usd: 1.18, usd_market_cap: 68000000000, usd_24h_change: 1.7, last_updated_at: now },
    dogecoin: { usd: 0.29, usd_market_cap: 43000000000, usd_24h_change: 5.1, last_updated_at: now },
    source: "fallback",
  };
}

export async function GET() {
  try {
    const response = await fetch(apiUrl, {
      headers: { accept: "application/json" },
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      throw new Error(`CoinGecko request failed with ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json({ ...data, source: "live" });
  } catch {
    return NextResponse.json(fallback());
  }
}
