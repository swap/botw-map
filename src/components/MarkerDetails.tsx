import { useState, type CSSProperties, type ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  ICON_URL,
  ICON_URL_DLC_SHRINE,
  SHOP_ICON_URL,
} from "../icons/categoryIcons";
import { imgFor } from "../lib/markerMedia";
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  type MapMarker,
} from "../types";

interface Props {
  marker: MapMarker | null;
  completed: boolean;
  onClose: () => void;
  onToggleCompleted: () => void;
}

function iconFor(marker: MapMarker): string {
  if (marker.category === "shrine" && marker.info.dlc) return ICON_URL_DLC_SHRINE;
  if (marker.category === "shop" && marker.info.icon) {
    return SHOP_ICON_URL[marker.info.icon] || ICON_URL.shop;
  }
  return ICON_URL[marker.category] || ICON_URL.sideQuest;
}

function humanize(value: string): string {
  return /\s/.test(value) ? value : value.replace(/([a-z])([A-Z])/g, "$1 $2");
}

type LinkKind = "guide" | "wiki" | "videos";

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

async function openExternal(url: string) {
  if (isTauri()) {
    await invoke("open_link", { url });
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

function LinkGlyph({ kind }: { kind: LinkKind }) {
  if (kind === "guide") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M3.75 5.1c1.55-.95 3.55-1.35 5.75-1.35.9 0 1.75.1 2.5.28V19.2a9.3 9.3 0 0 0-2.5-.35c-1.85 0-3.5.35-4.75 1.05a.75.75 0 0 1-1-.7V5.75c0-.25.12-.48.3-.65Zm16.5 0a.75.75 0 0 1 .3.65v13.45a.75.75 0 0 1-1 .7c-1.25-.7-2.9-1.05-4.75-1.05-.9 0-1.75.12-2.5.35V4.03c.75-.18 1.6-.28 2.5-.28 2.2 0 4.2.4 5.75 1.35Z"
        />
      </svg>
    );
  }
  if (kind === "wiki") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M7 3.75A1.75 1.75 0 0 0 5.25 5.5v13A1.75 1.75 0 0 0 7 20.25h10A1.75 1.75 0 0 0 18.75 18.5v-13A1.75 1.75 0 0 0 17 3.75H7Zm1.5 4a.75.75 0 0 1 0-1.5h7a.75.75 0 0 1 0 1.5h-7Zm0 3.5a.75.75 0 0 1 0-1.5h7a.75.75 0 0 1 0 1.5h-7Zm0 3.5a.75.75 0 0 1 0-1.5h4.5a.75.75 0 0 1 0 1.5H8.5Z"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4.5 5.25A1.75 1.75 0 0 0 2.75 7v10c0 .97.78 1.75 1.75 1.75h15c.97 0 1.75-.78 1.75-1.75V7c0-.97-.78-1.75-1.75-1.75h-15Zm1 .75h1.25v1.5H5.5V6Zm0 3.25h1.25v1.5H5.5v-1.5Zm0 3.25h1.25v1.5H5.5v-1.5Zm0 3.25h1.25v1.5H5.5v-1.5Zm12-9.75H18.75v1.5H17.5V6Zm0 3.25H18.75v1.5H17.5v-1.5Zm0 3.25H18.75v1.5H17.5v-1.5Zm0 3.25H18.75v1.5H17.5v-1.5ZM10.2 9.05a.75.75 0 0 1 1.12-.65l4.2 2.45a.75.75 0 0 1 0 1.3l-4.2 2.45a.75.75 0 0 1-1.12-.65V9.05Z"
      />
    </svg>
  );
}

function MetaRow({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children: ReactNode;
}) {
  return (
    <div className="details-meta-row">
      <span className="details-meta-icon" aria-hidden="true">
        {children}
      </span>
      <div>
        <p className="details-meta-label">{label}</p>
        <p className="details-meta-value">{value}</p>
      </div>
    </div>
  );
}

