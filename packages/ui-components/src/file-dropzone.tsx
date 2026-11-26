import { useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Icon } from "./icon.js";

export interface FileDropzoneProps {
  id?: string;
  inputId?: string;
  className?: string;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  label?: ReactNode;
  hint?: ReactNode;
  onFilesSelected(files: File[]): void;
}

export function FileDropzone({
  id,
  inputId,
  className = "project-grounding-dropzone",
  accept,
  multiple = false,
  disabled = false,
  label = "Drop files here or choose files",
  hint,
  onFilesSelected,
}: FileDropzoneProps) {
  const generatedId = useId();
  const [dragging, setDragging] = useState(false);
  const depth = useRef(0);
  return (
    <label
      id={id}
      htmlFor={inputId ?? generatedId}
      className={`${className}${dragging && !disabled ? " is-dragging" : ""}`}
      aria-disabled={disabled || undefined}
      onDragEnter={(event) => {
        event.preventDefault();
        depth.current += 1;
        if (!disabled) setDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => {
        depth.current = Math.max(0, depth.current - 1);
        if (!depth.current) setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        depth.current = 0;
        setDragging(false);
        const files = Array.from(event.dataTransfer.files);
        if (!disabled && files.length) onFilesSelected(multiple ? files : files.slice(0, 1));
      }}
    >
      <input
        id={inputId ?? generatedId}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          if (files.length) onFilesSelected(files);
        }}
      />
      <Icon name="ImageUp" />
      <span>{label}</span>
      {hint && <small>{hint}</small>}
    </label>
  );
}
