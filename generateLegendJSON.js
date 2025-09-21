// generateLegendJSON.js
const { XMLParser } = require("fast-xml-parser");
const fs = require("fs");
const crypto = require("crypto");

const RSS_URL = "https://feeds.acast.com/public/shows/646cbb0bb160e00011df3980";

(async () => {
  try {
    console.log("📡 Fetching RSS:", RSS_URL);
    const res = await fetch(RSS_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const xml = await res.text();

    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });
    const jsonObj = parser.parse(xml);

    let itemsRaw = [];
    const channel = jsonObj.rss?.channel;
    if (channel) {
      if (Array.isArray(channel.item)) itemsRaw = channel.item;
      else if (channel.item) itemsRaw = [channel.item];
    }

    const items = itemsRaw
      .map((item) => {
        const guid =
          (item.guid &&
            (typeof item.guid === "object"
              ? item.guid["#text"] || item.guid["#cdata"]
              : item.guid)) ||
          item.link ||
          crypto
            .createHash("md5")
            .update((item.title || "") + (item.pubDate || ""))
            .digest("hex");

        const audio =
          item.enclosure?.url ||
          (item["media:content"] && item["media:content"].url) ||
          null;

        return {
          guid,
          title: item.title || "Épisode sans titre",
          audioUrl: audio,
          pubDate: item.pubDate || null,
        };
      })
      .filter((ep) => ep.audioUrl);

    fs.writeFileSync("legendEpisodes.json", JSON.stringify(items, null, 2));
    console.log("✅ JSON généré avec", items.length, "épisodes");
    process.exit(0);
  } catch (err) {
    console.error("❌ Erreur génération JSON:", err);
    process.exit(1);
  }
})();