export function MarkerDetails({
  marker,
  completed,
  onClose,
  onToggleCompleted,
}: Props) {
  const [failedImageId, setFailedImageId] = useState<string | null>(null);
  const imageUrl = marker ? imgFor(marker) : null;

  if (!marker) return null;

  const { info } = marker;
  const isKorok = marker.category === "korok";
  const kind = (
    isKorok ? "Korok Seed" : marker.type || CATEGORY_LABELS[marker.category]
  ).toUpperCase();
  const trial = marker.trial || info.trial || null;
  const description = marker.description || info.description || null;
  const note = isKorok ? info.extra || null : null;
  const reward = marker.reward || null;
  const items = marker.items || null;
  const region = marker.region ? humanize(marker.region) : null;
  const place = isKorok
    ? info.placeName || marker.location || marker.name
    : marker.name;
  const showPhoto = Boolean(imageUrl) && failedImageId !== marker.id;
  const byline = [region, trial].filter(Boolean).join(" · ");

  const linkRows: { kind: LinkKind; label: string; url: string }[] = [];
  if (marker.links?.guide) linkRows.push({ kind: "guide", label: "Guide", url: marker.links.guide });
  if (marker.links?.wiki) linkRows.push({ kind: "wiki", label: "Wiki", url: marker.links.wiki });
  if (marker.links?.videos) linkRows.push({ kind: "videos", label: "Videos", url: marker.links.videos });
  const hasFacts = Boolean(
    reward || items || description || note || info.dlc || info.seedNum,
  );
  const isShrine = marker.category === "shrine";
  const widePhoto = showPhoto && (isKorok || isShrine);

  return (
    <section
      className={`details-panel slate-surface${completed ? " is-completed" : ""}${
        isKorok ? " is-korok" : ""
      }${isShrine ? " is-shrine" : ""}${widePhoto ? " has-guide-photo" : ""}`}
      style={{ "--cat-color": CATEGORY_COLORS[marker.category] } as CSSProperties}
      aria-live="polite"
    >
      <header className="details-header">
        <img
          className="details-icon"
          src={iconFor(marker)}
          alt=""
          aria-hidden="true"
        />

        <div className="details-titleblock">
          <p className="details-kicker">
            {kind}
            {info.dlc && <span className="details-badge">DLC</span>}
          </p>
          <h2>{place}</h2>
          {byline && <p className="details-byline">{byline}</p>}
        </div>

        <button
          type="button"
          className="details-close"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>
      </header>

      {(hasFacts || showPhoto) && (
        <div
          className={`details-body${showPhoto ? " has-photo" : ""}${
            showPhoto && !hasFacts ? " photo-only" : ""
          }`}
        >
          {hasFacts && (
            <div className="details-meta">
              {info.seedNum && (
                <MetaRow label="Seed" value={`#${Number(info.seedNum)}`}>
                  <svg viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M12 3.25c2.8 2.2 4.75 5.1 4.75 8.1a4.75 4.75 0 1 1-9.5 0c0-3 1.95-5.9 4.75-8.1Zm0 3.2c-1.7 1.55-2.75 3.5-2.75 4.9a2.75 2.75 0 1 0 5.5 0c0-1.4-1.05-3.35-2.75-4.9Z"
                    />
                  </svg>
                </MetaRow>
              )}
              {!isKorok && reward && (
                <MetaRow label="Reward" value={humanize(reward)}>
                  <svg viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M7.5 4.25h9A1.75 1.75 0 0 1 18.25 6v1.1c1.2.35 2 1.25 2 2.4v1.25c0 .7-.35 1.32-.9 1.72V18A1.75 1.75 0 0 1 17.6 19.75H6.4A1.75 1.75 0 0 1 4.65 18v-5.53c-.55-.4-.9-1.02-.9-1.72V9.5c0-1.15.8-2.05 2-2.4V6A1.75 1.75 0 0 1 7.5 4.25Zm0 1.5a.25.25 0 0 0-.25.25v.85h9.5V6a.25.25 0 0 0-.25-.25h-9Zm-1.6 3.5a.9.9 0 0 0-.9.9v1.25c0 .5.4.9.9.9h1.35v5.7h9.5v-5.7H17.1a.9.9 0 0 0 .9-.9V9.5a.9.9 0 0 0-.9-.9H5.9Z"
                    />
                  </svg>
                </MetaRow>
              )}
              {items && (
                <MetaRow label="Items" value={humanize(items)}>
                  <svg viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M4.75 7.5A2.75 2.75 0 0 1 7.5 4.75h9A2.75 2.75 0 0 1 19.25 7.5v9A2.75 2.75 0 0 1 16.5 19.25h-9A2.75 2.75 0 0 1 4.75 16.5v-9Zm2.75-1.25a1.25 1.25 0 0 0-1.25 1.25v9c0 .69.56 1.25 1.25 1.25h9c.69 0 1.25-.56 1.25-1.25v-9c0-.69-.56-1.25-1.25-1.25h-9Zm1.5 3.5h7a.75.75 0 0 1 0 1.5h-7a.75.75 0 0 1 0-1.5Zm0 3.5h5a.75.75 0 0 1 0 1.5h-5a.75.75 0 0 1 0-1.5Z"
                    />
                  </svg>
                </MetaRow>
              )}
              {info.dlc && (
                <MetaRow label="Edition" value="DLC">
                  <svg viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17Zm0 1.5a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm-.75 3.25h1.5v4.4l2.7 1.56-.75 1.3L11.25 13.5V8.25Z"
                    />
                  </svg>
                </MetaRow>
              )}
              {description && (
                <p className={`details-notes${isKorok ? " is-howto" : ""}`}>
                  {description}
                </p>
              )}
              {note && note !== description && (
                <p className="details-notes is-extra">{note}</p>
              )}
            </div>
          )}

          {showPhoto && (
            <figure className="details-photo">
              <img
                src={imageUrl!}
                alt=""
                loading="lazy"
                onError={() => setFailedImageId(marker.id)}
              />
            </figure>
          )}
        </div>
      )}

      <footer className="details-footer">
        {linkRows.length > 0 && (
          <div className="details-links">
            {linkRows.map((link) => (
              <button
                key={link.kind}
                type="button"
                className="details-link"
                onClick={() => openExternal(link.url)}
              >
                <LinkGlyph kind={link.kind} />
                <span className="details-link-label">{link.label}</span>
                <span className="details-link-ext" aria-hidden="true">
                  ↗
                </span>
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          className={`details-done${completed ? " is-on" : ""}`}
          onClick={onToggleCompleted}
          aria-pressed={completed}
        >
          <span className="details-done-mark" aria-hidden="true">
            {completed ? "✓" : ""}
          </span>
          {completed ? "Completed" : "Mark as complete"}
        </button>
      </footer>
    </section>
  );
}
