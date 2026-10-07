import { useMemo, useState } from "react";
import { CATEGORY_LABELS, type MapMarker } from "../types";

interface Props {
  markers: MapMarker[];
  onPick: (marker: MapMarker) => void;
}

export function SearchBar({ markers, onPick }: Props) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return markers
      .filter((m) => {
        const cat = CATEGORY_LABELS[m.category].toLowerCase();
        return (
          m.name.toLowerCase().includes(q) ||
          cat.includes(q) ||
          m.id.toLowerCase().includes(q) ||
          (m.info.korokId && m.info.korokId.toLowerCase().includes(q)) ||
          (m.info.contents && m.info.contents.toLowerCase().includes(q))
        );
      })
      .slice(0, 12);
  }, [markers, query]);

  return (
    <div className="search-wrap">
      <input
        className="search-input"
        type="search"
        placeholder="Search the map…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search markers"
      />
      {results.length > 0 && (
        <ul className="search-results slate-surface">
          {results.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => {
                  onPick(m);
                  setQuery("");
                }}
              >
                <span className="search-cat">{CATEGORY_LABELS[m.category]}</span>
                <span>{m.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
