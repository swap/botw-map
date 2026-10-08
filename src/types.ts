export type MarkerCategory =
  | "shrine"
  | "korok"
  | "tower"
  | "lab"
  | "mainQuest"
  | "shrineQuest"
  | "sideQuest"
  | "objective"
  | "memory"
  | "chest"
  | "stable"
  | "village"
  | "settlement"
  | "shop"
  | "landmark"
  | "subregion"
  | "greatFairy"
  | "goddess"
  | "talus"
  | "hinox"
  | "lynel"
  | "molduga"
  | "guardian"
  | "cookingPot"
  | "raft";

export interface MarkerInfo {
  messageId?: string;
  saveFlag?: string;
  dungeonNumber?: number;
  dlc?: boolean;
  warpDestMapName?: string;
  shortName?: string | null;
  trial?: string | null;
  korokId?: string;
  hashId?: number;
  mapName?: string;
  mapStatic?: boolean;
  korokType?: string | null;
  seedId?: string | null;
  seedNum?: string | null;
  placeName?: string | null;
  
  extra?: string | null;
  internalName?: string;
  type?: string;
  location?: string | null;
  description?: string | null;
  actor?: string;
  contents?: string | null;
  icon?: string;
  shopKind?: string;
}

export interface MarkerLinks {
  guide: string | null;
  wiki: string | null;
  videos: string | null;
}

export interface MapMarker {
  id: string;
  category: MarkerCategory;
  name: string;
  x: number;
  y: number;
  z: number;
  type?: string | null;
  trial?: string | null;
  region?: string | null;
  location?: string | null;
  reward?: string | null;
  items?: string | null;
  description?: string | null;
  coordinates?: { x: number; y: number; z: number };
  info: MarkerInfo;
  image?: string | null;
  links?: MarkerLinks;
}

export interface MarkersPayload {
  generatedAt: string;
  coordinateSystem: Record<string, unknown>;
  counts: Partial<Record<MarkerCategory, number>>;
  markers: MapMarker[];
}

export type CategoryFilters = Record<MarkerCategory, boolean>;

export const CATEGORIES: MarkerCategory[] = [
  "shrine",
  "tower",
  "lab",
  "korok",
  "mainQuest",
  "shrineQuest",
  "sideQuest",
  "objective",
  "memory",
  "chest",
  "stable",
  "village",
  "settlement",
  "shop",
  "landmark",
  "subregion",
  "greatFairy",
  "goddess",
  "talus",
  "hinox",
  "lynel",
  "molduga",
  "guardian",
  "cookingPot",
  "raft",
];


export const FILTER_GROUPS: {
  id: string;
  label: string;
  categories: MarkerCategory[];
}[] = [
  {
    id: "travel",
    label: "Travel Gates",
    categories: ["shrine", "tower", "lab"],
  },
  {
    id: "koroks",
    label: "Korok Seeds",
    categories: ["korok"],
  },
  {
    id: "quests",
    label: "Quests & Memories",
    categories: ["mainQuest", "shrineQuest", "sideQuest", "objective", "memory"],
  },
  {
    id: "treasure",
    label: "Treasure",
    categories: ["chest"],
  },
  {
    id: "bosses",
    label: "Bosses",
    categories: ["talus", "hinox", "lynel", "molduga", "guardian"],
  },
  {
    id: "services",
    label: "Services & Places",
    categories: [
      "stable",
      "village",
      "settlement",
      "shop",
      "landmark",
      "subregion",
      "greatFairy",
      "goddess",
      "cookingPot",
      "raft",
    ],
  },
];

export const CATEGORY_LABELS: Record<MarkerCategory, string> = {
  shrine: "Shrines",
  korok: "Koroks",
  tower: "Sheikah Towers",
  lab: "Tech Labs",
  mainQuest: "Main Quests",
  shrineQuest: "Shrine Quests",
  sideQuest: "Side Quests",
  objective: "Quest Objectives",
  memory: "Memories",
  chest: "Chests",
  stable: "Stables",
  village: "Villages",
  settlement: "Settlements",
  shop: "Shops",
  landmark: "Landmarks",
  subregion: "Subregions",
  greatFairy: "Great Fairies",
  goddess: "Goddess Statues",
  talus: "Stone Talus",
  hinox: "Hinox",
  lynel: "Lynels",
  molduga: "Molduga",
  guardian: "Guardians",
  cookingPot: "Cooking Pots",
  raft: "Rafts",
};

export const CATEGORY_COLORS: Record<MarkerCategory, string> = {
  shrine: "#7ec8e3",
  korok: "#7dce82",
  tower: "#e8c547",
  lab: "#8ec5e8",
  mainQuest: "#e8b84a",
  shrineQuest: "#7ec8e3",
  sideQuest: "#d4a574",
  objective: "#c9b070",
  memory: "#c9a0dc",
  chest: "#c9a0dc",
  stable: "#e0c070",
  village: "#c4b896",
  settlement: "#b8a888",
  shop: "#d4af6a",
  landmark: "#c9b8a0",
  subregion: "#a8b090",
  greatFairy: "#e8a0c8",
  goddess: "#a0c8e8",
  talus: "#b09070",
  hinox: "#c07060",
  lynel: "#c04040",
  molduga: "#c0a060",
  guardian: "#80c0a0",
  cookingPot: "#d08050",
  raft: "#6090b0",
};
