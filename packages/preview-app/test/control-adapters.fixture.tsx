import { useCallback, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "@wintermuted/ui-theme/index.css";
import "@wm-asset-workflows/ui-components/styles.css";
import {
  Dialog,
  FormField,
  IconActionButton,
  StatusMessage,
  Toast,
  ToggleButton,
} from "@wm-asset-workflows/ui-components";

function Controls() {
  const [pressed, setPressed] = useState(false);
  const [cancel, setCancel] = useState(false);
  const [submissions, setSubmissions] = useState(0);
  const [notice, setNotice] = useState({ message: "", revision: 0 });
  const [dismissals, setDismissals] = useState(0);
  const [open, setOpen] = useState(false);
  const [defaultFocus, setDefaultFocus] = useState(false);
  const [name, setName] = useState("");
  const first = useRef<HTMLInputElement>(null);
  const action = useRef<HTMLButtonElement>(null);
  const dismiss = useCallback(() => {
    setDismissals((count) => count + 1);
    setNotice((notice) => ({ ...notice, message: "" }));
  }, []);
  return (
    <main>
      <label>
        <input
          type="checkbox"
          checked={cancel}
          onChange={(event) => setCancel(event.target.checked)}
        />
        Cancel toggle
      </label>
      <ToggleButton
        pressed={pressed}
        onPressedChange={setPressed}
        onClick={(event) => {
          if (cancel) event.preventDefault();
        }}
        icon="Grid2x2"
        data-controller="grid"
      >
        Show grid
      </ToggleButton>
      <ToggleButton pressed disabled icon="Grid2x2">
        Disabled grid
      </ToggleButton>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setSubmissions((count) => count + 1);
        }}
      >
        <IconActionButton
          ref={action}
          icon="Save"
          label="Save source"
          type="submit"
          name="action"
          value="save"
        />
        <button type="button" onClick={() => action.current?.focus()}>
          Focus save
        </button>
      </form>
      <output aria-label="Submissions">{submissions}</output>
      <button
        type="button"
        onClick={() =>
          setNotice((notice) => ({
            message: "Asset link copied.",
            revision: notice.revision + 1,
          }))
        }
      >
        Show notification
      </button>
      <Toast
        id="test-toast"
        message={notice.message}
        resetKey={notice.revision}
        onDismiss={dismiss}
      />
      <output aria-label="Dismissals">{dismissals}</output>
      <button type="button" onClick={() => setOpen(true)}>
        New project
      </button>
      <label>
        <input
          type="checkbox"
          checked={defaultFocus}
          onChange={(event) => setDefaultFocus(event.target.checked)}
        />
        Use default dialog focus
      </label>
      {open && (
        <Dialog
          title="New project"
          titleId="project-heading"
          initialFocus={defaultFocus ? undefined : first}
          onClose={() => setOpen(false)}
        >
          <FormField
            label="Project name"
            controlId="project-name"
            required
            hint="Choose a recognizable name."
            hintId="project-hint"
            errorId="project-error"
            error={name.length < 3 ? "Use at least three characters." : undefined}
          >
            <input
              ref={first}
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-describedby="external-help"
            />
          </FormField>
          <p id="external-help">Keep the mark editable.</p>
          <button type="button" onClick={() => setOpen(false)}>
            Done
          </button>
        </Dialog>
      )}
      <FormField label="Grid spacing" inline controlId="spacing">
        <input type="number" defaultValue="8" />
      </FormField>
      <FormField label="Inherited control" hint="Existing control ID and required state.">
        <input
          id="inherited-control"
          required
          aria-describedby="external-control-help"
          aria-invalid="true"
        />
      </FormField>
      <p id="external-control-help">External control description.</p>
      <FormField label="Generated control" hint="Generated description.">
        <input />
      </FormField>
      <StatusMessage>Saving source.</StatusMessage>
      <StatusMessage tone="error">Source could not be saved.</StatusMessage>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<Controls />);
