"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  MapPin,
  Navigation,
  ExternalLink,
  Maximize2,
  Minimize2,
  Star,
  Building2,
  Compass,
  X,
  Plus,
  Minus,
  RotateCcw,
  Search,
  Send,
  Filter,
  Check,
} from "lucide-react";
import type { MapPlace } from "@/types";
import { cn } from "@/lib/utils";

interface MapCardProps {
  places: MapPlace[];
}

// Convert Lat/Lon to Web Mercator Tile Coordinates
function latLonToTileCoords(lat: number, lon: number, zoom: number) {
  const n = Math.pow(2, zoom);
  const xtile = ((lon + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const ytile =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  return { x: xtile, y: ytile };
}

// Distance calculation formula in kilometers (Haversine formula)
function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(1);
}

export function MapCard({ places }: MapCardProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [resolvedPlaces, setResolvedPlaces] = useState<MapPlace[]>(places);
  const [zoom, setZoom] = useState(14);
  const [mapStyle, setMapStyle] = useState<"voyager" | "satellite" | "osm">("voyager");
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [filterOpenNow, setFilterOpenNow] = useState(false);
  const [promptInput, setPromptInput] = useState("");

  const isDraggingRef = useRef(false);
  const startDragRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // 1. Geocode any missing coordinates dynamically via free Photon API
  useEffect(() => {
    setResolvedPlaces(places);
    const needsGeocode = places.some(
      (p) => !p.latitude || !p.longitude || (p.latitude === 0 && p.longitude === 0)
    );
    if (!needsGeocode) return;

    let isMounted = true;
    Promise.all(
      places.map(async (p) => {
        if (p.latitude && p.longitude && (p.latitude !== 0 || p.longitude !== 0)) return p;
        try {
          const res = await fetch(
            `https://photon.komoot.io/api/?q=${encodeURIComponent(p.title)}`
          );
          const data = await res.json();
          const feat = data.features?.[0];
          if (feat?.geometry?.coordinates) {
            const [lon, lat] = feat.geometry.coordinates;
            const props = feat.properties || {};
            const addr = [
              props.name || p.title,
              props.street,
              props.city || props.district || props.county,
              props.state,
              props.country,
            ]
              .filter(Boolean)
              .join(", ");
            return {
              ...p,
              latitude: lat,
              longitude: lon,
              address: p.address && p.address !== p.title ? p.address : addr || p.title,
              category:
                p.category && p.category !== "Location"
                  ? p.category
                  : props.type || props.osm_key || "Landmark",
            };
          }
        } catch {
          // Geocode fallback failure
        }
        return p;
      })
    ).then((updated) => {
      if (isMounted) setResolvedPlaces(updated);
    });

    return () => {
      isMounted = false;
    };
  }, [places]);

  const validPlaces = (resolvedPlaces || []).filter(
    (p) => p.latitude && p.longitude && (p.latitude !== 0 || p.longitude !== 0)
  );

  const targetPlaces = validPlaces.length > 0 ? validPlaces : resolvedPlaces || [];
  const activePlace = targetPlaces[activeIdx] || targetPlaces[0] || { latitude: 16.7121, longitude: 74.241, title: "Location" };

  // Calculate Map Center
  const centerLat = activePlace.latitude || 16.7121;
  const centerLon = activePlace.longitude || 74.241;

  // Web Mercator Tile Grid Calculations
  const centerTile = latLonToTileCoords(centerLat, centerLon, zoom);

  // Generate 5x5 grid of map tiles around center for seamless full-screen drag/zoom
  const tileGrid = useMemo(() => {
    const tileX = Math.floor(centerTile.x);
    const tileY = Math.floor(centerTile.y);
    const maxTile = Math.pow(2, zoom);

    const tiles: { x: number; y: number; url: string }[] = [];
    for (let dx = -3; dx <= 3; dx++) {
      for (let dy = -3; dy <= 3; dy++) {
        const tx = (tileX + dx + maxTile) % maxTile;
        const ty = Math.min(Math.max(tileY + dy, 0), maxTile - 1);

        let tileUrl = `https://a.basemaps.cartocdn.com/rastertiles/voyager/${zoom}/${tx}/${ty}.png`;
        if (mapStyle === "osm") {
          tileUrl = `https://tile.openstreetmap.org/${zoom}/${tx}/${ty}.png`;
        } else if (mapStyle === "satellite") {
          tileUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${ty}/${tx}`;
        }

        tiles.push({ x: tx, y: ty, url: tileUrl });
      }
    }
    return tiles;
  }, [centerTile.x, centerTile.y, zoom, mapStyle]);

  // Project pixel coordinates of each place on the canvas viewport
  const projectedPlaces = useMemo(() => {
    return targetPlaces.map((place, idx) => {
      const tileCoords = latLonToTileCoords(place.latitude, place.longitude, zoom);
      const pixelX = (tileCoords.x - centerTile.x) * 256 + panOffset.x;
      const pixelY = (tileCoords.y - centerTile.y) * 256 + panOffset.y;
      return {
        ...place,
        idx,
        pixelX,
        pixelY,
      };
    });
  }, [targetPlaces, centerTile.x, centerTile.y, zoom, panOffset]);

  // Pan Handlers (Mouse & Touch Drag)
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    startDragRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    setPanOffset({
      x: e.clientX - startDragRef.current.x,
      y: e.clientY - startDragRef.current.y,
    });
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const resetView = () => {
    setPanOffset({ x: 0, y: 0 });
    setZoom(14);
  };

  if (!resolvedPlaces || resolvedPlaces.length === 0) return null;

  const handleAskSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!promptInput.trim()) return;
    const query = promptInput.trim();
    setPromptInput("");
    setIsExpanded(false);

    const chatInput = document.querySelector<HTMLTextAreaElement>("textarea");
    if (chatInput) {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        "value"
      )?.set;
      if (nativeSetter) {
        nativeSetter.call(chatInput, query);
        chatInput.dispatchEvent(new Event("input", { bubbles: true }));
        setTimeout(() => {
          const form = chatInput.closest("form");
          if (form) {
            form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
          }
        }, 50);
      }
    }
  };

  return (
    <>
      {/* 1. Inline Map Container inside Chat */}
      <div className="group relative my-5 h-80 sm:h-96 w-full overflow-hidden rounded-3xl border border-incogni-border bg-[#f4f3f0] dark:bg-[#0f172a] shadow-2xl transition-all">
        {/* Viewport Canvas Engine */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="relative h-full w-full cursor-grab active:cursor-grabbing overflow-hidden select-none"
        >
          {/* Tile Grid */}
          <div
            className="absolute inset-0 transition-transform duration-75"
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
            }}
          >
            {tileGrid.map((tile, i) => {
              const tileXOffset = (tile.x - Math.floor(centerTile.x)) * 256;
              const tileYOffset = (tile.y - Math.floor(centerTile.y)) * 256;
              const baseOffsetX = -(centerTile.x % 1) * 256;
              const baseOffsetY = -(centerTile.y % 1) * 256;

              return (
                <img
                  key={`${tile.x}-${tile.y}-${i}`}
                  src={tile.url}
                  alt="Map tile"
                  draggable={false}
                  className="absolute h-[256px] w-[256px] object-cover pointer-events-none transition-opacity duration-300"
                  style={{
                    left: `calc(50% + ${tileXOffset + baseOffsetX}px)`,
                    top: `calc(50% + ${tileYOffset + baseOffsetY}px)`,
                  }}
                  loading="lazy"
                />
              );
            })}
          </div>

          {/* SVG Vector Drawing Layer */}
          <svg className="absolute inset-0 h-full w-full pointer-events-none z-10">
            {projectedPlaces.map((p) => {
              const cx = `calc(50% + ${p.pixelX}px)`;
              const cy = `calc(50% + ${p.pixelY}px)`;
              const isActive = p.idx === activeIdx;

              return (
                <g key={`glow-${p.idx}`}>
                  {isActive && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r="42"
                      className="fill-sky-500/15 stroke-sky-400 stroke-2 animate-pulse"
                      strokeDasharray="4 2"
                    />
                  )}
                </g>
              );
            })}
          </svg>

          {/* Map Pin Badges */}
          {projectedPlaces.map((p) => {
            const isSelected = p.idx === activeIdx;
            return (
              <div
                key={`pin-${p.idx}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveIdx(p.idx);
                }}
                className={cn(
                  "absolute z-20 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold shadow-2xl transition-all cursor-pointer -translate-x-1/2 -translate-y-full hover:scale-110",
                  isSelected
                    ? "bg-slate-950 text-white border-2 border-sky-400 shadow-sky-500/30 ring-4 ring-sky-500/20 scale-105"
                    : "bg-white/95 text-slate-900 dark:bg-slate-900/95 dark:text-slate-100 border border-slate-200 dark:border-slate-700 hover:bg-white"
                )}
                style={{
                  left: `calc(50% + ${p.pixelX}px)`,
                  top: `calc(50% + ${p.pixelY}px)`,
                }}
              >
                {p.rating ? (
                  <span className="flex items-center gap-0.5 text-amber-400 font-extrabold">
                    <Star className="h-3 w-3 fill-amber-400" />
                    {p.rating}
                  </span>
                ) : (
                  <MapPin className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                )}
                <span className="truncate max-w-[140px]">{p.title}</span>
              </div>
            );
          })}
        </div>

        {/* Top Right "Expand" Floating Button */}
        <div className="absolute top-3 right-3 z-30">
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="flex items-center gap-1.5 rounded-full border border-incogni-border/80 bg-incogni-surface/90 px-3.5 py-1.5 text-xs font-semibold text-incogni-text shadow-lg backdrop-blur-md transition-all hover:bg-incogni-surface-2 hover:scale-105"
          >
            <span>Expand</span>
            <Maximize2 className="h-3 w-3 text-incogni-muted" />
          </button>
        </div>

        {/* Floating Overlay Place Cards */}
        <div className="absolute bottom-3 inset-x-3 z-30 flex gap-2.5 overflow-x-auto pb-1 pt-1 px-1 [&::-webkit-scrollbar]:hidden">
          {targetPlaces.map((place, idx) => {
            const isSelected = activeIdx === idx;
            return (
              <div
                key={idx}
                onClick={() => {
                  setActiveIdx(idx);
                  setPanOffset({ x: 0, y: 0 });
                }}
                className={cn(
                  "flex shrink-0 items-center gap-3 rounded-2xl border p-2.5 shadow-2xl transition-all cursor-pointer min-w-[240px] max-w-[280px]",
                  isSelected
                    ? "border-sky-400 bg-incogni-surface/95 ring-2 ring-sky-400/30 shadow-sky-500/20"
                    : "border-incogni-border/70 bg-incogni-surface/85 backdrop-blur-xl hover:border-sky-400/50 hover:bg-incogni-surface/95"
                )}
              >
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-incogni-border/60 bg-incogni-surface-2 flex items-center justify-center">
                  {place.imgSrc ? (
                    <img
                      src={place.imgSrc}
                      alt={place.title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sky-500/20 to-incogni-surface-2 text-sky-400">
                      <Building2 className="h-5 w-5" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-xs font-semibold text-incogni-text">
                    {place.title}
                  </h4>
                  <p className="truncate text-[11px] text-incogni-muted mt-0.5">
                    {place.category || "Campus / Landmark"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Fullscreen ChatGPT Map Experience (Exact UI from your screenshot) */}
      {isExpanded && (
        <div className="fixed inset-0 z-[99999] flex h-screen w-screen overflow-hidden bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-200 select-none">
          {/* Background Fullscreen Interactive Vector Canvas */}
          <div
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="absolute inset-0 h-full w-full cursor-grab active:cursor-grabbing overflow-hidden"
          >
            {/* Tile Engine Grid */}
            <div
              className="absolute inset-0 transition-transform duration-75"
              style={{
                transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
              }}
            >
              {tileGrid.map((tile, i) => {
                const tileXOffset = (tile.x - Math.floor(centerTile.x)) * 256;
                const tileYOffset = (tile.y - Math.floor(centerTile.y)) * 256;
                const baseOffsetX = -(centerTile.x % 1) * 256;
                const baseOffsetY = -(centerTile.y % 1) * 256;

                return (
                  <img
                    key={`exp-${tile.x}-${tile.y}-${i}`}
                    src={tile.url}
                    alt="Map tile"
                    draggable={false}
                    className="absolute h-[256px] w-[256px] object-cover pointer-events-none transition-opacity duration-300"
                    style={{
                      left: `calc(50% + ${tileXOffset + baseOffsetX}px)`,
                      top: `calc(50% + ${tileYOffset + baseOffsetY}px)`,
                    }}
                  />
                );
              })}
            </div>

            {/* SVG Vector Drawing Layer */}
            <svg className="absolute inset-0 h-full w-full pointer-events-none z-10">
              {projectedPlaces.map((p) => {
                const cx = `calc(50% + ${p.pixelX}px)`;
                const cy = `calc(50% + ${p.pixelY}px)`;
                const isActive = p.idx === activeIdx;

                return (
                  <g key={`exp-glow-${p.idx}`}>
                    {isActive && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r="54"
                        className="fill-sky-500/20 stroke-sky-400 stroke-2 animate-pulse"
                        strokeDasharray="4 2"
                      />
                    )}
                  </g>
                );
              })}

              {/* Distance lines in full screen view */}
              {projectedPlaces.length > 1 &&
                projectedPlaces.map((p, idx) => {
                  if (idx === 0) return null;
                  const prev = projectedPlaces[0];
                  const x1 = `calc(50% + ${prev.pixelX}px)`;
                  const y1 = `calc(50% + ${prev.pixelY}px)`;
                  const x2 = `calc(50% + ${p.pixelX}px)`;
                  const y2 = `calc(50% + ${p.pixelY}px)`;

                  const distKm = getDistanceKm(
                    prev.latitude,
                    prev.longitude,
                    p.latitude,
                    p.longitude
                  );

                  return (
                    <g key={`exp-line-${idx}`}>
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        className="stroke-sky-400 stroke-[3]"
                        strokeDasharray="6 4"
                      />
                      <foreignObject
                        x={`calc(50% + ${(prev.pixelX + p.pixelX) / 2 - 40}px)`}
                        y={`calc(50% + ${(prev.pixelY + p.pixelY) / 2 - 14}px)`}
                        width="80"
                        height="28"
                      >
                        <div className="flex items-center justify-center rounded-full bg-slate-900/95 text-xs font-bold text-sky-300 border border-sky-400/40 shadow-2xl px-2.5 py-0.5 backdrop-blur-md">
                          {distKm} km
                        </div>
                      </foreignObject>
                    </g>
                  );
                })}
            </svg>

            {/* Custom Map Pin Badges */}
            {projectedPlaces.map((p) => {
              const isSelected = p.idx === activeIdx;

              return (
                <div
                  key={`exp-pin-${p.idx}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveIdx(p.idx);
                  }}
                  className={cn(
                    "absolute z-20 flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold shadow-2xl transition-all cursor-pointer -translate-x-1/2 -translate-y-full hover:scale-110",
                    isSelected
                      ? "bg-slate-950 text-white border-2 border-sky-400 shadow-sky-500/40 ring-4 ring-sky-500/25 scale-110"
                      : "bg-white/95 text-slate-900 dark:bg-slate-900/95 dark:text-slate-100 border border-slate-200 dark:border-slate-700 hover:bg-white"
                  )}
                  style={{
                    left: `calc(50% + ${p.pixelX}px)`,
                    top: `calc(50% + ${p.pixelY}px)`,
                  }}
                >
                  {p.rating ? (
                    <span className="flex items-center gap-0.5 text-amber-400 font-extrabold">
                      <Star className="h-3.5 w-3.5 fill-amber-400" />
                      {p.rating}
                    </span>
                  ) : (
                    <MapPin className="h-4 w-4 text-sky-400 shrink-0" />
                  )}
                  <span className="truncate max-w-[180px] text-xs">{p.title}</span>
                </div>
              );
            })}
          </div>

          {/* Top-Left Controls Stack (Matching ChatGPT Screenshot: Close button + Zoom Stack) */}
          <div className="fixed top-4 left-4 z-50 flex flex-col gap-3">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 shadow-xl backdrop-blur-md transition-all hover:bg-slate-100 dark:hover:bg-slate-800 hover:scale-105"
              title="Close Map"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Stacked Zoom Controls (+ / -) */}
            <div className="flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-xl backdrop-blur-md overflow-hidden">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(z + 1, 18))}
                className="p-2.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border-b border-slate-200 dark:border-slate-800"
                title="Zoom In"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(z - 1, 3))}
                className="p-2.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Zoom Out"
              >
                <Minus className="h-4 w-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={resetView}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 shadow-xl backdrop-blur-md transition-all hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Recenter Map"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>

          {/* Top-Right Action Pill Filter (Matching ChatGPT Screenshot "Open Now") */}
          <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterOpenNow(!filterOpenNow)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold shadow-xl backdrop-blur-md transition-all",
                filterOpenNow
                  ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                  : "border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 hover:bg-white"
              )}
            >
              <Filter className="h-3.5 w-3.5" />
              <span>Open Now</span>
              {filterOpenNow && <Check className="h-3.5 w-3.5 text-emerald-400" />}
            </button>
          </div>

          {/* Right Floating Details Panel (Matching ChatGPT Screenshot Side Drawer Layout) */}
          <div className="fixed top-4 right-4 bottom-20 z-40 hidden sm:flex w-80 sm:w-96 flex-col rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 p-5 shadow-2xl backdrop-blur-2xl overflow-y-auto">
            {/* Header & Active Place Details */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Compass className="h-5 w-5 text-sky-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                  {activePlace.title}
                </h3>
              </div>
            </div>

            {/* Place Category & Address */}
            <div className="mt-3">
              <p className="text-xs text-sky-400 font-semibold uppercase tracking-wider">
                {activePlace.category || "Campus Ground / Landmark"}
              </p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {activePlace.address ||
                  `Coordinates: ${activePlace.latitude.toFixed(4)}, ${activePlace.longitude.toFixed(4)}`}
              </p>
            </div>

            {/* Directions Button */}
            <div className="mt-4 flex items-center gap-2">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${activePlace.latitude},${activePlace.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-sky-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-sky-400 transition-all"
              >
                <Navigation className="h-4 w-4" />
                <span>Get Directions</span>
              </a>
            </div>

            {/* Places List Comparison Section */}
            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Locations in View ({targetPlaces.length})
              </h4>

              <div className="flex flex-col gap-2.5">
                {targetPlaces.map((place, idx) => {
                  const isSelected = activeIdx === idx;
                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        setActiveIdx(idx);
                        setPanOffset({ x: 0, y: 0 });
                      }}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl border p-3 cursor-pointer transition-all",
                        isSelected
                          ? "border-sky-400 bg-sky-500/10 text-sky-300 ring-2 ring-sky-400/20"
                          : "border-slate-200 dark:border-slate-800 bg-slate-500/5 hover:border-sky-400/50"
                      )}
                    >
                      <div className="h-10 w-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-200 dark:bg-slate-800 flex items-center justify-center shrink-0">
                        {place.imgSrc ? (
                          <img
                            src={place.imgSrc}
                            alt={place.title}
                            className="h-full w-full object-cover rounded-xl"
                          />
                        ) : (
                          <Building2 className="h-4 w-4 text-sky-400" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h5 className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {place.title}
                        </h5>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {place.category || "Location"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom Prompt Bar (Matching ChatGPT Screenshot "+ Ask anything") */}
          <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 w-[90vw] max-w-xl">
            <form
              onSubmit={handleAskSubmit}
              className="flex items-center gap-3 rounded-full border border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 px-4 py-3 shadow-2xl backdrop-blur-2xl"
            >
              <Plus className="h-5 w-5 text-slate-400 shrink-0" />
              <input
                type="text"
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder="Ask anything about these places..."
                className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 outline-none placeholder:text-slate-400"
              />
              <button
                type="submit"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-md hover:scale-105 transition-transform shrink-0"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
