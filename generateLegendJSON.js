const { XMLParser } = require('fast-xml-parser');
const fs = require('fs');

const RSS_URL = 'https://feeds.acast.com/public/shows/646cbb0bb160e00011df3980';
const OUTPUT_FILE = 'legendEpisodes.json';

(async () => {
  try {
    console.log('📡 Fetching RSS:', RSS_URL);
    const res = await fetch(RSS_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const xml = await res.text();

    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });
    const jsonObj = parser.parse(xml);

    let itemsRaw = [];
    const channel = jsonObj.rss?.channel;
    if (channel) {
      if (Array.isArray(channel.item)) itemsRaw = channel.item;
      else if (channel.item) itemsRaw = [channel.item];
    }

    const newItems = itemsRaw
      .map(item => {
        const guid =
          (item.guid && (typeof item.guid === 'object' ? item.guid['#text'] || item.guid['#cdata'] : item.guid)) ||
          item.link ||
          null;
        const audio =
          item.enclosure?.url ||
          (item['media:content'] && item['media:content'].url) ||
          null;

        return {
          guid,
          title: item.title || 'Épisode sans titre',
          audioUrl: audio,
          pubDate: item.pubDate || null
        };
      })
      .filter(ep => ep.guid && ep.audioUrl);

    // Charger l’ancien JSON si dispo
    let existing = [];
    if (fs.existsSync(OUTPUT_FILE)) {
      try {
        existing = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
      } catch (e) {
        console.warn('⚠️ Impossible de lire legendEpisodes.json existant, on repart de zéro');
      }
    }

    // Fusionner : on garde les anciens, on ajoute les nouveaux
    const merged = [...newItems, ...existing].reduce((acc, ep) => {
      acc[ep.guid] = ep; // écrase les doublons par guid
      return acc;
    }, {});

    const mergedArray = Object.values(merged).sort(
      (a, b) => new Date(b.pubDate || 0) - new Date(a.pubDate || 0)
    );

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(mergedArray, null, 2));
    console.log('✅ JSON mis à jour avec', mergedArray.length, 'épisodes');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur génération JSON:', err);
    process.exit(1);
  }
})();
