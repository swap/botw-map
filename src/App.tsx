import { useCallback, useEffect, useMemo, useState } from "react";
import { HyruleMap } from "./components/HyruleMap";
import { MarkerDetails } from "./components/MarkerDetails";
import { RoutePanel } from "./components/RoutePanel";
import { ScreenshotSyncPanel } from "./components/ScreenshotSyncPanel";
import { SearchBar } from "./components/SearchBar";
import { SettingsPanel } from "./components/SettingsPanel";
import { listCompleted, setCompleted } from "./api/progress";
import {
  loadSavedRoute,
  saveRoute,
  type RouteHunt,
  type RoutePhase,
} from "./api/routeSave";
import {
  END_PT,
  HUNT_CATS,
  makeRoute,
  START_PT,
} from "./lib/route";
import {
  fromMarker,
  fromPoint,
  nameStops,
  type RouteStop,
} from "./lib/stops";
import {
  type CategoryFilters,
  type MapMarker,
  type MarkerCategory,
  type MarkersPayload,
} from "./types";
import "leaflet/dist/leaflet.css";
import "./App.css";

const defaultFilters = (): CategoryFilters => ({
  shrine: true,
  tower: true,
  lab: true,
  korok: true,
  mainQuest: true,
  shrineQuest: true,
  sideQuest: true,
  objective: false,
  memory: true,
  chest: false,
  stable: true,
  village: true,
  settlement: true,
  shop: false,
  landmark: true,
  subregion: false,
  greatFairy: true,
  goddess: false,
  talus: false,
  hinox: false,
  lynel: false,
  molduga: false,
  guardian: false,
  cookingPot: false,
  raft: false,
});

