"use client";

import React, { useState, useMemo } from "react";
import { TrendingUp, TrendingDown, Info } from "lucide-react";
import type { StockData, StockPoint } from "@/types";
import { cn } from "@/lib/utils";

interface StockCardProps {
  data: StockData;
}

// Timeframe options matching ChatGPT stock chart widget
type Timeframe = "1D" | "5D" | "1M" | "6M" | "YTD" | "1Y" | "5Y" | "MAX";

export function StockCard({ data }: StockCardProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>("1D");
  const [hoveredPoint, setHoveredPoint] = useState<StockPoint | null>(null);

  // Generate smooth price points if not explicitly provided
  const points: StockPoint[] = useMemo(() => {
    if (data.history && data.history[timeframe]) {
      return data.history[timeframe];
    }

    const basePrice = data.price || 342.09;
    const isNegative = (data.change || -3.37) < 0;
    const count = timeframe === "1D" ? 28 : timeframe === "5D" ? 35 : 45;

    const result: StockPoint[] = [];
    let current = basePrice + (isNegative ? 6.5 : -6.5);

    const times1D = [
      "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
      "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM",
      "2:30 PM", "3:00 PM", "3:30 PM", "4:00 PM"
    ];

    for (let i = 0; i < count; i++) {
      const progress = i / (count - 1);
      // Realistic market fluctuation curve
      const sine = Math.sin(progress * Math.PI * 3) * (basePrice * 0.012);
      const trend = isNegative ? -progress * (basePrice * 0.02) : progress * (basePrice * 0.02);
      const noise = (Math.random() - 0.48) * (basePrice * 0.006);

      const price = parseFloat((current + sine + trend + noise).toFixed(2));
      const time = timeframe === "1D" 
        ? times1D[Math.floor(progress * (times1D.length - 1))] || "12:00 PM"
        : `Point ${i + 1}`;

      result.push({ time, price });
    }

    // Set last point to exact basePrice
    if (result.length > 0) {
      result[result.length - 1].price = basePrice;
    }

    return result;
  }, [data.price, data.change, data.history, timeframe]);

  // Calculate min & max for SVG scaling
  const minPrice = useMemo(() => Math.min(...points.map((p) => p.price)), [points]);
  const maxPrice = useMemo(() => Math.max(...points.map((p) => p.price)), [points]);
  const priceRange = maxPrice - minPrice || 1;

  const isPositive = (data.change || 0) >= 0;
  const strokeColor = isPositive ? "#10b981" : "#ef4444";
  const gradientId = `stock-grad-${data.symbol || "googl"}-${isPositive ? "up" : "down"}`;

  // SVG Path Construction
  const svgWidth = 600;
  const svgHeight = 220;
  const padding = 20;

  const chartPoints = useMemo(() => {
    return points.map((p, i) => {
      const x = padding + (i / (points.length - 1)) * (svgWidth - padding * 2);
      const y =
        svgHeight -
        padding -
        ((p.price - minPrice) / priceRange) * (svgHeight - padding * 2);
      return { x, y, price: p.price, time: p.time };
    });
  }, [points, minPrice, priceRange]);

  const pathD = useMemo(() => {
    if (chartPoints.length === 0) return "";
    return chartPoints.reduce((acc, p, i) => {
      return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
    }, "");
  }, [chartPoints]);

  const areaD = useMemo(() => {
    if (chartPoints.length === 0) return "";
    const firstX = chartPoints[0].x;
    const lastX = chartPoints[chartPoints.length - 1].x;
    return `${pathD} L ${lastX} ${svgHeight - padding} L ${firstX} ${svgHeight - padding} Z`;
  }, [pathD, chartPoints]);

  return (
    <div className="my-5 w-full overflow-hidden rounded-3xl border border-incogni-border bg-incogni-surface p-5 shadow-2xl transition-all">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-incogni-border pb-4">
        <div>
          <h3 className="text-sm font-semibold text-incogni-muted uppercase tracking-wider">
            {data.name || "Alphabet Inc"} ({data.symbol || "GOOGL"})
          </h3>
          <div className="mt-1 flex items-baseline gap-3">
            <span className="text-3xl font-extrabold text-incogni-text tracking-tight">
              ${data.price?.toFixed(2) || "342.09"}
            </span>
            <span
              className={cn(
                "flex items-center gap-1 text-sm font-bold",
                isPositive ? "text-emerald-400" : "text-rose-400"
              )}
            >
              {isPositive ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              {isPositive ? "+" : ""}
              ${data.change?.toFixed(2) || "-3.37"} (
              {data.changePercent?.toFixed(2) || "0.97"}%) • Today
            </span>
          </div>

          {/* After Hours Trading Info */}
          <p className="mt-1 text-xs text-incogni-muted">
            <span className="font-medium text-incogni-text">
              ${data.afterHoursPrice?.toFixed(2) || "330.80"}
            </span>{" "}
            <span className="text-rose-400">
              -${data.afterHoursChange?.toFixed(2) || "11.29"} (
              {data.afterHoursChangePercent?.toFixed(1) || "3.3"}%)
            </span>{" "}
            After Hours
          </p>
        </div>
      </div>

      {/* Timeframe Range Selector Tabs (1D, 5D, 1M, 6M, YTD, 1Y, 5Y, MAX) */}
      <div className="mt-4 flex items-center gap-1.5 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden">
        {(["1D", "5D", "1M", "6M", "YTD", "1Y", "5Y", "MAX"] as Timeframe[]).map(
          (tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => setTimeframe(tf)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-bold transition-all shrink-0",
                timeframe === tf
                  ? "bg-incogni-surface-2 text-incogni-text shadow-md border border-incogni-border"
                  : "text-incogni-muted hover:text-incogni-text hover:bg-incogni-surface-2/50"
              )}
            >
              {tf}
            </button>
          )
        )}
      </div>

      {/* Dynamic SVG Stock Line Chart Container */}
      <div className="relative mt-3 h-56 w-full overflow-hidden rounded-2xl bg-incogni-surface-2/30 p-2">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="h-full w-full overflow-visible"
          onMouseLeave={() => setHoveredPoint(null)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor={strokeColor}
                stopOpacity={0.35}
              />
              <stop
                offset="100%"
                stopColor={strokeColor}
                stopOpacity={0.0}
              />
            </linearGradient>
          </defs>

          {/* Reference Grid Lines */}
          <line
            x1={padding}
            y1={padding}
            x2={svgWidth - padding}
            y2={padding}
            stroke="currentColor"
            className="text-incogni-border/40"
            strokeDasharray="4 4"
          />
          <line
            x1={padding}
            y1={svgHeight / 2}
            x2={svgWidth - padding}
            y2={svgHeight / 2}
            stroke="currentColor"
            className="text-incogni-border/40"
            strokeDasharray="4 4"
          />
          <line
            x1={padding}
            y1={svgHeight - padding}
            x2={svgWidth - padding}
            y2={svgHeight - padding}
            stroke="currentColor"
            className="text-incogni-border/40"
            strokeDasharray="4 4"
          />

          {/* Area Gradient Fill */}
          <path d={areaD} fill={`url(#${gradientId})`} />

          {/* Stock Trend Line Path */}
          <path
            d={pathD}
            fill="none"
            stroke={strokeColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Interactive Hover Point Overlay */}
          {chartPoints.map((pt, i) => (
            <circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r="6"
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredPoint({ time: pt.time, price: pt.price })}
            />
          ))}

          {/* Active Hover Tooltip Marker */}
          {hoveredPoint && (
            <g>
              <line
                x1={chartPoints.find((p) => p.time === hoveredPoint.time)?.x || 0}
                y1={padding}
                x2={chartPoints.find((p) => p.time === hoveredPoint.time)?.x || 0}
                y2={svgHeight - padding}
                stroke={strokeColor}
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <circle
                cx={chartPoints.find((p) => p.time === hoveredPoint.time)?.x || 0}
                cy={chartPoints.find((p) => p.time === hoveredPoint.time)?.y || 0}
                r="5"
                fill={strokeColor}
                className="animate-ping"
              />
            </g>
          )}
        </svg>

        {/* Floating Hover Tooltip Badge */}
        {hoveredPoint && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 rounded-full border border-incogni-border bg-incogni-surface px-3 py-1 text-xs font-bold text-incogni-text shadow-xl backdrop-blur-md">
            <span>{hoveredPoint.time}</span> •{" "}
            <span style={{ color: strokeColor }}>${hoveredPoint.price.toFixed(2)}</span>
          </div>
        )}

        {/* X-Axis Time Labels */}
        <div className="mt-1 flex items-center justify-between px-3 text-[10px] font-semibold text-incogni-muted">
          <span>10:00 AM</span>
          <span>11:00 AM</span>
          <span>12:00 PM</span>
          <span>1:00 PM</span>
          <span>2:00 PM</span>
          <span>3:00 PM</span>
          <span>4:00 PM</span>
        </div>
      </div>

      {/* Financial Metrics Grid (Exact ChatGPT Table Layout) */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2.5 border-t border-incogni-border pt-4 text-xs">
        <div className="flex items-center justify-between py-1 border-b border-incogni-border/40">
          <span className="text-incogni-muted font-medium">Open</span>
          <span className="font-bold text-incogni-text">
            {data.open || "348.21"}
          </span>
        </div>
        <div className="flex items-center justify-between py-1 border-b border-incogni-border/40">
          <span className="text-incogni-muted font-medium">Volume</span>
          <span className="font-bold text-incogni-text">
            {data.volume || "39.3M"}
          </span>
        </div>
        <div className="flex items-center justify-between py-1 border-b border-incogni-border/40">
          <span className="text-incogni-muted font-medium">Market Cap</span>
          <span className="font-bold text-incogni-text">
            {data.marketCap || "4.14T"}
          </span>
        </div>

        <div className="flex items-center justify-between py-1 border-b border-incogni-border/40">
          <span className="text-incogni-muted font-medium">Day Low</span>
          <span className="font-bold text-incogni-text">
            {data.dayLow || "325.3"}
          </span>
        </div>
        <div className="flex items-center justify-between py-1 border-b border-incogni-border/40">
          <span className="text-incogni-muted font-medium">Year Low</span>
          <span className="font-bold text-incogni-text">
            {data.yearLow || "187.82"}
          </span>
        </div>
        <div className="flex items-center justify-between py-1 border-b border-incogni-border/40">
          <span className="text-incogni-muted font-medium">EPS (TTM)</span>
          <span className="font-bold text-incogni-text">
            {data.eps || "13.11"}
          </span>
        </div>

        <div className="flex items-center justify-between py-1 border-b border-incogni-border/40">
          <span className="text-incogni-muted font-medium">Day High</span>
          <span className="font-bold text-incogni-text">
            {data.dayHigh || "353.1"}
          </span>
        </div>
        <div className="flex items-center justify-between py-1 border-b border-incogni-border/40">
          <span className="text-incogni-muted font-medium">Year High</span>
          <span className="font-bold text-incogni-text">
            {data.yearHigh || "408.61"}
          </span>
        </div>
        <div className="flex items-center justify-between py-1 border-b border-incogni-border/40">
          <span className="text-incogni-muted font-medium">P/E Ratio</span>
          <span className="font-bold text-incogni-text">
            {data.peRatio || "26.09"}
          </span>
        </div>
      </div>
    </div>
  );
}
