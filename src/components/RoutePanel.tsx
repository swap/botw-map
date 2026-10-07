import { ICON_URL } from "../icons/categoryIcons";
import type { RouteHunt } from "../api/routeSave";
import { HUNT_CATS } from "../lib/route";
import type { RouteStop } from "../lib/stops";
import { CATEGORY_LABELS, type MarkerCategory } from "../types";

interface Props {
  open: boolean;
  onClose: () => void;
  hunt: RouteHunt;
  onHuntChange: (hunt: RouteHunt) => void;
  remainingByCategory: Partial<Record<MarkerCategory, number>>;
  towardCastle: boolean;
  onTowardCastleChange: (value: boolean) => void;
  hasSelectedSeed: boolean;
  phase: "setup" | "building" | "active";
  route: RouteStop[];
  index: number;
  onStartAuto: () => void;
  onStartBuilding: () => void;
  onFinishBuilding: () => void;
  onUndoStop: () => void;
  onClearStops: () => void;
  onRemoveStop: (id: string) => void;
  onEnd: () => void;
  onSkip: () => void;
  onPrev: () => void;
  onGoToCurrent: () => void;
  onReached: () => void;
}

export function RoutePanel({
  open,
  onClose,
  hunt,
  onHuntChange,
  remainingByCategory,
  towardCastle,
  onTowardCastleChange,
  hasSelectedSeed,
  phase,
  route,
  index,
  onStartAuto,
  onStartBuilding,
  onFinishBuilding,
  onUndoStop,
  onClearStops,
  onRemoveStop,
  onEnd,
  onSkip,
  onPrev,
  onGoToCurrent,
  onReached,
}: Props) {
  if (!open) return null;

  const isCustom = hunt === "custom";
  const current = phase === "active" ? route[index] ?? null : null;
  const upcoming = phase === "active" ? route.slice(index + 1, index + 5) : [];
  const left = !isCustom ? (remainingByCategory[hunt] ?? 0) : 0;
  const step = phase === "active" && route.length ? Math.min(index + 1, route.length) : 0;
  const done = phase === "active" ? Math.max(0, index) : 0;
  const total = route.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <aside className="route-panel slate-surface" aria-label="Collection route">
      <header className="settings-header">
        <h2>Route</h2>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </header>

      {phase === "setup" && (
        <>
          <p className="settings-meta">
            Make your own path, or auto-route a hunt. Progress saves on this device.
          </p>

          <label className="route-field">
            <span className="route-field-label">Hunt</span>
            <select
              className="route-select"
              value={hunt}
              onChange={(e) => onHuntChange(e.target.value as RouteHunt)}
            >
              <option value="custom">Make our own</option>
              {HUNT_CATS.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABELS[cat]} ({remainingByCategory[cat] ?? 0} left)
                </option>
              ))}
            </select>
          </label>

          {isCustom ? (
            <>
              <p className="route-seed-hint">
                Exclusive build mode: click anywhere on the map (empty ground or
                markers). No detail popups until you press Done.
              </p>
              <button
                type="button"
                className="btn primary route-start"
                onClick={onStartBuilding}
              >
                Start building
              </button>
            </>
          ) : (
            <>
              <label className="route-check">
                <input
                  type="checkbox"
                  checked={towardCastle}
                  onChange={(e) => onTowardCastleChange(e.target.checked)}
                />
                <span>Drift toward Hyrule Castle</span>
              </label>

              <p className="route-seed-hint">
                {hasSelectedSeed
                  ? "Starts from your selected marker."
                  : "Starts from the southwest (Great Plateau side). Select a marker first to begin there."}
              </p>

              <button
                type="button"
                className="btn primary route-start"
                disabled={left === 0}
                onClick={onStartAuto}
              >
                Create route
              </button>
              {left === 0 && (
                <p className="settings-note">Nothing left incomplete in this category.</p>
              )}
            </>
          )}
        </>
      )}

      {phase === "building" && (
        <>
          <p className="settings-meta">
            Click the map to drop pins, or click shrines / koroks / anything else.
            Detail cards stay closed until Done.
          </p>

          <div className="route-progress">
            <div>
              <p className="route-progress-label">Your route</p>
              <p className="route-progress-count">
                {route.length === 0
                  ? "No stops yet"
                  : `${route.length} stop${route.length === 1 ? "" : "s"}`}
              </p>
            </div>
          </div>

          {route.length > 0 && (
            <ol className="route-build-list">
              {route.map((m, i) => (
                <li key={m.id}>
                  <span className="route-upcoming-n">{i + 1}</span>
                  <span className="route-upcoming-name" title={m.name}>
                    {m.freeform ? `${m.name} · pin` : m.name}
                  </span>
                  <button
                    type="button"
                    className="route-build-remove"
                    aria-label={`Remove ${m.name}`}
                    onClick={() => onRemoveStop(m.id)}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ol>
          )}

          <div className="route-actions route-actions-build">
            <button
              type="button"
              className="btn ghost"
              disabled={route.length === 0}
              onClick={onUndoStop}
            >
              Undo
            </button>
            <button
              type="button"
              className="btn ghost"
              disabled={route.length === 0}
              onClick={onClearStops}
            >
              Clear
            </button>
            <button type="button" className="btn ghost" onClick={onEnd}>
              Cancel
            </button>
          </div>

          <button
            type="button"
            className="btn primary route-start"
            disabled={route.length < 2}
            onClick={onFinishBuilding}
          >
            Done
          </button>
          {route.length === 1 && (
            <p className="settings-note">Add at least one more stop for a path.</p>
          )}
        </>
      )}

      {phase === "active" && (
        <>
          <div className="route-progress">
            {hunt !== "custom" ? (
              <img
                className="route-cat-icon"
                src={ICON_URL[hunt]}
                alt=""
                width={28}
                height={28}
              />
            ) : null}
            <div>
              <p className="route-progress-label">
                {hunt === "custom" ? "Your route" : CATEGORY_LABELS[hunt]}
              </p>
              <p className="route-progress-count">
                {current
                  ? `Stop ${step} of ${total}`
                  : `Finished · ${total} stops`}
              </p>
            </div>
          </div>

          <div className="route-bar" aria-hidden>
            <div className="route-bar-fill" style={{ width: `${pct}%` }} />
          </div>

          {current ? (
            <button type="button" className="route-current" onClick={onGoToCurrent}>
              <span className="route-current-kicker">Go here</span>
              <span className="route-current-name">{current.name}</span>
              {(current.region || current.location || current.freeform) && (
                <span className="route-current-meta">
                  {current.freeform
                    ? "Custom pin"
                    : [current.region, current.location].filter(Boolean).join(" · ")}
                </span>
              )}
            </button>
          ) : (
            <p className="settings-note">Route finished: every stop is done.</p>
          )}

          {upcoming.length > 0 && (
            <ol className="route-upcoming">
              {upcoming.map((m, i) => (
                <li key={m.id}>
                  <span className="route-upcoming-n">{step + i + 1}</span>
                  <span className="route-upcoming-name">{m.name}</span>
                </li>
              ))}
            </ol>
          )}

          {current && (
            <button
              type="button"
              className="btn primary route-start"
              onClick={onReached}
            >
              {current.freeform || !current.markerId
                ? "Reached: next"
                : "Mark reached"}
            </button>
          )}

          <div className="route-actions">
            <button
              type="button"
              className="btn ghost"
              disabled={index <= 0}
              onClick={onPrev}
            >
              Prev
            </button>
            <button
              type="button"
              className="btn ghost"
              disabled={!current || index >= route.length - 1}
              onClick={onSkip}
            >
              Skip
            </button>
            <button type="button" className="btn ghost" onClick={onEnd}>
              End
            </button>
          </div>

          <p className="settings-note">
            {current?.markerId
              ? "Reached marks it complete and advances. Or use the details card."
              : "Custom pins advance with Reached: no shrine/korok needed."}
          </p>
        </>
      )}
    </aside>
  );
}
