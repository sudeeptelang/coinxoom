"use client";

import { useEffect, useMemo, useState } from "react";

type CoinId = "bitcoin" | "ethereum" | "solana" | "avalanche-2" | "chainlink" | "ripple" | "dogecoin";

type CoinData = {
  usd: number;
  usd_market_cap: number;
  usd_24h_change: number;
  last_updated_at: number;
};

type PriceResponse = Record<CoinId, CoinData> & {
  source?: "live" | "fallback";
};

type NewsItem = {
  title: string;
  link: string;
  source: string;
  publishedAt: string;
  summary: string;
};

type NewsResponse = {
  items: NewsItem[];
  source?: "live" | "fallback";
  sourceCount?: number;
};

const coins: { id: CoinId; label: string; name: string }[] = [
  { id: "bitcoin", label: "BTC", name: "Bitcoin" },
  { id: "ethereum", label: "ETH", name: "Ethereum" },
  { id: "solana", label: "SOL", name: "Solana" },
  { id: "avalanche-2", label: "AVAX", name: "Avalanche" },
  { id: "chainlink", label: "LINK", name: "Chainlink" },
  { id: "ripple", label: "XRP", name: "XRP" },
  { id: "dogecoin", label: "DOGE", name: "Dogecoin" },
];

const fallbackPrices: PriceResponse = {
  bitcoin: { usd: 87420, usd_market_cap: 1730000000000, usd_24h_change: 4.8, last_updated_at: Math.floor(Date.now() / 1000) },
  ethereum: { usd: 4910, usd_market_cap: 590000000000, usd_24h_change: 7.2, last_updated_at: Math.floor(Date.now() / 1000) },
  solana: { usd: 198.1, usd_market_cap: 98000000000, usd_24h_change: -1.3, last_updated_at: Math.floor(Date.now() / 1000) },
  "avalanche-2": { usd: 63.77, usd_market_cap: 26000000000, usd_24h_change: 3.9, last_updated_at: Math.floor(Date.now() / 1000) },
  chainlink: { usd: 31.52, usd_market_cap: 19000000000, usd_24h_change: 2.4, last_updated_at: Math.floor(Date.now() / 1000) },
  ripple: { usd: 1.18, usd_market_cap: 68000000000, usd_24h_change: 1.7, last_updated_at: Math.floor(Date.now() / 1000) },
  dogecoin: { usd: 0.29, usd_market_cap: 43000000000, usd_24h_change: 5.1, last_updated_at: Math.floor(Date.now() / 1000) },
  source: "fallback",
};

const fallbackNews: NewsItem[] = [
  {
    title: "Bitcoin momentum returns as traders rotate back into majors",
    link: "https://www.coingecko.com/",
    source: "CoinXoom Desk",
    publishedAt: new Date().toISOString(),
    summary: "Majors lead the tape while traders watch whether broader alt strength follows through.",
  },
  {
    title: "Ethereum flow stays firm as Layer 2 activity remains elevated",
    link: "https://www.coingecko.com/",
    source: "CoinXoom Desk",
    publishedAt: new Date(Date.now() - 3600_000).toISOString(),
    summary: "Network usage and trader positioning keep Ethereum near the center of market attention.",
  },
  {
    title: "Solana ecosystem headlines continue to drive fast rotation trades",
    link: "https://www.coingecko.com/",
    source: "CoinXoom Desk",
    publishedAt: new Date(Date.now() - 7200_000).toISOString(),
    summary: "Speculators keep scanning Solana-linked themes for the next liquidity surge.",
  },
];

const moneyFormat = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const compactMoneyFormat = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 2,
});

