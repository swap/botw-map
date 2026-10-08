import fs from "node:fs";

const path = new URL("../public/data/markers.json", import.meta.url);
const data = JSON.parse(fs.readFileSync(path, "utf8"));

function wikiPath(name) {
  return encodeURIComponent(name.trim().replace(/\s+/g, "_")).replace(/%3A/g, ":");
}

function linksFor(marker) {
  const name = marker.name?.trim();
  if (!name) return { guide: null, wiki: null, videos: null };

  let guideName = name;
  let wikiName = name;
  if (marker.category === "korok") {
    const place = marker.info?.placeName || marker.location;
    const seed = marker.info?.seedId;
    if (place && seed) guideName = `${place}#${seed}`;
    wikiName = "Korok Seed";
  }

  const q = encodeURIComponent(`${name} breath of the wild`);
  return {
    guide: `https://www.zeldadungeon.net/wiki/${wikiPath(guideName.split("#")[0])}${
      guideName.includes("#") ? "#" + guideName.split("#")[1] : ""
    }`,
    wiki: `https://zeldawiki.wiki/wiki/${wikiPath(wikiName)}`,
    videos: `https://www.youtube.com/results?search_query=${q}`,
  };
}

function templateText(inner) {
  const parts = inner.split("|");
  const name = parts[0].trim();
  if (name.startsWith("Term")) return (parts[1] || "").trim();
  if (name === "BotW" || name === "Series") return "Breath of the Wild";
  if (name === "Big" || name.startsWith("Color")) return (parts[parts.length - 1] || "").trim();
  return "";
}

function replaceTemplates(src) {
  let text = src;
  let prev = "";
  while (text !== prev) {
    prev = text;
    text = text.replace(/\{\{([^{}]*)\}\}/g, (_, inner) => templateText(inner));
  }
  return text.replace(/\{\{[\s\S]*?\}\}/g, "");
}

function plain(src) {
  let text = replaceTemplates(src);
  text = text.replace(/<ref[\s\S]*?<\/ref>/gi, "");
  text = text.replace(/<ref[^>]*\/?>/gi, "");
  text = text.replace(/\[\[(?:[^|\]]+\|)?([^\]]+)\]\]/g, "$1");
  text = text.replace(/'''?/g, "");
  text = text.replace(/<div[\s\S]*?<\/div>/gi, " ");
  text = text.replace(/<[^>]+>/g, "");
  text = text.replace(/<br\s*\/?>/gi, " ");
  text = text
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(
      (line) =>
        line &&
        !line.startsWith("|") &&
        !/^={2,}/.test(line) &&
        !/thumb\|/.test(line) &&
        line !== "}}",
    )
    .join("\n");
  return text.replace(/\n{3,}/g, "\n\n").replace(/[ ]{2,}/g, " ").trim();
}

function shrineBlurb(wikitext) {
  const body = wikitext.replace(/^\{\{Infobox[\s\S]*?\n\}\}\s*/m, "");
  const lead = plain(body.split(/\n==/)[0]).replace(/\s+/g, " ").trim();
  const sentence = lead.match(/^[\s\S]+?[.!?](?=\s|$)/);
  return (sentence ? sentence[0] : lead).trim() || null;
}

async function shrineText(names) {
  const out = new Map();
  for (let i = 0; i < names.length; i += 20) {
    const batch = names.slice(i, i + 20);
    const url = new URL("https://zeldawiki.wiki/w/api.php");
    url.searchParams.set("action", "query");
    url.searchParams.set("prop", "revisions");
    url.searchParams.set("rvprop", "content");
    url.searchParams.set("rvslots", "main");
    url.searchParams.set("format", "json");
    url.searchParams.set("formatversion", "2");
    url.searchParams.set("titles", batch.join("|"));
    const res = await fetch(url, { headers: { "User-Agent": "botw-map/0.1" } });
    if (!res.ok) throw new Error(`wiki ${res.status}`);
    const json = await res.json();
    for (const page of json.query?.pages || []) {
      const content = page.revisions?.[0]?.slots?.main?.content || "";
      if (page.title && content) out.set(page.title, shrineBlurb(content));
    }
    process.stdout.write(`  shrines ${Math.min(i + 20, names.length)}/${names.length}\n`);
  }
  return out;
}

const shrines = data.markers.filter((m) => m.category === "shrine");
const blurbs = await shrineText(shrines.map((m) => m.name));

let described = 0;
for (const marker of data.markers) {
  marker.links = linksFor(marker);
  if (marker.category === "shrine") {
    const text = blurbs.get(marker.name);
    if (text) {
      marker.description = text;
      described++;
    }
  }
}

fs.writeFileSync(path, JSON.stringify(data));
const sample = data.markers.find((m) => m.name === "Tu Ka'loh Shrine");
console.log("described", described, "/", shrines.length);
console.log(sample?.links);
console.log(sample?.description?.slice(0, 400));
