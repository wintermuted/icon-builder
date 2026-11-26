import { useEffect, useState } from "react";
import { loadAssetColors } from "../svg/analysis.js";
import type { Asset } from "../types.js";

export function AssetPalette({ asset }: { asset: Asset }) {
  const [colors, setColors] = useState<string[]>([]);
  const [status, setStatus] = useState("Loading...");
  useEffect(() => {
    let active = true;
    loadAssetColors(asset.source).then(
      (result) => {
        if (!active) return;
        setColors(result);
        setStatus(result.length ? "" : "No explicit colors");
      },
      (error) => {
        console.error("Asset colors unavailable", error);
        if (active) setStatus("Colors unavailable");
      },
    );
    return () => {
      active = false;
    };
  }, [asset.source]);
  return (
    <div className="asset-colors-list">
      {status}
      {colors.map((color) => (
        <span key={color} className="asset-color" aria-label={color} data-tooltip={color}>
          <span
            className="asset-color-swatch"
            style={{ backgroundColor: color }}
            aria-hidden="true"
          />
        </span>
      ))}
    </div>
  );
}