export default function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<MarkersPayload | null>(null);
  const [filters, setFilters] = useState<CategoryFilters>(defaultFilters);
  const [showCompleted, setShowCompleted] = useState(false);
  const [completed, setCompletedIds] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<MapMarker | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [routeOpen, setRouteOpen] = useState(false);

  const [routeHunt, setRouteHunt] = useState<RouteHunt>("custom");
  const [towardCastle, setTowardCastle] = useState(true);
  const [routePhase, setRoutePhase] = useState<"setup" | RoutePhase>("setup");
  const [routeMarkers, setRouteMarkers] = useState<RouteStop[]>([]);
  const [routeIndex, setRouteIndex] = useState(0);
  const [routeRestored, setRouteRestored] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [markersRes, done] = await Promise.all([
          fetch("/data/markers.json"),
          listCompleted(),
        ]);
        if (!markersRes.ok) {
          throw new Error("Missing public/data/markers.json");
        }
        const data = (await markersRes.json()) as MarkersPayload;
        if (!cancelled) {
          setPayload(data);
          setCompletedIds(done);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  
  useEffect(() => {
    if (!payload || routeRestored) return;
    const saved = loadSavedRoute();
    setRouteRestored(true);
    if (!saved) return;

    const byId = new Map(payload.markers.map((m) => [m.id, m]));
    const restored: RouteStop[] = saved.stops
      .map((s) => {
        if (s.freeform || !s.markerId) return s;
        const m = byId.get(s.markerId);
        return m ? fromMarker(m) : s.x || s.z ? s : null;
      })
      .filter((s): s is RouteStop => !!s);

    if (saved.phase === "building") {
      setRouteHunt(saved.hunt || "custom");
      setTowardCastle(saved.towardCastle);
      setRouteMarkers(nameStops(restored));
      setRouteIndex(0);
      setRoutePhase("building");
      setRouteOpen(true);
      setSelected(null);
      return;
    }

    if (!restored.length) {
      saveRoute(null);
      return;
    }

    let index = Math.min(Math.max(0, saved.index), restored.length - 1);
    while (
      index < restored.length &&
      restored[index].markerId &&
      completed.has(restored[index].markerId!)
    ) {
      index += 1;
    }

    setRouteHunt(saved.hunt);
    setTowardCastle(saved.towardCastle);
    setRouteMarkers(nameStops(restored));
    setRouteIndex(index);
    setRoutePhase("active");
    setRouteOpen(true);

    const current = restored[index];
    if (current?.markerId) {
      const m = byId.get(current.markerId);
      if (m) {
        setSelected(m);
        setFocusId(m.id);
      }
    } else if (current) {
      setSelected(null);
      setFocusId(current.id);
    }
  }, [payload, completed, routeRestored]);

  
  useEffect(() => {
    if (!routeRestored) return;
    if (routePhase === "setup") {
      saveRoute(null);
      return;
    }
    saveRoute({
      hunt: routeHunt,
      phase: routePhase,
      stops: routeMarkers,
      index: routeIndex,
      towardCastle,
    });
  }, [
    routePhase,
    routeHunt,
    routeMarkers,
    routeIndex,
    towardCastle,
    routeRestored,
  ]);

  const visibleMarkers = useMemo(() => {
    if (!payload) return [];
    return payload.markers.filter((m) => {
      if (!filters[m.category]) return false;
      if (!showCompleted && completed.has(m.id) && selected?.id !== m.id) {
        return false;
      }
      return true;
    });
  }, [payload, filters, showCompleted, completed, selected]);

  const remainingByCategory = useMemo(() => {
    const out: Partial<Record<MarkerCategory, number>> = {};
    if (!payload) return out;
    for (const cat of HUNT_CATS) {
      out[cat] = payload.markers.filter(
        (m) => m.category === cat && !completed.has(m.id),
      ).length;
    }
    return out;
  }, [payload, completed]);

  const routeStops = useMemo(() => {
    if (routePhase === "building") return routeMarkers;
    if (routePhase === "active") return routeMarkers.slice(routeIndex);
    return [];
  }, [routePhase, routeMarkers, routeIndex]);

  const routeBusy = routePhase === "building" || routePhase === "active";
  const building = routePhase === "building";

  const goToRouteStop = useCallback(
    (index: number) => {
      const stop = routeMarkers[index];
      if (!stop) return;
      setRouteIndex(index);
      setFocusId(stop.id);
      if (stop.markerId && payload) {
        const m = payload.markers.find((x) => x.id === stop.markerId);
        setSelected(m ?? null);
      } else {
        setSelected(null);
      }
    },
    [routeMarkers, payload],
  );

  
  useEffect(() => {
    if (routePhase !== "active" || !routeMarkers.length) return;
    let i = routeIndex;
    while (
      i < routeMarkers.length &&
      routeMarkers[i].markerId &&
      completed.has(routeMarkers[i].markerId!)
    ) {
      i += 1;
    }
    if (i !== routeIndex) {
      if (i < routeMarkers.length) goToRouteStop(i);
      else setRouteIndex(i);
    }
  }, [completed, routePhase, routeMarkers, routeIndex, goToRouteStop]);

  const onToggleCategory = useCallback((category: MarkerCategory) => {
    setFilters((prev) => ({ ...prev, [category]: !prev[category] }));
  }, []);

  const addRouteStop = useCallback((stop: RouteStop) => {
    setRouteMarkers((prev) => {
      if (prev.some((x) => x.id === stop.id || (stop.markerId && x.markerId === stop.markerId))) {
        return prev;
      }
      const next = [...prev, stop];
      return stop.freeform ? nameStops(next) : next;
    });
    setFocusId(stop.id);
  }, []);

  const onSelectMarker = useCallback(
    (m: MapMarker | null) => {
      if (building) {
        
        setSelected(null);
        if (m) addRouteStop(fromMarker(m));
        return;
      }
      setSelected(m);
    },
    [building, addRouteStop],
  );

  const onAddRoutePoint = useCallback(
    (x: number, z: number) => {
      if (!building) return;
      setSelected(null);
      addRouteStop(fromPoint(x, z));
    },
    [building, addRouteStop],
  );

  const advanceRoute = useCallback(() => {
    const nextIndex = routeIndex + 1;
    if (nextIndex < routeMarkers.length) {
      goToRouteStop(nextIndex);
    } else {
      setRouteIndex(nextIndex);
      setSelected(null);
    }
  }, [routeIndex, routeMarkers.length, goToRouteStop]);

  const onReached = useCallback(async () => {
    const stop = routeMarkers[routeIndex];
    if (!stop) return;
    if (stop.markerId) {
      await setCompleted(stop.markerId, true);
      setCompletedIds((prev) => {
        const copy = new Set(prev);
        copy.add(stop.markerId!);
        return copy;
      });
    }
    advanceRoute();
  }, [routeMarkers, routeIndex, advanceRoute]);

  const onToggleCompleted = useCallback(async () => {
    if (!selected || building) return;
    const next = !completed.has(selected.id);
    await setCompleted(selected.id, next);
    setCompletedIds((prev) => {
      const copy = new Set(prev);
      if (next) copy.add(selected.id);
      else copy.delete(selected.id);
      return copy;
    });

    if (
      next &&
      routePhase === "active" &&
      routeMarkers[routeIndex]?.markerId === selected.id
    ) {
      advanceRoute();
      return;
    }

    if (next && !showCompleted) {
      setSelected(null);
    }
  }, [
    selected,
    completed,
    showCompleted,
    routePhase,
    routeMarkers,
    routeIndex,
    building,
    advanceRoute,
  ]);

  const onApplySyncCompletions = useCallback(async (markerIds: string[]) => {
    await Promise.all(markerIds.map((id) => setCompleted(id, true)));
    setCompletedIds((prev) => {
      const copy = new Set(prev);
      for (const id of markerIds) copy.add(id);
      return copy;
    });
    setSelected((cur) => (cur && markerIds.includes(cur.id) ? null : cur));
  }, []);

  const onStartBuilding = useCallback(() => {
    setRouteHunt("custom");
    setRouteMarkers([]);
    setRouteIndex(0);
    setRoutePhase("building");
    setRouteOpen(true);
    setSelected(null);
    setSettingsOpen(false);
    setSyncOpen(false);
  }, []);

  const onFinishBuilding = useCallback(() => {
    if (routeMarkers.length < 2) return;
    let index = 0;
    while (
      index < routeMarkers.length &&
      routeMarkers[index].markerId &&
      completed.has(routeMarkers[index].markerId!)
    ) {
      index += 1;
    }
    setRouteIndex(index);
    setRoutePhase("active");
    const current = routeMarkers[index];
    if (current?.markerId && payload) {
      const m = payload.markers.find((x) => x.id === current.markerId);
      setSelected(m ?? null);
      setFocusId(current.id);
    } else if (current) {
      setSelected(null);
      setFocusId(current.id);
    }
  }, [routeMarkers, completed, payload]);

  const onStartAuto = useCallback(() => {
    if (!payload || routeHunt === "custom") return;
    const pool = payload.markers.filter(
      (m) => m.category === routeHunt && !completed.has(m.id),
    );
    if (!pool.length) return;

    const seed =
      selected && !completed.has(selected.id)
        ? { x: selected.x, z: selected.z }
        : START_PT;
    const built = makeRoute(pool, {
      seed,
      goal: towardCastle ? END_PT : null,
    }).map(fromMarker);

    setRouteMarkers(built);
    setRouteIndex(0);
    setRoutePhase("active");
    setRouteOpen(true);

    const first = built[0];
    if (first?.markerId) {
      const m = payload.markers.find((x) => x.id === first.markerId);
      setSelected(m ?? null);
      setFocusId(first.id);
      setFilters((prev) =>
        prev[routeHunt] ? prev : { ...prev, [routeHunt]: true },
      );
    }
  }, [payload, routeHunt, completed, selected, towardCastle]);

  const onEndRoute = useCallback(() => {
    setRoutePhase("setup");
    setRouteMarkers([]);
    setRouteIndex(0);
    saveRoute(null);
  }, []);

  if (loading) {
    return (
      <div className="boot-screen">
        <div className="boot-card slate-surface">
          <p className="brand">Sheikah Map</p>
          <p className="boot-status">Charting Hyrule…</p>
        </div>
      </div>
    );
  }

  if (error || !payload) {
    return (
      <div className="boot-screen">
        <div className="boot-card slate-surface">
          <p className="brand">Sheikah Map</p>
          <p className="boot-status error">{error ?? "Failed to load"}</p>
        </div>
      </div>
    );
  }

  const routeBtnLabel =
    routePhase === "building"
      ? `Route · build ${routeMarkers.length}`
      : routePhase === "active"
        ? `Route · ${Math.min(routeIndex + 1, routeMarkers.length)}/${routeMarkers.length}`
        : "Route";

  return (
    <div className={`app-shell${building ? " is-route-building" : ""}`}>
      <HyruleMap
        markers={visibleMarkers}
        selectedId={building ? null : (selected?.id ?? null)}
        completedIds={completed}
        focusId={focusId}
        routeStops={routeStops}
        routeBuilding={building}
        onAddRoutePoint={onAddRoutePoint}
        onSelect={onSelectMarker}
      />

      <header className="top-bar">
        <SearchBar
          markers={payload.markers.filter((m) => filters[m.category])}
          onPick={(m) => {
            onSelectMarker(m);
            if (!building) setFocusId(m.id);
          }}
        />
        <div className="bar-actions">
          <button
            type="button"
            className={`btn ghost bar-btn${routeBusy ? " is-lit" : ""}`}
            onClick={() => {
              setRouteOpen((v) => !v);
              if (!routeOpen) {
                setSettingsOpen(false);
                setSyncOpen(false);
              }
            }}
          >
            {routeBtnLabel}
          </button>
          <button
            type="button"
            className="btn ghost bar-btn"
            onClick={() => {
              if (building) return;
              setSyncOpen((v) => !v);
              if (!syncOpen) {
                setSettingsOpen(false);
                setRouteOpen(false);
              }
            }}
          >
            Sync
          </button>
          <button
            type="button"
            className="btn ghost bar-btn"
            onClick={() => {
              if (building) return;
              setSettingsOpen((v) => !v);
              if (!settingsOpen) {
                setSyncOpen(false);
                setRouteOpen(false);
              }
            }}
          >
            Filter
          </button>
        </div>
      </header>

      {building && (
        <div className="route-build-banner" role="status">
          Build mode: click map or markers · Done when finished
        </div>
      )}

      <SettingsPanel
        open={settingsOpen && !building}
        onClose={() => setSettingsOpen(false)}
        filters={filters}
        onToggle={onToggleCategory}
        showCompleted={showCompleted}
        onToggleShowCompleted={() => setShowCompleted((v) => !v)}
        counts={payload.counts}
        completedCount={completed.size}
        visibleCount={visibleMarkers.length}
      />

      <ScreenshotSyncPanel
        open={syncOpen && !building}
        onClose={() => setSyncOpen(false)}
        markers={payload.markers}
        completedIds={completed}
        onApply={onApplySyncCompletions}
      />

      <RoutePanel
        open={routeOpen}
        onClose={() => setRouteOpen(false)}
        hunt={routeHunt}
        onHuntChange={setRouteHunt}
        remainingByCategory={remainingByCategory}
        towardCastle={towardCastle}
        onTowardCastleChange={setTowardCastle}
        hasSelectedSeed={!!selected && !completed.has(selected.id)}
        phase={routePhase}
        route={routeMarkers}
        index={routeIndex}
        onStartAuto={onStartAuto}
        onStartBuilding={onStartBuilding}
        onFinishBuilding={onFinishBuilding}
        onUndoStop={() =>
          setRouteMarkers((prev) => nameStops(prev.slice(0, -1)))
        }
        onClearStops={() => setRouteMarkers([])}
        onRemoveStop={(id) =>
          setRouteMarkers((prev) => nameStops(prev.filter((m) => m.id !== id)))
        }
        onEnd={onEndRoute}
        onSkip={() => {
          if (routeIndex < routeMarkers.length - 1) {
            goToRouteStop(routeIndex + 1);
          }
        }}
        onPrev={() => {
          if (routeIndex > 0) goToRouteStop(routeIndex - 1);
        }}
        onGoToCurrent={() => goToRouteStop(routeIndex)}
        onReached={() => void onReached()}
      />

      {!building && (
        <MarkerDetails
          marker={selected}
          completed={selected ? completed.has(selected.id) : false}
          onClose={() => setSelected(null)}
          onToggleCompleted={onToggleCompleted}
        />
      )}
    </div>
  );
}
