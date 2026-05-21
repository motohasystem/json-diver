(() => {
  const N_INITIAL = 50;
  const N_INCREMENT = 50;

  const TYPE_ICONS = {
    object: "{}",
    array: "[]",
    string: "🔤",
    number: "🔢",
    boolean: "☑",
    null: "⭕",
    escaped: "🪆",
  };

  const STRING_TRUNC = 80;

  const $input = document.getElementById("input");
  const $tree = document.getElementById("tree");
  const $error = document.getElementById("error");
  const $dropzone = document.getElementById("dropzone");
  const $tooltip = document.getElementById("tooltip");
  const $modalStack = document.getElementById("modal-stack");
  const $btnClear = document.getElementById("btn-clear");
  const $btnSample = document.getElementById("btn-sample");
  const $minimap = document.getElementById("minimap");
  const $minimapCanvas = document.getElementById("minimap-canvas");
  const $minimapViewport = document.getElementById("minimap-viewport");

  // ---------- type helpers ----------

  function typeOf(v) {
    if (v === null) return "null";
    if (Array.isArray(v)) return "array";
    return typeof v;
  }

  // Returns parsed object/array if `s` is an explicitly-marked escaped JSON string
  // (starts with `{` or `[` after trim, and JSON.parse succeeds to object/array).
  // Otherwise null.
  function tryParseEscapedJson(s) {
    if (typeof s !== "string") return null;
    const t = s.trim();
    if (!(t.startsWith("{") || t.startsWith("["))) return null;
    try {
      const parsed = JSON.parse(t);
      if (parsed !== null && typeof parsed === "object") return parsed;
    } catch (_) { /* not valid JSON */ }
    return null;
  }

  function previewValue(v) {
    const t = typeOf(v);
    if (t === "string") return JSON.stringify(v);
    if (t === "null") return "null";
    if (t === "object") return `{${Object.keys(v).length}}`;
    if (t === "array") return `[${v.length}]`;
    return String(v);
  }

  // ---------- rendering ----------

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function renderTree(value, container) {
    container.innerHTML = "";
    const root = renderNode(null, value, true);
    root.classList.add("root");
    container.appendChild(root);
    scheduleMinimapRedraw();
  }

  // key: string | number | null (null for root)
  // value: any
  // isRoot: bool
  function renderNode(key, value, isRoot) {
    const node = el("div", "node");
    const row = el("div", "row");
    const t = typeOf(value);

    const isContainer = t === "object" || t === "array";
    const toggle = el("span", "toggle");
    if (!isContainer) toggle.classList.add("empty");
    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      hideTooltip();
      node.classList.toggle("collapsed");
    });
    row.appendChild(toggle);

    // For string values, check escaped-JSON
    const escapedParsed = t === "string" ? tryParseEscapedJson(value) : null;
    const effectiveType = escapedParsed ? "escaped" : t;

    const icon = el("span", `icon t-${effectiveType}`, TYPE_ICONS[effectiveType]);
    row.appendChild(icon);

    // key label
    if (key !== null) {
      const isIdx = typeof key === "number";
      const keyLabel = el(
        "span",
        isIdx ? "key array-idx" : "key",
        isIdx ? `[${key}]` : key
      );
      row.appendChild(keyLabel);
      row.appendChild(el("span", "sep", ":"));
    } else {
      row.appendChild(el("span", "key", "(root)"));
    }

    // value side
    if (t === "object") {
      row.appendChild(el("span", "count", `{${Object.keys(value).length}}`));
      row.appendChild(buildSiblingActions(node));
    } else if (t === "array") {
      row.appendChild(el("span", "count", `[${value.length}]`));
      row.appendChild(buildSiblingActions(node));
    } else if (escapedParsed) {
      const link = el("span", "val escaped-link", "(escaped JSON · click to zoom)");
      attachEscapedHandlers(link, value, escapedParsed, key);
      row.appendChild(link);
    } else {
      // primitive: render value inline
      const valSpan = el("span", `val val-${t}`);
      const { text, truncated } = formatInlineValue(value, t);
      valSpan.textContent = text;
      if (truncated) {
        valSpan.classList.add("truncated");
        attachPeekHandlers(valSpan, value);
      }
      row.appendChild(valSpan);
    }

    node.appendChild(row);

    if (isContainer) {
      const children = el("div", "children");
      node.appendChild(children);
      renderChildren(value, t, children);
      attachCollapsedPreview(row, node, value, t);
    }

    return node;
  }

  function attachCollapsedPreview(row, node, value, t) {
    let cached = null;
    const label = t === "array"
      ? `array [${value.length}] — collapsed`
      : `object {${Object.keys(value).length}} — collapsed`;
    row.addEventListener("mouseenter", (e) => {
      if (!node.classList.contains("collapsed")) return;
      if (cached === null) cached = buildPreviewHtml(value);
      showTooltip(
        `<div class="tooltip-label">${label}</div>${cached}`,
        e.clientX, e.clientY
      );
    });
    row.addEventListener("mousemove", (e) => {
      if (!node.classList.contains("collapsed")) return;
      if (!$tooltip.hidden) positionTooltip(e.clientX, e.clientY);
    });
    row.addEventListener("mouseleave", () => {
      if (node.classList.contains("collapsed")) hideTooltip();
    });
  }

  function siblingNodesOf(node) {
    const parent = node.parentElement;
    if (!parent) return [node];
    return Array.from(parent.children).filter(
      (n) => n.classList && n.classList.contains("node")
    );
  }

  function isContainerNode(n) {
    const toggle = n.querySelector(":scope > .row > .toggle");
    return toggle && !toggle.classList.contains("empty");
  }

  function findScroller(el) {
    let p = el.parentElement;
    while (p && p !== document.body) {
      const ov = getComputedStyle(p).overflowY;
      if ((ov === "auto" || ov === "scroll") && p.scrollHeight - p.clientHeight > 1) {
        return p;
      }
      p = p.parentElement;
    }
    return window;
  }

  let smoothScrollRaf = 0;
  function cancelSmoothScroll() {
    if (smoothScrollRaf) {
      cancelAnimationFrame(smoothScrollRaf);
      smoothScrollRaf = 0;
    }
  }
  function setScrollY(scroller, y) {
    if (scroller === window) window.scrollTo(window.scrollX, y);
    else scroller.scrollTop = y;
  }
  function getScrollY(scroller) {
    return scroller === window ? window.scrollY : scroller.scrollTop;
  }
  function scrollByDelta(scroller, dy, smooth = false) {
    if (!dy) return;
    cancelSmoothScroll();
    if (!smooth) {
      setScrollY(scroller, getScrollY(scroller) + dy);
      return;
    }
    const startY = getScrollY(scroller);
    const targetY = startY + dy;
    const startTime = performance.now();
    const duration = 280;
    const step = (now) => {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setScrollY(scroller, startY + (targetY - startY) * eased);
      if (t < 1) smoothScrollRaf = requestAnimationFrame(step);
      else smoothScrollRaf = 0;
    };
    smoothScrollRaf = requestAnimationFrame(step);
  }

  function buildSiblingActions(node) {
    const actions = el("span", "row-actions");
    const btn = el("button", "row-act", "▾▸");
    btn.type = "button";

    function siblingContainers() {
      return siblingNodesOf(node).filter(isContainerNode);
    }
    function refresh() {
      const sibs = siblingContainers();
      const anyOpen = sibs.some((n) => !n.classList.contains("collapsed"));
      btn.textContent = anyOpen ? "▸▸" : "▾▾";
      btn.title = anyOpen ? "兄弟を全閉じ" : "兄弟を全展開";
    }
    btn.addEventListener("mouseenter", refresh);
    btn.addEventListener("focus", refresh);
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      hideTooltip();
      const rowEl = node.querySelector(":scope > .row");
      const anchorY = e.clientY;
      const sibs = siblingContainers();
      const anyOpen = sibs.some((n) => !n.classList.contains("collapsed"));
      sibs.forEach((n) => n.classList.toggle("collapsed", anyOpen));
      // Re-anchor: smooth-scroll so the clicked row drifts back to the cursor Y.
      const newTop = rowEl.getBoundingClientRect().top;
      scrollByDelta(findScroller(rowEl), newTop - anchorY, true);
      // brief highlight to confirm click was registered
      rowEl.classList.remove("flash");
      void rowEl.offsetWidth; // restart animation
      rowEl.classList.add("flash");
      btn.focus({ preventScroll: true });
      refresh();
    });

    actions.appendChild(btn);
    return actions;
  }

  function formatInlineValue(value, t) {
    if (t === "string") {
      const json = JSON.stringify(value); // adds quotes and escapes
      if (json.length > STRING_TRUNC) {
        // truncate inner content, keep opening quote and add closing quote + ellipsis
        const innerCut = value.slice(0, STRING_TRUNC - 4);
        return { text: '"' + innerCut + '…"', truncated: true };
      }
      return { text: json, truncated: false };
    }
    if (t === "null") return { text: "null", truncated: false };
    return { text: String(value), truncated: false };
  }

  function renderChildren(value, t, container) {
    const entries = t === "array"
      ? value.map((v, i) => [i, v])
      : Object.entries(value);

    if (entries.length <= N_INITIAL) {
      for (const [k, v] of entries) container.appendChild(renderNode(k, v, false));
      return;
    }

    // lazy load
    let shown = 0;
    const renderBatch = (count) => {
      const end = Math.min(shown + count, entries.length);
      for (let i = shown; i < end; i++) {
        const [k, v] = entries[i];
        const node = renderNode(k, v, false);
        container.insertBefore(node, sentinel);
      }
      shown = end;
      updateSentinel();
    };

    const sentinel = el("div", "lazy-sentinel");
    const updateSentinel = () => {
      const remaining = entries.length - shown;
      if (remaining <= 0) {
        observer.disconnect();
        sentinel.remove();
      } else {
        sentinel.textContent = `… ${remaining} more (scroll or click to load)`;
      }
    };
    sentinel.addEventListener("click", () => renderBatch(N_INCREMENT));
    container.appendChild(sentinel);

    const observer = new IntersectionObserver((entriesObs) => {
      if (entriesObs.some((e) => e.isIntersecting)) {
        renderBatch(N_INCREMENT);
      }
    }, { rootMargin: "200px" });
    observer.observe(sentinel);

    renderBatch(N_INITIAL);
  }

  // ---------- tooltip (hover peek) ----------

  function showTooltip(html, x, y, klass) {
    $tooltip.className = "tooltip" + (klass ? " " + klass : "");
    $tooltip.innerHTML = html;
    $tooltip.hidden = false;
    positionTooltip(x, y);
  }

  function positionTooltip(x, y) {
    const pad = 12;
    const rect = $tooltip.getBoundingClientRect();
    let nx = x + 14;
    let ny = y + 14;
    if (nx + rect.width + pad > window.innerWidth) nx = x - rect.width - 14;
    if (ny + rect.height + pad > window.innerHeight) ny = y - rect.height - 14;
    if (nx < pad) nx = pad;
    if (ny < pad) ny = pad;
    $tooltip.style.left = nx + "px";
    $tooltip.style.top = ny + "px";
  }

  function hideTooltip() {
    $tooltip.hidden = true;
    $tooltip.innerHTML = "";
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function attachPeekHandlers(elNode, value) {
    elNode.addEventListener("mouseenter", (e) => {
      const t = typeOf(value);
      let cls = "tooltip-value";
      let body = "";
      if (t === "string") {
        cls += " str";
        body = escapeHtml(JSON.stringify(value));
      } else if (t === "number") {
        cls += " num"; body = escapeHtml(String(value));
      } else if (t === "boolean") {
        cls += " bool"; body = String(value);
      } else if (t === "null") {
        cls += " nul"; body = "null";
      } else {
        body = escapeHtml(String(value));
      }
      showTooltip(
        `<div class="tooltip-label">${t}</div><div class="${cls}">${body}</div>`,
        e.clientX, e.clientY
      );
    });
    elNode.addEventListener("mousemove", (e) => positionTooltip(e.clientX, e.clientY));
    elNode.addEventListener("mouseleave", hideTooltip);
  }

  function attachEscapedHandlers(elNode, rawString, parsedValue, key) {
    let hoverTreeHtml = null;
    elNode.addEventListener("mouseenter", (e) => {
      if (hoverTreeHtml === null) hoverTreeHtml = buildPreviewHtml(parsedValue);
      showTooltip(
        `<div class="tooltip-label">escaped JSON (click to zoom)</div>${hoverTreeHtml}`,
        e.clientX, e.clientY, "escaped"
      );
    });
    elNode.addEventListener("mousemove", (e) => positionTooltip(e.clientX, e.clientY));
    elNode.addEventListener("mouseleave", hideTooltip);
    elNode.addEventListener("click", (e) => {
      e.stopPropagation();
      hideTooltip();
      openModal(parsedValue, key);
    });
  }

  // Lightweight non-interactive preview for tooltip
  function buildPreviewHtml(value, depth = 0, maxDepth = 4, maxItems = 20) {
    const INDENT_PX = 14;
    const pad = depth * INDENT_PX;
    const padIn = pad + INDENT_PX;
    const t = typeOf(value);
    if (t === "object" || t === "array") {
      const entries = t === "array"
        ? value.map((v, i) => [i, v])
        : Object.entries(value);
      const open = t === "array" ? "[" : "{";
      const close = t === "array" ? "]" : "}";
      if (entries.length === 0) return `<div style="padding-left:${pad}px">${open}${close}</div>`;
      if (depth >= maxDepth) {
        return `<div style="padding-left:${pad}px">${open}…${close} <span style="color:var(--fg-dim)">(${entries.length})</span></div>`;
      }
      let out = `<div style="padding-left:${pad}px">${open}</div>`;
      const shown = entries.slice(0, maxItems);
      for (const [k, v] of shown) {
        const keyLabel = t === "array" ? `[${k}]` : escapeHtml(k);
        const childT = typeOf(v);
        if (childT === "object" || childT === "array") {
          out += `<div style="padding-left:${padIn}px"><span style="color:var(--accent)">${keyLabel}</span>:</div>`;
          out += buildPreviewHtml(v, depth + 1, maxDepth, maxItems);
        } else {
          const valStr = escapeHtml(previewValue(v));
          out += `<div style="padding-left:${padIn}px"><span style="color:var(--accent)">${keyLabel}</span>: <span style="color:var(--fg-dim)">${valStr}</span></div>`;
        }
      }
      if (entries.length > maxItems) {
        out += `<div style="padding-left:${padIn}px"><span style="color:var(--fg-dim)">… ${entries.length - maxItems} more</span></div>`;
      }
      out += `<div style="padding-left:${pad}px">${close}</div>`;
      return out;
    }
    return `<div style="padding-left:${pad}px">${escapeHtml(previewValue(value))}</div>`;
  }

  // ---------- modal (zoom) ----------

  const modalStack = [];

  function openModal(value, key) {
    const overlay = el("div", "modal");
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeTopModal();
    });

    const card = el("div", "modal-card");
    const head = el("div", "modal-head");
    const title = el("div", "modal-title");
    const keyLabel = key === null || key === undefined
      ? "(root)"
      : (typeof key === "number" ? `[${key}]` : key);
    const depthBadge = modalStack.length > 0 ? ` <span class="modal-depth">深さ ${modalStack.length + 1}</span>` : "";
    title.innerHTML = `Zoom: <b>${escapeHtml(String(keyLabel))}</b> &middot; escaped JSON${depthBadge}`;
    head.appendChild(title);
    const closeBtn = el("button", "modal-close", "Close (Esc)");
    closeBtn.addEventListener("click", closeTopModal);
    head.appendChild(closeBtn);
    card.appendChild(head);

    const main = el("div", "modal-main");

    const body = el("div", "modal-body");
    const innerTree = el("div", "tree modal-tree");
    const root = renderNode(null, value, true);
    root.classList.add("root");
    innerTree.appendChild(root);
    body.appendChild(innerTree);

    const sidebar = el("div", "modal-sidebar");
    sidebar.appendChild(el("div", "minimap-title", "ミニマップ"));
    const mm = el("div", "minimap");
    const mmCanvas = document.createElement("canvas");
    const mmVp = el("div", "minimap-viewport");
    mm.appendChild(mmCanvas);
    mm.appendChild(mmVp);
    sidebar.appendChild(mm);

    main.appendChild(body);
    main.appendChild(sidebar);
    card.appendChild(main);

    overlay.appendChild(card);
    $modalStack.appendChild(overlay);
    $modalStack.setAttribute("aria-hidden", "false");

    const minimap = createMinimap({
      treeEl: innerTree,
      mapEl: mm,
      canvasEl: mmCanvas,
      vpEl: mmVp,
      getViewport: () => ({
        topInTree: body.scrollTop - innerTree.offsetTop,
        visibleHeight: body.clientHeight,
      }),
      scrollTo: (yInTree) => {
        body.scrollTo({
          top: Math.max(0, innerTree.offsetTop + yInTree - body.clientHeight / 2),
          behavior: "instant",
        });
      },
    });
    body.addEventListener("scroll", minimap.updateViewport, { passive: true });

    modalStack.push({ overlay, minimap });
    requestAnimationFrame(() => minimap.redraw());
  }

  function closeTopModal() {
    const top = modalStack.pop();
    if (top) {
      top.minimap.destroy();
      top.overlay.remove();
    }
    if (modalStack.length === 0) $modalStack.setAttribute("aria-hidden", "true");
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modalStack.length > 0) {
      closeTopModal();
    }
  });

  // ---------- input handling ----------

  function setError(msg) {
    if (!msg) { $error.hidden = true; $error.textContent = ""; return; }
    $error.hidden = false;
    $error.textContent = msg;
  }

  const STORAGE_KEY = "json-outline:lastInput";
  function saveToStorage(text) {
    try {
      if (text && text.trim()) localStorage.setItem(STORAGE_KEY, text);
      else localStorage.removeItem(STORAGE_KEY);
    } catch (_) { /* storage unavailable */ }
  }

  function parseAndRender(text) {
    const trimmed = text.trim();
    if (!trimmed) { $tree.innerHTML = ""; setError(""); saveToStorage(""); return; }
    try {
      const value = JSON.parse(trimmed);
      setError("");
      renderTree(value, $tree);
      saveToStorage(text);
    } catch (err) {
      setError("JSON parse error: " + err.message);
    }
  }

  let inputTimer = null;
  $input.addEventListener("input", () => {
    clearTimeout(inputTimer);
    inputTimer = setTimeout(() => parseAndRender($input.value), 120);
  });

  // paste anywhere
  document.addEventListener("paste", (e) => {
    if (document.activeElement === $input) return; // let textarea handle natively
    const text = (e.clipboardData || window.clipboardData).getData("text");
    if (text) {
      $input.value = text;
      parseAndRender(text);
      e.preventDefault();
    }
  });

  // drag & drop
  ["dragenter", "dragover"].forEach((ev) => {
    $dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      $dropzone.classList.add("dragover");
    });
    document.addEventListener(ev, (e) => e.preventDefault());
  });
  ["dragleave", "drop"].forEach((ev) => {
    $dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      $dropzone.classList.remove("dragover");
    });
  });
  $dropzone.addEventListener("drop", async (e) => {
    e.preventDefault();
    const dt = e.dataTransfer;
    if (!dt) return;
    if (dt.files && dt.files.length > 0) {
      const file = dt.files[0];
      const text = await file.text();
      $input.value = text;
      parseAndRender(text);
      return;
    }
    const text = dt.getData("text");
    if (text) {
      $input.value = text;
      parseAndRender(text);
    }
  });

  $btnClear.addEventListener("click", () => {
    $input.value = "";
    $tree.innerHTML = "";
    setError("");
    saveToStorage("");
    scheduleMinimapRedraw();
  });

  // ---------- minimap (reusable factory) ----------

  const TYPE_COLORS = {
    object: "#7aa2ff",
    array: "#c792ea",
    string: "#b8e986",
    number: "#ffd866",
    boolean: "#82e0ff",
    null: "#ff8fa0",
    escaped: "#ffb86c",
  };

  function rowType(row) {
    const icon = row.querySelector(".icon");
    if (!icon) return "object";
    for (const cls of icon.classList) {
      if (cls.startsWith("t-")) return cls.slice(2);
    }
    return "object";
  }

  function getDepthIn(row, treeEl) {
    let d = 0;
    let p = row.parentElement;
    while (p && p !== treeEl) {
      if (p.classList && p.classList.contains("node")) d++;
      p = p.parentElement;
    }
    return d;
  }

  function createMinimap({ treeEl, mapEl, canvasEl, vpEl, getViewport, scrollTo }) {
    function drawBars() {
      const dpr = window.devicePixelRatio || 1;
      const cssW = mapEl.clientWidth;
      const cssH = mapEl.clientHeight;
      if (cssW === 0 || cssH === 0) return;
      canvasEl.width = Math.round(cssW * dpr);
      canvasEl.height = Math.round(cssH * dpr);
      const ctx = canvasEl.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);

      const treeH = treeEl.offsetHeight;
      const treeW = Math.max(treeEl.scrollWidth, treeEl.clientWidth);
      if (treeH === 0 || treeW === 0 || !treeEl.firstChild) return;

      const yScale = cssH / treeH;
      const xScale = (cssW - 2) / treeW;
      const treeRect = treeEl.getBoundingClientRect();
      const rows = treeEl.querySelectorAll(".row");

      rows.forEach((row) => {
        if (row.offsetParent === null) return;
        const rect = row.getBoundingClientRect();
        const xStart = Math.max(0, (rect.left - treeRect.left) * xScale);
        const xEnd = Math.min(cssW, (rect.right - treeRect.left) * xScale);
        const y = (rect.top - treeRect.top) * yScale;
        const h = Math.max(1, rect.height * yScale);
        const w = Math.max(1, xEnd - xStart);
        ctx.fillStyle = TYPE_COLORS[rowType(row)] || "#888";
        ctx.fillRect(xStart, y, w, h);
      });
    }

    function updateViewport() {
      const treeH = treeEl.offsetHeight;
      if (treeH === 0) { vpEl.style.display = "none"; return; }
      const { topInTree, visibleHeight } = getViewport();
      const visStart = Math.max(0, topInTree);
      const visEnd = Math.min(treeH, topInTree + visibleHeight);
      if (visEnd <= 0 || visStart >= treeH) { vpEl.style.display = "none"; return; }
      vpEl.style.display = "";
      const mapH = mapEl.clientHeight;
      const top = (visStart / treeH) * mapH;
      const height = Math.max(12, ((visEnd - visStart) / treeH) * mapH);
      vpEl.style.top = top + "px";
      vpEl.style.height = height + "px";
    }

    let rafFull = 0;
    function redraw() {
      if (rafFull) return;
      rafFull = requestAnimationFrame(() => {
        rafFull = 0;
        drawBars();
        updateViewport();
      });
    }

    function scrollFromClient(clientY) {
      const treeH = treeEl.offsetHeight;
      if (treeH === 0) return;
      const mapRect = mapEl.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientY - mapRect.top) / mapRect.height));
      scrollTo(ratio * treeH);
    }

    let dragging = false;
    const onDown = (e) => { dragging = true; scrollFromClient(e.clientY); };
    const onMove = (e) => { if (dragging) scrollFromClient(e.clientY); };
    const onUp = () => { dragging = false; };
    mapEl.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);

    const mo = new MutationObserver(redraw);
    mo.observe(treeEl, {
      childList: true, subtree: true,
      attributes: true, attributeFilter: ["class"],
    });

    return {
      redraw,
      updateViewport,
      destroy() {
        mapEl.removeEventListener("mousedown", onDown);
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        mo.disconnect();
      },
    };
  }

  // Main-page minimap (window scroller)
  const mainMinimap = createMinimap({
    treeEl: $tree,
    mapEl: $minimap,
    canvasEl: $minimapCanvas,
    vpEl: $minimapViewport,
    getViewport: () => ({
      topInTree: -$tree.getBoundingClientRect().top,
      visibleHeight: window.innerHeight,
    }),
    scrollTo: (yInTree) => {
      const treeAbsTop = $tree.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: Math.max(0, treeAbsTop + yInTree - window.innerHeight / 2),
        behavior: "instant",
      });
    },
  });

  function scheduleMinimapRedraw() { mainMinimap.redraw(); }

  window.addEventListener("scroll", mainMinimap.updateViewport, { passive: true });
  window.addEventListener("resize", mainMinimap.redraw);

  $btnSample.addEventListener("click", () => {
    const sample = {
      app: "json-outline",
      version: 1,
      enabled: true,
      tags: ["alpha", "beta", "gamma"],
      user: {
        name: "Alice",
        age: 30,
        roles: ["admin", "editor"],
        profile: null,
      },
      payload: JSON.stringify({
        eventId: "evt_123",
        items: [
          { sku: "A-1", qty: 2 },
          { sku: "A-2", qty: 1 },
        ],
        meta: JSON.stringify({ source: "web", trace: "abc-xyz" }),
      }),
      largeList: Array.from({ length: 137 }, (_, i) => ({ i, v: `item-${i}` })),
    };
    const text = JSON.stringify(sample, null, 2);
    $input.value = text;
    parseAndRender(text);
  });

  // Restore from previous session
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      $input.value = saved;
      parseAndRender(saved);
    }
  } catch (_) { /* storage unavailable */ }
})();
