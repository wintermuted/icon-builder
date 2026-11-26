import { useState } from "react";
import type { Ref } from "react";
import { Icon } from "./icon.js";
import { IconActionButton } from "./icon-action-button.js";
import { CodeBlock } from "./code-block.js";

export interface PromptCarouselProps {
  prompts: readonly string[];
  idPrefix?: string;
  copyButtonRef?: Ref<HTMLButtonElement>;
}

export function PromptCarousel({ prompts, idPrefix, copyButtonRef }: PromptCarouselProps) {
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState("");
  const activeIndex = Math.min(index, Math.max(0, prompts.length - 1));
  const id = (suffix: string) => (idPrefix ? `${idPrefix}-${suffix}` : undefined);
  const move = (offset: number) => {
    setIndex((activeIndex + offset + prompts.length) % prompts.length);
    setStatus("");
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompts[activeIndex]);
      setStatus("Prompt copied.");
    } catch {
      setStatus("Copy failed. Select the prompt and copy it manually.");
    }
  };
  return (
    <div id={id("sample-prompts")} className="project-sample-prompts">
      <CodeBlock id={id("sample-prompt")} className="project-prompt-sample">
        {prompts[activeIndex] ?? "No prompts available."}
      </CodeBlock>
      <div className="project-prompt-controls">
        <div className="project-prompt-navigation">
          <IconActionButton
            id={id("prompt-previous")}
            className="btn btn-sm"
            icon="ArrowLeft"
            label="Previous sample prompt"
            disabled={prompts.length < 2}
            onClick={() => move(-1)}
          />
          <span id={id("prompt-count")} className="project-prompt-count" aria-live="polite">
            {prompts.length ? activeIndex + 1 : 0} of {prompts.length}
          </span>
          <IconActionButton
            id={id("prompt-next")}
            className="btn btn-sm"
            icon="ArrowRight"
            label="Next sample prompt"
            disabled={prompts.length < 2}
            onClick={() => move(1)}
          />
        </div>
        <button
          ref={copyButtonRef}
          id={id("prompt-copy")}
          type="button"
          className="btn btn-sm"
          disabled={!prompts.length}
          onClick={copy}
        >
          <Icon name="Copy" />
          Copy Prompt
        </button>
      </div>
      <p id={id("prompt-copy-status")} className="project-prompt-copy-status" aria-live="polite">
        {status}
      </p>
    </div>
  );
}
