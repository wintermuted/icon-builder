import { useEffect, useRef } from "react";
import type {
  ButtonHTMLAttributes,
  FormEventHandler,
  FormHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
} from "react";
import { StatusMessage } from "./status-message.js";

export interface InlineRenameProps extends Omit<
  FormHTMLAttributes<HTMLFormElement>,
  "children" | "onSubmit" | "onChange"
> {
  open: boolean;
  value: string;
  label: string;
  busy?: boolean;
  onValueChange(value: string): void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onCancel(): void;
  inputProps?: Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue" | "onChange">;
  cancelButtonProps?: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "type">;
  status?: string;
  statusProps?: HTMLAttributes<HTMLParagraphElement>;
}

export function InlineRename({
  open,
  value,
  label,
  busy = false,
  onValueChange,
  onSubmit,
  onCancel,
  inputProps,
  cancelButtonProps,
  status,
  statusProps,
  className = "wm-inline-rename",
  ...props
}: InlineRenameProps) {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) {
      input.current?.focus();
      input.current?.select();
    }
  }, [open]);
  return (
    <form {...props} className={className} hidden={!open} onSubmit={onSubmit}>
      <input
        type="text"
        className="wm-input"
        aria-label={label}
        {...inputProps}
        ref={input}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
      />
      <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
        Save
      </button>
      <button type="button" className="btn btn-sm" {...cancelButtonProps} onClick={onCancel}>
        Cancel
      </button>
      {status !== undefined && <StatusMessage {...statusProps}>{status}</StatusMessage>}
    </form>
  );
}
