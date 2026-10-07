import {
  FILTER_GROUPS,
  CATEGORY_LABELS,
  type CategoryFilters,
  type MarkerCategory,
} from "../types";
import { ICON_URL } from "../icons/categoryIcons";

interface Props {
  open: boolean;
  onClose: () => void;
  filters: CategoryFilters;
  onToggle: (category: MarkerCategory) => void;
  showCompleted: boolean;
  onToggleShowCompleted: () => void;
  counts: Partial<Record<MarkerCategory, number>>;
  completedCount: number;
  visibleCount: number;
}

const FILTER_CATEGORIES = FILTER_GROUPS.flatMap((g) => g.categories);

export function SettingsPanel({
  open,
  onClose,
  filters,
  onToggle,
  showCompleted,
  onToggleShowCompleted,
  counts,
  completedCount,
  visibleCount,
}: Props) {
  if (!open) return null;

  return (
    <aside className="settings-panel slate-surface" aria-label="Filters and settings">
      <header className="settings-header">
        <h2>Filter</h2>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </header>

      <p className="settings-meta">
        {visibleCount} marked · {completedCount} complete
      </p>

      <ul className="filter-list">
        {FILTER_CATEGORIES.map((cat) => (
          <li key={cat}>
            <label className="filter-row">
              <input
                type="checkbox"
                checked={filters[cat]}
                onChange={() => onToggle(cat)}
              />
              <img
                className="filter-icon"
                src={ICON_URL[cat]}
                alt=""
                width={22}
                height={22}
              />
              <span className="filter-label">{CATEGORY_LABELS[cat]}</span>
              <span className="filter-count">{counts[cat] ?? 0}</span>
            </label>
          </li>
        ))}
      </ul>

      <label className="filter-row completed-toggle">
        <input
          type="checkbox"
          checked={showCompleted}
          onChange={onToggleShowCompleted}
        />
        <span className="filter-label">Show completed markers</span>
      </label>

      <p className="settings-note">
        Progress stays on this slate - local only, no cloud.
      </p>
    </aside>
  );
}
