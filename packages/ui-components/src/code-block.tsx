import type { ComponentPropsWithRef } from "react";

export interface CodeBlockProps extends ComponentPropsWithRef<"pre"> {
  wrap?: boolean;
}

export function CodeBlock({ wrap = true, className = "", ...props }: CodeBlockProps) {
  return (
    <pre {...props} className={`wm-code-block${wrap ? " wm-code-block--wrap" : ""} ${className}`} />
  );
}
