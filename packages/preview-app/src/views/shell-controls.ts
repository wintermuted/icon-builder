import { projectRouteHref } from "../project/model.js";
import { slugify } from "../app-shell.js";

export function wireStickyHeaderOffset() {
  const topbar = document.querySelector(".docs-topbar");
  const detailHeaders = document.querySelectorAll(
    "#project-detail > .project-detail-header, #asset-detail > .project-detail-header",
  );
  const assetHeader = document.querySelector("#asset-detail > .project-detail-header");
  if (!topbar || !detailHeaders.length) return;

  const updateStickyState = () => {
    const topbarHeight = topbar.getBoundingClientRect().height;
    document.documentElement.style.setProperty("--preview-topbar-height", `${topbarHeight}px`);
    if (assetHeader) {
      document.documentElement.style.setProperty(
        "--asset-detail-header-height",
        `${assetHeader.getBoundingClientRect().height}px`,
      );
    }
    for (const header of detailHeaders) {
      const isVisible = header.getClientRects().length > 0;
      const isStuck =
        isVisible && window.scrollY > 0 && header.getBoundingClientRect().top <= topbarHeight + 1;
      header.classList.toggle("is-stuck", isStuck);
    }
  };
  updateStickyState();
  new ResizeObserver(updateStickyState).observe(topbar);
  if (assetHeader) new ResizeObserver(updateStickyState).observe(assetHeader);
  window.addEventListener("scroll", updateStickyState, { passive: true });
  window.addEventListener("hashchange", () => window.requestAnimationFrame(updateStickyState));
}

export function wireNewProjectModal() {
  const btn = document.getElementById("new-project-btn");
  const modal = document.getElementById("new-project-modal");
  const formView = document.getElementById("np-form-view");
  const successView = document.getElementById("np-success-view");
  const form = document.getElementById("np-form");
  const nameInput = document.getElementById("np-name");
  const slugInput = document.getElementById("np-slug");
  const errorEl = document.getElementById("np-error");
  if (!btn || !modal || !form) return;

  const openModal = () => {
    formView.hidden = false;
    successView.hidden = true;
    form.reset();
    errorEl.hidden = true;
    modal.hidden = false;
    nameInput.focus();
    if (typeof lucide !== "undefined") lucide.createIcons();
  };

  const closeModal = () => {
    modal.hidden = true;
  };

  btn.addEventListener("click", openModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });
  modal
    .querySelectorAll(".np-close, .np-cancel")
    .forEach((el) => el.addEventListener("click", closeModal));
  modal.querySelector(".np-done")?.addEventListener("click", (event) => {
    const project = event.currentTarget.dataset.project;
    closeModal();
    if (project) window.location.hash = projectRouteHref(project).slice(1);
    window.location.reload();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) closeModal();
  });

  // Auto-derive slug from name
  nameInput.addEventListener("input", () => {
    slugInput.value = slugify(nameInput.value);
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.hidden = true;
    const name = nameInput.value.trim();
    const slug = slugify(slugInput.value || name);
    if (!name || !slug) {
      errorEl.textContent = "Project name and slug are required.";
      errorEl.hidden = false;
      return;
    }

    const submitBtn = form.querySelector("[type=submit]");
    submitBtn.disabled = true;
    submitBtn.textContent = "Creating…";

    try {
      const response = await fetch("/~scaffold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug }),
      });
      const result = await response.json();
      if (!response.ok || result.error) throw new Error(result.error || "Scaffold failed");

      // Show success view
      formView.hidden = true;
      successView.hidden = false;
      document.getElementById("np-success-name").textContent = name;
      modal.querySelector(".np-done").dataset.project = name;

      const createdItems = document.getElementById("np-created-items");
      createdItems.innerHTML = [
        result.alreadyExists
          ? `<li><i data-lucide="info" aria-hidden="true"></i> Project entry already existed in manifest (skipped)</li>`
          : `<li><i data-lucide="check" aria-hidden="true"></i> Added <code>${name}</code> to <code>manifests/assets.json</code></li>`,
        `<li><i data-lucide="check" aria-hidden="true"></i> Created <code>${result.svgDir}</code></li>`,
        `<li><i data-lucide="check" aria-hidden="true"></i> Created <code>${result.groundingDir}</code></li>`,
        `<li><i data-lucide="check" aria-hidden="true"></i> Created <code>${result.documentation}</code></li>`,
      ].join("");

      document.getElementById("np-prompt-snippet").textContent =
        `/create-svg-asset\n\nProject: ${name}\nDirectory: ${result.svgDir}`;

      const resourceList = document.getElementById("np-resource-list");
      resourceList.innerHTML = [
        `<li><a href="http://localhost:4178/manifests/assets.json" target="_blank" rel="noopener">manifests/assets.json</a></li>`,
        `<li><a href="http://localhost:4178/.github/prompts/create-svg-asset.prompt.md" target="_blank" rel="noopener">.github/prompts/create-svg-asset.prompt.md</a></li>`,
        `<li><a href="http://localhost:4178/.github/skills/wm-asset-manifest-spec/SKILL.md" target="_blank" rel="noopener">.github/skills/wm-asset-manifest-spec/SKILL.md</a></li>`,
        `<li><a href="http://localhost:4178/.github/skills/wm-asset-authoring-workflow/SKILL.md" target="_blank" rel="noopener">.github/skills/wm-asset-authoring-workflow/SKILL.md</a></li>`,
      ].join("");

      if (typeof lucide !== "undefined") lucide.createIcons();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.hidden = false;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Create Project";
    }
  });
}

