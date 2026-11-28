import { cloneElement, useId } from "react";
import type { AriaAttributes, ComponentPropsWithRef, ReactElement, ReactNode } from "react";
import { FieldGroup } from "@wintermuted/ui-react";
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
  errorId?: string;
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
  errorId,
  error,
  children,
  className = "",
  ...props
}: FormFieldProps) {
  const generatedId = useId();
  const id = controlId ?? children.props.id ?? generatedId;
  const isRequired = required || children.props.required;
  const helpId = hintId ?? `${id}-hint`;
  return (
    <FieldGroup
      {...props}
      className={`wm-form-field${inline ? " wm-form-field--inline" : ""} ${className}`}
      htmlFor={id}
      label={
        <>
          {label}
          {isRequired && <span aria-hidden="true"> *</span>}
        </>
      }
      hintId={helpId}
      errorId={errorId ?? `${id}-error`}
      hint={hint && <p className="wm-form-field-hint">{hint}</p>}
      error={error && <StatusMessage tone="error">{error}</StatusMessage>}
    >
      {cloneElement(children, {
        required: isRequired,
      })}
    </FieldGroup>
  );
}
