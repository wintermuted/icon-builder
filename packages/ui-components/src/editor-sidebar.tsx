import { useState, type ReactNode } from "react";
import { Icon } from "./icon.js";

export function EditorSidebar({
  side,
  label,
  children,
}: {
  side: "left" | "right";
  label: string;
  children: ReactNode;
}) {
  const key = `wm-assets-${side}-sidebar-collapsed`;
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(key) === "true");
  const contentId = `asset-detail-${side}-sidebar-content`;
  return (
    <aside
      id={`asset-detail-${side}-sidebar`}
      className={`asset-detail-sidebar asset-detail-sidebar--${side}${collapsed ? " is-collapsed" : ""}`}
      aria-label={label}
    >
      <div className="asset-detail-sidebar-header">
        <span>{label}</span>
        <button
          id={`asset-detail-${side}-sidebar-toggle`}
          className="asset-detail-sidebar-toggle"
          type="button"
          aria-controls={contentId}
          aria-expanded={!collapsed}
          aria-label={`${collapsed ? "Expand" : "Collapse"} ${label.toLowerCase()}`}
          title={`${collapsed ? "Expand" : "Collapse"} ${label.toLowerCase()}`}
          onClick={() => {
            localStorage.setItem(key, String(!collapsed));
            setCollapsed(!collapsed);
          }}
        >
          <Icon
            name={
              side === "left"
                ? collapsed
                  ? "PanelLeftOpen"
                  : "PanelLeftClose"
                : collapsed
                  ? "PanelRightOpen"
                  : "PanelRightClose"
            }
          />
        </button>
      </div>
      <div id={contentId} className="asset-detail-sidebar-content" inert={collapsed}>
        {children}
      </div>
    </aside>
  );
}