function formatPrice(value: number) {
  if (value >= 1000) return moneyFormat.format(value);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCompact(value: number) {
  return compactMoneyFormat.format(value);
}

function formatChange(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function toneClass(value: number) {
  if (value > 0) return "positive";
  if (value < 0) return "negative";
  return "neutral";
}

function formatRelativeTime(dateString: string) {
  const diffMinutes = Math.round((new Date(dateString).getTime() - Date.now()) / 60000);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (Math.abs(diffMinutes) < 60) return rtf.format(diffMinutes, "minute");
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return rtf.format(diffHours, "hour");
  const diffDays = Math.round(diffHours / 24);
  return rtf.format(diffDays, "day");
}

export function MarketDashboard() {
  const [prices, setPrices] = useState<PriceResponse>(fallbackPrices);
  const [news, setNews] = useState<NewsItem[]>(fallbackNews);
  const [marketStatus, setMarketStatus] = useState("Loading live market data...");
  const [newsStatus, setNewsStatus] = useState("Loading crypto headlines...");

  useEffect(() => {
    let active = true;

    async function loadPrices() {
      try {
        const response = await fetch("/api/prices", { cache: "no-store" });
        if (!response.ok) throw new Error(`Request failed with ${response.status}`);
        const data: PriceResponse = await response.json();
        if (!active) return;
        setPrices(data);

        const timestamps = coins.map((coin) => data[coin.id].last_updated_at).filter(Boolean);
        const latest = timestamps.length ? new Date(Math.max(...timestamps) * 1000) : new Date();
        setMarketStatus(`${data.source === "fallback" ? "Fallback market feed" : "Live via CoinGecko"}. Updated ${latest.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.`);
      } catch {
        if (!active) return;
        setPrices(fallbackPrices);
        setMarketStatus("Fallback market feed. Live pricing is temporarily unavailable.");
      }
    }

    async function loadNews() {
      try {
        const response = await fetch("/api/news", { cache: "no-store" });
        if (!response.ok) throw new Error(`Request failed with ${response.status}`);
        const data: NewsResponse = await response.json();
        if (!active) return;
        setNews(data.items.length ? data.items : fallbackNews);
        setNewsStatus(data.source === "fallback" ? "Fallback crypto headlines" : `Live headlines across ${data.sourceCount ?? 0}+ crypto feeds`);
      } catch {
        if (!active) return;
        setNews(fallbackNews);
        setNewsStatus("Fallback crypto headlines");
      }
    }

    loadPrices();
    loadNews();
    const marketTimer = window.setInterval(loadPrices, 60000);
    const newsTimer = window.setInterval(loadNews, 300000);

    return () => {
      active = false;
      window.clearInterval(marketTimer);
      window.clearInterval(newsTimer);
    };
  }, []);

  const rankedCoins = useMemo(() => {
    return [...coins].sort((a, b) => prices[b.id].usd_market_cap - prices[a.id].usd_market_cap);
  }, [prices]);

  const stats = useMemo(() => {
    const totalMarketCap = rankedCoins.reduce((sum, coin) => sum + prices[coin.id].usd_market_cap, 0);
    const averageChange = rankedCoins.reduce((sum, coin) => sum + prices[coin.id].usd_24h_change, 0) / rankedCoins.length;
    const sortedByChange = [...rankedCoins].sort((a, b) => prices[b.id].usd_24h_change - prices[a.id].usd_24h_change);
    return {
      totalMarketCap,
      averageChange,
      topGainers: sortedByChange.slice(0, 3),
      topLosers: [...sortedByChange].reverse().slice(0, 3),
    };
  }, [prices, rankedCoins]);

  return (
    <div className="cmc-page">
      <header className="topbar">
        <div className="brand-row">
          <div className="brand-badge">CX</div>
          <div>
            <div className="brand-title">CoinXoom</div>
            <div className="brand-subtitle">Market Overview</div>
          </div>
        </div>
        <nav className="topnav" aria-label="Primary">
          <a href="#markets">Cryptocurrencies</a>
          <a href="#trending">Trending</a>
          <a href="#news">News</a>
          <a href="#watchlist">Watchlist</a>
        </nav>
        <a className="topbar-button" href="#markets">View Markets</a>
      </header>

      <main className="page-main">
        <section className="global-strip">
          <div className="global-stat"><span>Cryptos</span><strong>17,000+</strong></div>
          <div className="global-stat"><span>Exchanges</span><strong>1,100+</strong></div>
          <div className="global-stat"><span>Tracked cap</span><strong>{formatCompact(stats.totalMarketCap)}</strong></div>
          <div className="global-stat"><span>24h avg</span><strong className={toneClass(stats.averageChange)}>{formatChange(stats.averageChange)}</strong></div>
          <div className="global-stat"><span>Status</span><strong>{marketStatus}</strong></div>
        </section>

        <section className="hero-summary" id="watchlist">
          <div className="hero-copy-block">
            <p className="section-kicker">CoinXoom homepage</p>
            <h1>Crypto rankings, top movers, and news with a CoinMarketCap-style layout.</h1>
            <p>
              This version is intentionally much closer to a market utility homepage: lighter UI, denser scanning, and a table-first structure anchored around live pricing.
            </p>
          </div>
          <div className="summary-panels">
            <article className="summary-card">
              <span>Top Gainer</span>
              <strong>{stats.topGainers[0].label}</strong>
              <em className={toneClass(prices[stats.topGainers[0].id].usd_24h_change)}>{formatChange(prices[stats.topGainers[0].id].usd_24h_change)}</em>
            </article>
            <article className="summary-card">
              <span>Top Loser</span>
              <strong>{stats.topLosers[0].label}</strong>
              <em className={toneClass(prices[stats.topLosers[0].id].usd_24h_change)}>{formatChange(prices[stats.topLosers[0].id].usd_24h_change)}</em>
            </article>
            <article className="summary-card">
              <span>News Sources</span>
              <strong>11+</strong>
              <em>{newsStatus}</em>
            </article>
          </div>
        </section>

        <section className="content-grid">
          <div className="main-column">
            <section className="table-section" id="markets">
              <div className="section-head-row">
                <div>
                  <p className="section-kicker">Market rankings</p>
                  <h2>Top crypto assets</h2>
                </div>
                <p className="section-note">Live prices refresh every 60 seconds through the server-side market route.</p>
              </div>

              <div className="market-table">
                <div className="market-table-head">
                  <span>#</span>
                  <span>Name</span>
                  <span>Price</span>
                  <span>24h</span>
                  <span>Market Cap</span>
                  <span>Last Updated</span>
                </div>
                {rankedCoins.map((coin, index) => (
                  <div className="market-table-row" key={coin.id}>
                    <span>{index + 1}</span>
                    <div className="coin-cell">
                      <div className="coin-icon">{coin.label.slice(0, 1)}</div>
                      <div>
                        <strong>{coin.name}</strong>
                        <em>{coin.label}</em>
                      </div>
                    </div>
                    <strong>{formatPrice(prices[coin.id].usd)}</strong>
                    <span className={toneClass(prices[coin.id].usd_24h_change)}>{formatChange(prices[coin.id].usd_24h_change)}</span>
                    <span>{formatCompact(prices[coin.id].usd_market_cap)}</span>
                    <span>{new Date(prices[coin.id].last_updated_at * 1000).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="news-section-cmc" id="news">
              <div className="section-head-row">
                <div>
                  <p className="section-kicker">News</p>
                  <h2>Latest crypto news</h2>
                </div>
                <p className="section-note">Aggregated server-side from major crypto publishers.</p>
              </div>
              <div className="news-list">
                {news.slice(0, 18).map((item, index) => (
                  <a className={`news-row ${index === 0 ? "featured-news" : ""}`} href={item.link} key={`${item.link}-${index}`} target="_blank" rel="noreferrer">
                    <div>
                      <p className="news-source">{item.source} • {formatRelativeTime(item.publishedAt)}</p>
                      <h3>{item.title}</h3>
                      <p>{item.summary}</p>
                    </div>
                  </a>
                ))}
              </div>
            </section>
          </div>

          <aside className="sidebar-column" id="trending">
            <section className="side-panel">
              <div className="side-panel-head">
                <p className="section-kicker">Trending</p>
                <h3>Top gainers</h3>
              </div>
              <div className="mini-list">
                {stats.topGainers.map((coin) => (
                  <div className="mini-row" key={coin.id}>
                    <div>
                      <strong>{coin.name}</strong>
                      <span>{coin.label}</span>
                    </div>
                    <em className={toneClass(prices[coin.id].usd_24h_change)}>{formatChange(prices[coin.id].usd_24h_change)}</em>
                  </div>
                ))}
              </div>
            </section>

            <section className="side-panel">
              <div className="side-panel-head">
                <p className="section-kicker">Watchlist</p>
                <h3>Top losers</h3>
              </div>
              <div className="mini-list">
                {stats.topLosers.map((coin) => (
                  <div className="mini-row" key={coin.id}>
                    <div>
                      <strong>{coin.name}</strong>
                      <span>{coin.label}</span>
                    </div>
                    <em className={toneClass(prices[coin.id].usd_24h_change)}>{formatChange(prices[coin.id].usd_24h_change)}</em>
                  </div>
                ))}
              </div>
            </section>

            <section className="side-panel info-panel">
              <div className="side-panel-head">
                <p className="section-kicker">Overview</p>
                <h3>Market notes</h3>
              </div>
              <ul className="info-list">
                <li>Live crypto prices via CoinGecko through `/api/prices`</li>
                <li>Crypto headlines aggregated through `/api/news`</li>
                <li>Layout intentionally shifted toward CoinMarketCap-style utility</li>
              </ul>
            </section>
          </aside>
        </section>
      </main>
    </div>
  );
}