export function wireAssetDetailSidebars() {
  const sidebars = [
    {
      sidebar: document.getElementById("asset-detail-left-sidebar"),
      toggle: document.getElementById("asset-detail-left-sidebar-toggle"),
      content: document.getElementById("asset-detail-left-sidebar-content"),
      storageKey: "wm-assets-left-sidebar-collapsed",
      collapsedIcon: "panel-left-open",
      expandedIcon: "panel-left-close",
      label: "asset analysis",
    },
    {
      sidebar: document.getElementById("asset-detail-right-sidebar"),
      toggle: document.getElementById("asset-detail-right-sidebar-toggle"),
      content: document.getElementById("asset-detail-right-sidebar-content"),
      storageKey: "wm-assets-right-sidebar-collapsed",
      collapsedIcon: "panel-right-open",
      expandedIcon: "panel-right-close",
      label: "element editor",
    },
  ];

  for (const {
    sidebar,
    toggle,
    content,
    storageKey,
    collapsedIcon,
    expandedIcon,
    label,
  } of sidebars) {
    if (!sidebar || !toggle || !content) continue;
    const setCollapsed = (collapsed) => {
      sidebar.classList.toggle("is-collapsed", collapsed);
      content.inert = collapsed;
      toggle.setAttribute("aria-expanded", String(!collapsed));
      toggle.title = `${collapsed ? "Expand" : "Collapse"} ${label}`;
      toggle.setAttribute("aria-label", `${collapsed ? "Expand" : "Collapse"} ${label}`);
      const nextIcon = document.createElement("i");
      nextIcon.dataset.lucide = collapsed ? collapsedIcon : expandedIcon;
      nextIcon.setAttribute("aria-hidden", "true");
      toggle.querySelector("[data-lucide], svg")?.replaceWith(nextIcon);
      if (typeof lucide !== "undefined") lucide.createIcons();
    };
    setCollapsed(localStorage.getItem(storageKey) === "true");
    toggle.addEventListener("click", () => {
      const collapsed = !sidebar.classList.contains("is-collapsed");
      localStorage.setItem(storageKey, String(collapsed));
      setCollapsed(collapsed);
    });
  }
}
