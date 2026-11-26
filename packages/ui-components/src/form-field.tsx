import { cloneElement, useId } from "react";
import type { AriaAttributes, ComponentPropsWithRef, ReactElement, ReactNode } from "react";
import { StatusMessage } from "./status-message.js";

type ControlProps = Pick<AriaAttributes, "aria-describedby" | "aria-invalid"> & {
  id?: string;
  required?: boolean;
};

export interface FormFieldProps extends Omit<ComponentPropsWithRef<"div">, "children"> {
  controlId?: string;
  label: ReactNode;
  required?: boolean;
  inline?: boolean;
  hint?: ReactNode;
  hintId?: string;
  error?: string;
  children: ReactElement<ControlProps>;
}

export function FormField({
  controlId,
  label,
  required = false,
  inline = false,
  hint,
  hintId,
  error,
  children,
  className = "",
  ...props
}: FormFieldProps) {
  const generatedId = useId();
  const id = controlId ?? children.props.id ?? generatedId;
  const isRequired = required || children.props.required;
  const helpId = hintId ?? `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy =
    [children.props["aria-describedby"], hint ? helpId : "", error ? errorId : ""]
      .filter(Boolean)
      .join(" ") || undefined;
  return (
    <div
      {...props}
      className={`wm-form-field${inline ? " wm-form-field--inline" : ""} ${className}`}
    >
      <label htmlFor={id}>
        {label}
        {isRequired && <span aria-hidden="true"> *</span>}
      </label>
      {cloneElement(children, {
        id,
        required: isRequired,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : children.props["aria-invalid"],
      })}
      {hint && (
        <p id={helpId} className="wm-form-field-hint">
          {hint}
        </p>
      )}
      {error && (
        <StatusMessage id={errorId} tone="error">
          {error}
        </StatusMessage>
      )}
    </div>
  );
}
