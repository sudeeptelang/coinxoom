import { NextResponse } from "next/server";

type NewsItem = {
  title: string;
  link: string;
  source: string;
  publishedAt: string;
  summary: string;
};

const feeds = [
  { source: "Cointelegraph", url: "https://cointelegraph.com/rss" },
  { source: "Decrypt", url: "https://decrypt.co/feed" },
  { source: "The Defiant", url: "https://thedefiant.io/feed" },
  { source: "Bitcoin Magazine", url: "https://bitcoinmagazine.com/.rss/full/" },
  { source: "CryptoSlate", url: "https://cryptoslate.com/feed/" },
  { source: "AMBCrypto", url: "https://ambcrypto.com/feed/" },
  { source: "Blockworks", url: "https://blockworks.co/feed/" },
  { source: "BeInCrypto", url: "https://beincrypto.com/feed/" },
  { source: "CoinJournal", url: "https://coinjournal.net/news/feed/" },
  { source: "U.Today", url: "https://u.today/rss" },
  { source: "Bitcoin.com News", url: "https://news.bitcoin.com/feed/" }
];

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

function decodeEntities(text: string) {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function readTag(block: string, tag: string) {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeEntities(match[1]) : "";
}

function readAtomLink(block: string) {
  const match = block.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>(?:<\/link>)?/i);
  return match ? decodeEntities(match[1]) : "";
}

function parseItems(xml: string, source: string): NewsItem[] {
  const rssItems = Array.from(xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)).map((match) => match[0]);
  const atomItems = Array.from(xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi)).map((match) => match[0]);
  const blocks = [...rssItems, ...atomItems].slice(0, 12);

  return blocks
    .map((block) => {
      const title = readTag(block, "title");
      const link = readTag(block, "link") || readAtomLink(block) || readTag(block, "id");
      const publishedAt =
        readTag(block, "pubDate") ||
        readTag(block, "published") ||
        readTag(block, "updated") ||
        new Date().toISOString();
      const summary =
        readTag(block, "description") ||
        readTag(block, "summary") ||
        readTag(block, "content:encoded") ||
        "Latest crypto market coverage from a major news source.";

      if (!title || !link) return null;
      return { title, link, source, publishedAt, summary };
    })
    .filter((item): item is NewsItem => Boolean(item));
}

export async function GET() {
  try {
    const results = await Promise.all(
      feeds.map(async (feed) => {
        try {
          const response = await fetch(feed.url, {
            headers: { accept: "application/rss+xml, application/atom+xml, application/xml, text/xml" },
            next: { revalidate: 900 },
          });

          if (!response.ok) return [];
          const xml = await response.text();
          return parseItems(xml, feed.source);
        } catch {
          return [];
        }
      })
    );

    const deduped = new Map<string, NewsItem>();
    for (const item of results.flat()) {
      const key = `${item.title.toLowerCase()}|${item.link}`;
      if (!deduped.has(key)) deduped.set(key, item);
    }

    const items = Array.from(deduped.values())
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, 36);

    return NextResponse.json({
      items: items.length ? items : fallbackNews,
      source: items.length ? "live" : "fallback",
      sourceCount: feeds.length,
    });
  } catch {
    return NextResponse.json({ items: fallbackNews, source: "fallback", sourceCount: feeds.length });
  }
}
