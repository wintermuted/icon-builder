import { useCallback, useLayoutEffect, useRef } from "react";
import type { ComponentPropsWithRef, RefObject } from "react";

export interface AnchoredPopoverProps extends Omit<ComponentPropsWithRef<"div">, "popover"> {
  anchorRef: RefObject<HTMLElement | null>;
  offset?: number;
  viewportPadding?: number;
  onOpenChange?(open: boolean): void;
}

export function AnchoredPopover({
  anchorRef,
  offset = 6,
  viewportPadding = 8,
  onOpenChange,
  ref,
  role = "dialog",
  className = "",
  style,
  ...props
}: AnchoredPopoverProps) {
  const element = useRef<HTMLDivElement | null>(null);
  const attach = useCallback(
    (node: HTMLDivElement | null) => {
      element.current = node;
      if (typeof ref === "function") return ref(node);
      if (ref) ref.current = node;
    },
    [ref],
  );
  useLayoutEffect(() => {
    const popover = element.current;
    if (!popover) return;
    const position = () => {
      const anchor = anchorRef.current;
      if (!anchor || !popover.matches(":popover-open")) return;
      const bounds = anchor.getBoundingClientRect();
      const panel = popover.getBoundingClientRect();
      popover.style.top = `${Math.max(viewportPadding, Math.min(bounds.bottom + offset, window.innerHeight - panel.height - viewportPadding))}px`;
      popover.style.left = `${Math.max(viewportPadding, Math.min(bounds.left, window.innerWidth - panel.width - viewportPadding))}px`;
    };
    const toggle = () => {
      const open = popover.matches(":popover-open");
      anchorRef.current?.setAttribute("aria-expanded", String(open));
      position();
      onOpenChange?.(open);
    };
    const resize = new ResizeObserver(position);
    resize.observe(popover);
    if (anchorRef.current) resize.observe(anchorRef.current);
    popover.addEventListener("toggle", toggle);
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    anchorRef.current?.setAttribute("aria-expanded", String(popover.matches(":popover-open")));
    position();
    return () => {
      resize.disconnect();
      popover.removeEventListener("toggle", toggle);
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
      anchorRef.current?.setAttribute("aria-expanded", "false");
    };
  }, [anchorRef, offset, viewportPadding, onOpenChange]);
  return (
    <div
      {...props}
      ref={attach}
      popover="auto"
      role={role}
      className={`wm-anchored-popover ${className}`}
      style={{
        maxWidth: `calc(100vw - ${viewportPadding * 2}px)`,
        maxHeight: `calc(100dvh - ${viewportPadding * 2}px)`,
        ...style,
      }}
    />
  );
}
