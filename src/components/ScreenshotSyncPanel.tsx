import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  analyzeScreenshot,
  uniqueRegions,
  type IconMode,
  type SyncCategory,
  type SyncPreview,
} from "../lib/screenshotSync";
import type { MapMarker } from "../types";
import { CATEGORY_LABELS } from "../types";

interface Props {
  open: boolean;
  onClose: () => void;
  markers: MapMarker[];
  completedIds: Set<string>;
  onApply: (markerIds: string[]) => Promise<void>;
}

const CATEGORY_OPTIONS: SyncCategory[] = ["shrine", "tower", "lab"];

function isImageFile(file: File | null | undefined): file is File {
  return !!file && file.type.startsWith("image/");
}

export function ScreenshotSyncPanel({
  open,
  onClose,
  markers,
  completedIds,
  onApply,
}: Props) {
  const regions = useMemo(() => uniqueRegions(markers), [markers]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [inset, setInset] = useState(0.04);
  const [maxDistance, setMaxDistance] = useState(200);
  const [region, setRegion] = useState<string>("");
  const [iconMode, setIconMode] = useState<IconMode>("sheikah");
  const [categories, setCategories] = useState<SyncCategory[]>([
    "shrine",
    "tower",
  ]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<SyncPreview | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [appliedNote, setAppliedNote] = useState<string | null>(null);

  const adoptFile = useCallback((next: File | null) => {
    if (!next) return;
    if (!isImageFile(next)) {
      setError("That file isn't an image - drop a PNG/JPG map screenshot.");
      return;
    }
    setFile(next);
    setPreview(null);
    setAppliedNote(null);
    setError(null);
  }, []);

  useEffect(() => {
    if (!file) {
      setThumbUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setThumbUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!open) return;

    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const blob = item.getAsFile();
          if (blob) {
            e.preventDefault();
            adoptFile(
              new File([blob], blob.name || "pasted-map.png", {
                type: blob.type || "image/png",
              }),
            );
          }
          return;
        }
      }
    };

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [open, adoptFile]);

  const toggleCategory = (cat: SyncCategory) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  };

  const runAnalyze = async () => {
    if (!file) {
      setError("Drop, paste, or choose a map screenshot first.");
      return;
    }
    if (!categories.length) {
      setError("Pick at least one marker type (shrine / tower / lab).");
      return;
    }
    setBusy(true);
    setError(null);
    setAppliedNote(null);
    try {
      const result = await analyzeScreenshot(file, markers, completedIds, {
        inset,
        maxMatchDistance: maxDistance,
        categories,
        region: region || null,
        worldBounds: null,
        iconMode,
      });
      setPreview(result);
      const next = new Set(
        result.matches
          .filter((m) => !m.alreadyCompleted)
          .map((m) => m.marker.id),
      );
      setSelected(next);

      const median =
        result.matches.length > 0
          ? [...result.matches]
              .map((m) => m.distance)
              .sort((a, b) => a - b)[Math.floor(result.matches.length / 2)]
          : 0;

      if (!result.matches.length) {
        setError(
          result.detections.length
            ? "Found icons but none lined up with local markers - try Full map / a region, tweak inset, or raise match distance."
            : iconMode === "completed"
              ? "No orange completed icons found. Switch to Sheikah cyan if your shrines still glow blue."
              : "No Sheikah cyan icons found. Try a clearer full-map screenshot.",
        );
      } else if (median > 160 && result.detections.length > result.matches.length) {
        setError(
          "Matches look loose (this may be a TotK map - shrine spots differ from BOTW). Prefer towers, or use a BOTW screenshot for shrine sync.",
        );
      }
    } catch (e) {
      setPreview(null);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const applySelected = async () => {
    const ids = [...selected];
    if (!ids.length) return;
    setBusy(true);
    setError(null);
    try {
      await onApply(ids);
      setAppliedNote(`Marked ${ids.length} complete - they'll hide from the map.`);
      setSelected(new Set());
      setPreview((prev) =>
        prev
          ? {
              ...prev,
              matches: prev.matches.map((m) =>
                ids.includes(m.marker.id)
                  ? { ...m, alreadyCompleted: true }
                  : m,
              ),
            }
          : prev,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  const newFinds =
    preview?.matches.filter((m) => !m.alreadyCompleted).length ?? 0;
  const iconLabel = iconMode === "completed" ? "orange" : "sheikah";

  return (
    <aside className="sync-panel slate-surface" aria-label="Screenshot sync">
      <header className="settings-header">
        <h2>Map sync</h2>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </header>

      <p className="settings-meta">
        Drop or paste a BOTW map screenshot. Cyan Sheikah icons (or orange completed
        ones) are matched to this slate, then you can mark them done.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sync-file-input"
        onChange={(e) => {
          adoptFile(e.target.files?.[0] ?? null);
          e.target.value = "";
        }}
      />

      <div
        className={`sync-dropzone${dragOver ? " is-dragover" : ""}${file ? " has-file" : ""}`}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          setDragOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const dropped = e.dataTransfer.files?.[0];
          adoptFile(dropped ?? null);
        }}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Upload map screenshot"
      >
        {thumbUrl ? (
          <img src={thumbUrl} alt="" className="sync-drop-thumb" />
        ) : (
          <div className="sync-drop-icon" aria-hidden>
            ⌗
          </div>
        )}
        <div className="sync-drop-copy">
          <strong>{file ? file.name : "Drop map screenshot"}</strong>
          <span>Click to browse · Ctrl+V paste · drag & drop</span>
        </div>
        <button
          type="button"
          className="btn ghost sync-browse-btn"
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
        >
          {file ? "Replace" : "Choose"}
        </button>
      </div>

      <div className="sync-cats">
        {CATEGORY_OPTIONS.map((cat) => (
          <label key={cat} className="sync-chip">
            <input
              type="checkbox"
              checked={categories.includes(cat)}
              onChange={() => toggleCategory(cat)}
            />
            {CATEGORY_LABELS[cat]}
          </label>
        ))}
      </div>

      <div className="sync-mode-row">
        <button
          type="button"
          className={`sync-mode-btn${iconMode === "sheikah" ? " is-on is-sheikah" : ""}`}
          onClick={() => setIconMode("sheikah")}
        >
          Sheikah cyan
        </button>
        <button
          type="button"
          className={`sync-mode-btn${iconMode === "completed" ? " is-on" : ""}`}
          onClick={() => setIconMode("completed")}
        >
          Completed orange
        </button>
      </div>

      <label className="sync-field">
        <span className="sync-label">Region (optional)</span>
        <select value={region} onChange={(e) => setRegion(e.target.value)}>
          <option value="">Full map</option>
          {regions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>

      <label className="sync-field">
        <span className="sync-label">
          Edge inset {Math.round(inset * 100)}%
        </span>
        <input
          type="range"
          min={0}
          max={0.18}
          step={0.01}
          value={inset}
          onChange={(e) => setInset(Number(e.target.value))}
        />
      </label>

      <label className="sync-field">
        <span className="sync-label">Match distance {maxDistance}</span>
        <input
          type="range"
          min={80}
          max={400}
          step={10}
          value={maxDistance}
          onChange={(e) => setMaxDistance(Number(e.target.value))}
        />
      </label>

      <div className="sync-actions">
        <button
          type="button"
          className="btn primary"
          disabled={busy || !file}
          onClick={() => void runAnalyze()}
        >
          {busy ? "Reading…" : "Detect & preview"}
        </button>
      </div>

      {error && <p className="sync-error">{error}</p>}
      {appliedNote && <p className="sync-ok">{appliedNote}</p>}

      {preview && (
        <div className="sync-preview">
          <img
            src={preview.previewDataUrl}
            alt="Detection preview"
            className="sync-preview-img"
          />
          <p className="sync-stats">
            {preview.detections.length} {iconLabel} icons ·{" "}
            {preview.matches.length} matched · {newFinds} new ·{" "}
            {preview.unmatched.length} unmatched
          </p>

          <ul className="sync-match-list">
            {preview.matches.map((m) => {
              const checked = selected.has(m.marker.id);
              return (
                <li key={m.marker.id}>
                  <label className="filter-row">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={m.alreadyCompleted}
                      onChange={() => {
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (next.has(m.marker.id)) next.delete(m.marker.id);
                          else next.add(m.marker.id);
                          return next;
                        });
                      }}
                    />
                    <span className="filter-label">
                      {m.marker.name}
                      {m.alreadyCompleted ? " · already done" : ""}
                    </span>
                    <span className="filter-count">
                      {Math.round(m.distance)}u
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            className="btn primary"
            disabled={busy || selected.size === 0}
            onClick={() => void applySelected()}
          >
            Mark {selected.size} complete
          </button>
        </div>
      )}
    </aside>
  );
}
