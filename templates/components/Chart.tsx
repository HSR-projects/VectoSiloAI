// @ts-nocheck
// Template ID: data-chart
"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface DataPoint {
  label: string;
  value: number;
  color?: string;
}

interface ChartProps {
  data: DataPoint[];
  type?: "bar" | "line";
  height?: number;
  showGrid?: boolean;
  showLabels?: boolean;
  showValues?: boolean;
  animated?: boolean;
  className?: string;
}

export function Chart({
  data,
  type = "bar",
  height = 200,
  showGrid = true,
  showLabels = true,
  showValues = false,
  animated = true,
  className,
}: ChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const minHeight = 2;

  if (type === "line") {
    const points = data.map((d, i) => ({
      x: (i / (data.length - 1)) * 100,
      y: 100 - (d.value / maxValue) * 100,
    }));

    const pathD = points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
      .join(" ");

    const areaPathD = `${pathD} L 100 100 L 0 100 Z`;

    return (
      <div className={cn("w-full", className)}>
        <svg
          viewBox={`0 0 100 100`}
          preserveAspectRatio="none"
          className="w-full"
          style={{ height }}
        >
          {showGrid && (
            <>
              {[0, 25, 50, 75].map((y) => (
                <line
                  key={y}
                  x1={0}
                  y1={y}
                  x2={100}
                  y2={y}
                  stroke="#424242"
                  strokeWidth={0.3}
                />
              ))}
            </>
          )}
          {animated ? (
            <>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgb(16,163,127)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="rgb(16,163,127)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <motion.path
                d={areaPathD}
                fill="url(#areaGrad)"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8 }}
              />
              <motion.path
                d={pathD}
                fill="none"
                stroke="#10a37f"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1, ease: "easeInOut" }}
              />
              {points.map((p, i) => (
                <motion.circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={1.5}
                  fill="#10a37f"
                  initial={{ opacity: 0, r: 0 }}
                  animate={{ opacity: 1, r: 1.5 }}
                  transition={{ delay: 0.8 + i * 0.05 }}
                />
              ))}
            </>
          ) : (
            <>
              <path d={areaPathD} fill="rgb(16,163,127,0.15)" />
              <path
                d={pathD}
                fill="none"
                stroke="#10a37f"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {points.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={1.5} fill="#10a37f" />
              ))}
            </>
          )}
        </svg>
        {showLabels && (
          <div className="mt-2 flex justify-between px-1">
            {data.map((d, i) => (
              <span
                key={i}
                className="text-[10px] text-incogni-muted truncate"
                style={{ maxWidth: `${100 / data.length}%` }}
              >
                {d.label}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <div
        className="flex items-end gap-2"
        style={{ height }}
      >
        {data.map((d, i) => {
          const pct = Math.max((d.value / maxValue) * 100, minHeight);
          return (
            <div
              key={i}
              className="flex flex-1 flex-col items-center justify-end h-full"
            >
              {showValues && (
                <span className="mb-1 text-[10px] font-medium text-incogni-muted">
                  {d.value}
                </span>
              )}
              <div className="w-full flex justify-center" style={{ height: `${pct}%` }}>
                {animated ? (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "100%" }}
                    transition={{ duration: 0.6, delay: i * 0.05, ease: "easeOut" }}
                    className="w-full max-w-[32px] rounded-t-md"
                    style={{ backgroundColor: d.color || "#10a37f" }}
                  />
                ) : (
                  <div
                    className="w-full max-w-[32px] rounded-t-md"
                    style={{
                      height: `${pct}%`,
                      backgroundColor: d.color || "#10a37f",
                    }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
      {showLabels && (
        <div className="mt-2 flex gap-2">
          {data.map((d, i) => (
            <span
              key={i}
              className="flex-1 text-center text-[10px] text-incogni-muted truncate"
            >
              {d.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
