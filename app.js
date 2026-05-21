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
  const $btnDownload = document.getElementById("btn-download");
  const $btnEdit = document.getElementById("btn-edit");
  const $btnUndo = document.getElementById("btn-undo");
  const $btnRedo = document.getElementById("btn-redo");
  const $depthBar = document.getElementById("depth-bar");
  const $violationBadge = document.getElementById("violation-badge");
  const $schemaInput = document.getElementById("schema-input");
  const $schemaStatus = document.getElementById("schema-status");
  const $schemaError = document.getElementById("schema-error");
  const $minimap = document.getElementById("minimap");
  const $minimapCanvas = document.getElementById("minimap-canvas");
  const $minimapViewport = document.getElementById("minimap-viewport");
  const $toast = document.getElementById("toast");

  function showToast(msg, ms = 4000) {
    $toast.hidden = false;
    $toast.textContent = msg;
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => { $toast.hidden = true; }, ms);
  }

  // ---------- centralized state ----------

  const state = {
    data: null,       // current parsed JSON (single source of truth)
    schema: null,     // current parsed schema (added in MVP-3)
    editMode: false,  // edit toggle (added in MVP-1)
    violations: [],   // current schema violations (added in MVP-3)
  };

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

  // ---------- Schema module (minimal JSON Schema validator) ----------

  const Schema = {
    _root: null,

    set(schemaObj) { Schema._root = schemaObj; },
    get() { return Schema._root; },

    // Returns array of violations: [{ path: [], message: "..." }]
    validate(data, schema = Schema._root) {
      if (!schema) return [];
      const out = [];
      Schema._walk(data, schema, [], out, schema, 0);
      return out;
    },

    _walk(value, schema, path, out, root, refDepth) {
      if (!schema || typeof schema !== "object") return;

      if (schema.$ref) {
        if (refDepth > 16) return;
        const resolved = Schema._resolveRef(schema.$ref, root);
        if (resolved) Schema._walk(value, resolved, path, out, root, refDepth + 1);
        return;
      }

      // type
      if (schema.type !== undefined) {
        const types = Array.isArray(schema.type) ? schema.type : [schema.type];
        const actual = Schema._typeOf(value);
        if (!types.some((t) => Schema._typeMatch(actual, t))) {
          out.push({ path, message: `type expected ${types.join("|")}, got ${actual}` });
        }
      }

      // const / enum
      if ("const" in schema && !Schema._deepEqual(value, schema.const)) {
        out.push({ path, message: `const mismatch: expected ${JSON.stringify(schema.const)}` });
      }
      if (Array.isArray(schema.enum)) {
        if (!schema.enum.some((v) => Schema._deepEqual(value, v))) {
          out.push({ path, message: `enum: not one of ${JSON.stringify(schema.enum)}` });
        }
      }

      const actualT = Schema._typeOf(value);

      // Object
      if (actualT === "object") {
        const props = schema.properties || {};
        const patternProps = schema.patternProperties || {};
        const required = schema.required || [];
        for (const req of required) {
          if (!(req in value)) {
            out.push({ path, message: `required property "${req}" missing` });
          }
        }
        for (const key of Object.keys(value)) {
          if (key in props) {
            Schema._walk(value[key], props[key], [...path, key], out, root, refDepth);
            continue;
          }
          let matched = false;
          for (const [pat, sub] of Object.entries(patternProps)) {
            try {
              if (new RegExp(pat).test(key)) {
                Schema._walk(value[key], sub, [...path, key], out, root, refDepth);
                matched = true;
              }
            } catch (_) { /* invalid regex */ }
          }
          if (!matched) {
            const ap = schema.additionalProperties;
            if (ap === false) {
              out.push({ path: [...path, key], message: `additional property "${key}" not allowed` });
            } else if (ap && typeof ap === "object") {
              Schema._walk(value[key], ap, [...path, key], out, root, refDepth);
            }
          }
        }
      }

      // Array
      if (actualT === "array") {
        if (Array.isArray(schema.prefixItems)) {
          for (let i = 0; i < value.length; i++) {
            if (i < schema.prefixItems.length) {
              Schema._walk(value[i], schema.prefixItems[i], [...path, i], out, root, refDepth);
            } else if (schema.items && typeof schema.items === "object") {
              Schema._walk(value[i], schema.items, [...path, i], out, root, refDepth);
            }
          }
        } else if (Array.isArray(schema.items)) {
          for (let i = 0; i < value.length; i++) {
            if (i < schema.items.length) {
              Schema._walk(value[i], schema.items[i], [...path, i], out, root, refDepth);
            }
          }
        } else if (schema.items && typeof schema.items === "object") {
          for (let i = 0; i < value.length; i++) {
            Schema._walk(value[i], schema.items, [...path, i], out, root, refDepth);
          }
        }
        if (typeof schema.minItems === "number" && value.length < schema.minItems) {
          out.push({ path, message: `minItems: ${value.length} < ${schema.minItems}` });
        }
        if (typeof schema.maxItems === "number" && value.length > schema.maxItems) {
          out.push({ path, message: `maxItems: ${value.length} > ${schema.maxItems}` });
        }
      }

      // oneOf / anyOf — best effort
      if (Array.isArray(schema.oneOf)) {
        const passes = schema.oneOf.filter((s) => Schema._passes(value, s, root, refDepth));
        if (passes.length === 0) {
          out.push({ path, message: `oneOf: no subschema matches` });
        }
      }
      if (Array.isArray(schema.anyOf)) {
        if (!schema.anyOf.some((s) => Schema._passes(value, s, root, refDepth))) {
          out.push({ path, message: `anyOf: no subschema matches` });
        }
      }
    },

    _passes(value, schema, root, refDepth) {
      const tmp = [];
      Schema._walk(value, schema, [], tmp, root, refDepth);
      return tmp.length === 0;
    },

    _typeOf(v) {
      if (v === null) return "null";
      if (Array.isArray(v)) return "array";
      if (typeof v === "number" && Number.isInteger(v)) return "integer";
      return typeof v;
    },

    _typeMatch(actual, expected) {
      if (actual === expected) return true;
      if (expected === "number" && actual === "integer") return true;
      return false;
    },

    _deepEqual(a, b) {
      return JSON.stringify(a) === JSON.stringify(b);
    },

    // Would moving sourcePath → (targetPath, position) keep the violation count from rising?
    // Uses the current Schema._root.
    canPlace(data, sourcePath, targetPath, position, currentViolationCount) {
      if (!Schema._root) return true;
      let draft;
      try { draft = structuredClone(data); }
      catch (_) { draft = JSON.parse(JSON.stringify(data)); }
      try { applyMove(draft, sourcePath, targetPath, position); }
      catch (_) { return false; }
      const after = Schema.validate(draft).length;
      return after <= currentViolationCount;
    },

    _resolveRef(ref, root) {
      if (!ref.startsWith("#")) return null;
      if (ref === "#") return root;
      const parts = ref.slice(2).split("/");
      let cur = root;
      for (const p of parts) {
        if (cur == null) return null;
        const key = p.replaceAll("~1", "/").replaceAll("~0", "~");
        cur = cur[key];
      }
      return cur;
    },
  };

  // Apply a D&D move to a data object in-place.
  // `position` is "before" | "into" | "after" relative to targetPath.
  function applyMove(data, sourcePath, targetPath, position) {
    const sourceParent = Path.parent(data, sourcePath);
    const sourceKey = Path.last(sourcePath);
    const sourceValue = sourceParent[sourceKey];

    const targetParentPath =
      position === "into" ? targetPath : targetPath.slice(0, -1);
    const targetParentRef = Path.get(data, targetParentPath);
    const targetRefKey = position === "into" ? null : Path.last(targetPath);

    const isSameObjectParent =
      sourceParent === targetParentRef && !Array.isArray(sourceParent);

    if (isSameObjectParent) {
      Path.reorderObject(sourceParent, sourceKey, targetRefKey, position);
      return;
    }

    if (Array.isArray(sourceParent)) sourceParent.splice(sourceKey, 1);
    else delete sourceParent[sourceKey];

    if (Array.isArray(targetParentRef)) {
      let toIdx;
      if (position === "into") {
        toIdx = targetParentRef.length;
      } else {
        toIdx = position === "before" ? targetRefKey : targetRefKey + 1;
        if (sourceParent === targetParentRef && sourceKey < toIdx) toIdx--;
      }
      targetParentRef.splice(toIdx, 0, sourceValue);
    } else {
      targetParentRef[sourceKey] = sourceValue;
      if (position !== "into") {
        Path.reorderObject(targetParentRef, sourceKey, targetRefKey, position);
      }
    }
  }

  // ---------- Path module (pure helpers over state.data) ----------

  const Path = {
    get(obj, path) {
      let cur = obj;
      for (const k of path) {
        if (cur == null) return undefined;
        cur = cur[k];
      }
      return cur;
    },
    parent(obj, path) {
      return Path.get(obj, path.slice(0, -1));
    },
    last(path) { return path[path.length - 1]; },
    equal(a, b) {
      return a.length === b.length && a.every((v, i) => v === b[i]);
    },
    isPrefix(prefix, path) {
      if (prefix.length >= path.length) return false;
      return prefix.every((v, i) => v === path[i]);
    },
    removeAt(obj, path) {
      if (path.length === 0) return;
      const parent = Path.parent(obj, path);
      const last = Path.last(path);
      if (Array.isArray(parent)) parent.splice(last, 1);
      else delete parent[last];
    },
    // For arrays: in-place splice insert at idx
    // For objects: rebuild keys with `key` inserted before/after `refKey`, or appended on "into"
    reorderObject(obj, sourceKey, refKey, position) {
      const sourceVal = obj[sourceKey];
      const entries = Object.entries(obj).filter(([k]) => k !== sourceKey);
      const newOrder = [];
      if (position === "into" || refKey == null) {
        // append at end
        for (const e of entries) newOrder.push(e);
        newOrder.push([sourceKey, sourceVal]);
      } else {
        for (const [k, v] of entries) {
          if (k === refKey && position === "before") newOrder.push([sourceKey, sourceVal]);
          newOrder.push([k, v]);
          if (k === refKey && position === "after") newOrder.push([sourceKey, sourceVal]);
        }
      }
      for (const k of Object.keys(obj)) delete obj[k];
      for (const [k, v] of newOrder) obj[k] = v;
    },
  };

  function renderTree(value, container, basePath = []) {
    container.innerHTML = "";
    const root = renderNode(null, value, true, basePath);
    root.classList.add("root");
    container.appendChild(root);
    scheduleMinimapRedraw();
    if (container === $tree) renderDepthBar();
  }

  // ---------- depth toolbar ----------

  // depths where at least one container (object/array) lives
  function depthsWithContainers(data, cap = 20) {
    const set = new Set();
    function walk(v, d) {
      if (d > cap) return;
      if (v && typeof v === "object") {
        set.add(d);
        if (Array.isArray(v)) for (const item of v) walk(item, d + 1);
        else for (const val of Object.values(v)) walk(val, d + 1);
      }
    }
    walk(data, 0);
    return Array.from(set).sort((a, b) => a - b);
  }

  function renderDepthBar() {
    if (!$depthBar) return;
    $depthBar.innerHTML = "";
    if (state.data === null || state.data === undefined) return;
    if (typeof state.data !== "object") return;
    const depths = depthsWithContainers(state.data);
    // Must match CSS --depth-step (= .node padding-left, currently 40px)
    const INDENT_PX = 40;
    for (const d of depths) {
      const btn = el("button", "depth-btn", String(d));
      btn.type = "button";
      btn.style.left = d * INDENT_PX + "px";
      btn.title = `深さ ${d} のコンテナをまとめて開閉`;
      btn.addEventListener("click", () => toggleDepth(d));
      btn.addEventListener("mouseenter", () => {
        document.documentElement.style.setProperty("--highlight-x", d * INDENT_PX + "px");
        document.documentElement.style.setProperty("--highlight-opacity", "0.55");
      });
      btn.addEventListener("mouseleave", () => {
        document.documentElement.style.setProperty("--highlight-opacity", "0");
      });
      $depthBar.appendChild(btn);
    }
  }

  function toggleDepth(depth) {
    hideTooltip();
    const containerNodes = [];
    for (const n of $tree.querySelectorAll(".node")) {
      let nodeDepth;
      try { nodeDepth = JSON.parse(n.dataset.path).length; }
      catch (_) { continue; }
      if (nodeDepth !== depth) continue;
      const toggle = n.querySelector(":scope > .row > .toggle");
      if (toggle && !toggle.classList.contains("empty")) {
        containerNodes.push(n);
      }
    }
    if (containerNodes.length === 0) return;
    const anyOpen = containerNodes.some((n) => !n.classList.contains("collapsed"));
    containerNodes.forEach((n) => n.classList.toggle("collapsed", anyOpen));
  }

  // key:    string | number | null (null for root)
  // value:  any
  // isRoot: bool
  // path:   (string|number)[] — JSON path from the tree's root to this node
  function renderNode(key, value, isRoot, path = []) {
    const node = el("div", "node");
    node.dataset.path = JSON.stringify(path);
    const row = el("div", "row");
    const t = typeOf(value);

    // drag handle (rendered always; CSS shows only in edit mode; root has no handle)
    if (!isRoot) {
      const handle = el("span", "handle", "⋮⋮");
      handle.draggable = true;
      handle.title = "ドラッグして移動";
      row.appendChild(handle);
    }

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
      renderChildren(value, t, children, path);
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

  function renderChildren(value, t, container, parentPath = []) {
    const entries = t === "array"
      ? value.map((v, i) => [i, v])
      : Object.entries(value);

    if (entries.length <= N_INITIAL) {
      for (const [k, v] of entries) {
        container.appendChild(renderNode(k, v, false, [...parentPath, k]));
      }
      return;
    }

    // lazy load
    let shown = 0;
    const renderBatch = (count) => {
      const end = Math.min(shown + count, entries.length);
      for (let i = shown; i < end; i++) {
        const [k, v] = entries[i];
        const node = renderNode(k, v, false, [...parentPath, k]);
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
    const INDENT_PX = 28;
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

  const STORAGE_KEY = "json-diver:lastInput";
  function saveToStorage(text) {
    try {
      if (text && text.trim()) localStorage.setItem(STORAGE_KEY, text);
      else localStorage.removeItem(STORAGE_KEY);
    } catch (_) { /* storage unavailable */ }
  }

  function parseAndRender(text) {
    const trimmed = text.trim();
    if (!trimmed) {
      state.data = null;
      $tree.innerHTML = ""; setError(""); saveToStorage("");
      $btnDownload.disabled = true;
      revalidate();
      renderDepthBar();
      return;
    }
    try {
      const value = JSON.parse(trimmed);
      state.data = value;
      setError("");
      renderTree(value, $tree);
      saveToStorage(text);
      $btnDownload.disabled = false;
      revalidate();
      History.reset();
    } catch (err) {
      setError("JSON parse error: " + err.message);
      $btnDownload.disabled = true;
    }
  }

  function pad2(n) { return String(n).padStart(2, "0"); }
  function downloadFilename() {
    const d = new Date();
    const date = `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`;
    const time = `${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`;
    return `json-diver-${date}-${time}.json`;
  }

  $btnDownload.addEventListener("click", () => {
    const text = $input.value;
    try { JSON.parse(text); } catch (_) { return; }
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = downloadFilename();
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

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

  // drag & drop (file / text into the dropzone — ignore in-app row D&D)
  const isRowDnd = (e) =>
    (e.dataTransfer && e.dataTransfer.types &&
      Array.from(e.dataTransfer.types).includes("application/x-json-diver-path"));

  ["dragenter", "dragover"].forEach((ev) => {
    $dropzone.addEventListener(ev, (e) => {
      if (isRowDnd(e)) return;
      e.preventDefault();
      $dropzone.classList.add("dragover");
    });
    document.addEventListener(ev, (e) => {
      if (isRowDnd(e)) return;
      e.preventDefault();
    });
  });
  ["dragleave", "drop"].forEach((ev) => {
    $dropzone.addEventListener(ev, (e) => {
      if (isRowDnd(e)) return;
      e.preventDefault();
      $dropzone.classList.remove("dragover");
    });
  });
  $dropzone.addEventListener("drop", async (e) => {
    if (isRowDnd(e)) return;
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
    state.data = null;
    $input.value = "";
    $tree.innerHTML = "";
    setError("");
    saveToStorage("");
    $btnDownload.disabled = true;
    scheduleMinimapRedraw();
    revalidate();
    renderDepthBar();
    History.reset();
  });

  // ---------- Edit mode + D&D ----------

  const DnD = {
    source: null,         // { path, node }
    lastTarget: null,     // { rowEl, position, targetPath }
    schemaCache: new Map(), // per-drag cache for Schema.canPlace results

    start(handle, e) {
      if (!state.editMode) { e.preventDefault(); return; }
      const node = handle.closest(".node");
      if (!node || !node.dataset.path) { e.preventDefault(); return; }
      const path = JSON.parse(node.dataset.path);
      if (path.length === 0) { e.preventDefault(); return; } // root undraggable
      DnD.source = { path, node };
      DnD.schemaCache.clear();
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("application/x-json-diver-path", JSON.stringify(path));
      e.dataTransfer.setData("text/plain", ""); // some browsers need a text/plain entry
      document.body.classList.add("dnd-active");
      node.classList.add("dragging");
      hideTooltip();
    },

    hover(rowEl, e) {
      if (!DnD.source) return;
      const targetNode = rowEl.closest(".node");
      if (!targetNode || targetNode === DnD.source.node) {
        DnD.clearIndicators();
        DnD.lastTarget = null;
        return;
      }
      if (!targetNode.dataset.path) return;
      const targetPath = JSON.parse(targetNode.dataset.path);

      // Self-containment: cannot drop source into its own descendant
      if (Path.isPrefix(DnD.source.path, targetPath)) {
        DnD.clearIndicators();
        rowEl.classList.add("drop-forbidden");
        e.dataTransfer.dropEffect = "none";
        e.preventDefault();
        DnD.lastTarget = null;
        return;
      }

      // Determine drop zone by Y position (before / into / after)
      const rect = rowEl.getBoundingClientRect();
      const yPct = (e.clientY - rect.top) / rect.height;
      let position;
      if (yPct < 0.25) position = "before";
      else if (yPct > 0.75) position = "after";
      else position = "into";

      // "into" requires target to be a container; otherwise fall back to "after"
      if (position === "into") {
        const tv = Path.get(state.data, targetPath);
        const tt = typeOf(tv);
        if (tt !== "object" && tt !== "array") position = "after";
      }

      // Compute parents
      const targetParentPath = position === "into" ? targetPath : targetPath.slice(0, -1);
      const targetParentRef = Path.get(state.data, targetParentPath);
      const sourceParentRef = Path.parent(state.data, DnD.source.path);
      const sourceKey = Path.last(DnD.source.path);

      // Cross-type rule (MVP-2): array element → object requires a key name; forbid for now
      let valid = true;
      let reason = "";
      if (Array.isArray(sourceParentRef) && !Array.isArray(targetParentRef)) {
        valid = false;
        reason = "array要素はキー名がないためobjectには移動できません";
      }
      // Key collision: object → object move where target already has same key
      if (
        valid &&
        !Array.isArray(targetParentRef) &&
        sourceParentRef !== targetParentRef &&
        Object.prototype.hasOwnProperty.call(targetParentRef, sourceKey)
      ) {
        valid = false;
        reason = `キー "${sourceKey}" が移動先に既に存在します`;
      }

      // Schema gate (MVP-4): would this placement increase violations?
      if (valid && state.schema) {
        const cacheKey = `${JSON.stringify(targetPath)}|${position}`;
        let allowed;
        if (DnD.schemaCache.has(cacheKey)) {
          allowed = DnD.schemaCache.get(cacheKey);
        } else {
          allowed = Schema.canPlace(
            state.data, DnD.source.path, targetPath, position, state.violations.length
          );
          DnD.schemaCache.set(cacheKey, allowed);
        }
        if (!allowed) {
          valid = false;
          reason = "スキーマ違反になります";
        }
      }

      DnD.clearIndicators();
      if (valid) {
        const cls =
          position === "into" ? "drop-into" :
          position === "before" ? "drop-line-before" : "drop-line-after";
        rowEl.classList.add(cls);
        e.dataTransfer.dropEffect = "move";
        e.preventDefault();
        DnD.lastTarget = { rowEl, position, targetPath };
      } else {
        rowEl.classList.add("drop-forbidden");
        rowEl.title = reason;
        e.dataTransfer.dropEffect = "none";
        e.preventDefault();
        DnD.lastTarget = null;
      }
    },

    clearIndicators() {
      document
        .querySelectorAll(".drop-line-before, .drop-line-after, .drop-into, .drop-forbidden")
        .forEach((el) => {
          el.classList.remove(
            "drop-line-before", "drop-line-after", "drop-into", "drop-forbidden"
          );
          if (el.title) el.removeAttribute("title");
        });
    },

    drop(e) {
      if (!DnD.source || !DnD.lastTarget) return;
      e.preventDefault();
      const { position, targetPath } = DnD.lastTarget;

      // Two-stage defense: try on a draft first, only commit if schema OK
      let draft;
      try { draft = structuredClone(state.data); }
      catch (_) { draft = JSON.parse(JSON.stringify(state.data)); }

      try {
        applyMove(draft, DnD.source.path, targetPath, position);
      } catch (err) {
        showToast(`移動に失敗しました: ${err.message}`);
        return;
      }

      if (state.schema) {
        const oldCount = state.violations.length;
        const newCount = Schema.validate(draft).length;
        if (newCount > oldCount) {
          showToast(`スキーマ違反が増加するためロールバックしました（${oldCount} → ${newCount}）`);
          return;
        }
      }

      // Commit (with undo history)
      History.pushBefore(state.data);
      state.data = draft;
      const text = JSON.stringify(state.data, null, 2);
      $input.value = text;
      saveToStorage(text);
      renderTree(state.data, $tree);
      revalidate();
    },

    end() {
      DnD.clearIndicators();
      if (DnD.source && DnD.source.node) {
        DnD.source.node.classList.remove("dragging");
      }
      document.body.classList.remove("dnd-active");
      DnD.source = null;
      DnD.lastTarget = null;
      DnD.schemaCache.clear();
    },
  };

  function setEditMode(on) {
    state.editMode = on;
    document.body.classList.toggle("edit-mode", on);
    $btnEdit.classList.toggle("active", on);
  }
  $btnEdit.addEventListener("click", () => setEditMode(!state.editMode));

  // ---------- Undo / Redo history ----------

  function cloneData(d) {
    try { return structuredClone(d); }
    catch (_) { return JSON.parse(JSON.stringify(d)); }
  }

  const History = {
    past: [],
    future: [],
    MAX: 50,

    pushBefore(currentData) {
      History.past.push(cloneData(currentData));
      if (History.past.length > History.MAX) History.past.shift();
      History.future = [];
      History.updateUI();
    },

    undo() {
      if (History.past.length === 0) return undefined;
      History.future.push(cloneData(state.data));
      const prev = History.past.pop();
      History.updateUI();
      return prev;
    },

    redo() {
      if (History.future.length === 0) return undefined;
      History.past.push(cloneData(state.data));
      const next = History.future.pop();
      History.updateUI();
      return next;
    },

    reset() {
      History.past = [];
      History.future = [];
      History.updateUI();
    },

    updateUI() {
      $btnUndo.disabled = History.past.length === 0;
      $btnRedo.disabled = History.future.length === 0;
    },
  };

  function commitState(newData) {
    state.data = newData;
    const text = JSON.stringify(state.data, null, 2);
    $input.value = text;
    saveToStorage(text);
    renderTree(state.data, $tree);
    revalidate();
  }

  $btnUndo.addEventListener("click", () => {
    const prev = History.undo();
    if (prev !== undefined) commitState(prev);
  });
  $btnRedo.addEventListener("click", () => {
    const next = History.redo();
    if (next !== undefined) commitState(next);
  });

  // Keyboard shortcuts (only when focus is not in a text input)
  document.addEventListener("keydown", (e) => {
    const tag = e.target && e.target.tagName;
    if (tag === "TEXTAREA" || tag === "INPUT") return;
    const isMac = /Mac/.test(navigator.platform);
    const mod = isMac ? e.metaKey : e.ctrlKey;
    if (!mod) return;
    const key = e.key.toLowerCase();
    if (key === "z" && !e.shiftKey) {
      e.preventDefault();
      $btnUndo.click();
    } else if ((key === "z" && e.shiftKey) || key === "y") {
      e.preventDefault();
      $btnRedo.click();
    }
  });

  // ---------- Schema validation wiring ----------

  const STORAGE_KEY_SCHEMA = "json-diver:schema";

  function setSchemaStatus(cls, text) {
    $schemaStatus.className = "schema-status" + (cls ? " " + cls : "");
    $schemaStatus.textContent = text || "";
  }

  function revalidate() {
    if (!state.schema || state.data === null || state.data === undefined) {
      state.violations = [];
    } else {
      state.violations = Schema.validate(state.data);
    }
    applyViolationHighlights();
    updateViolationBadge();
  }

  function applyViolationHighlights() {
    $tree.querySelectorAll(".row-violation").forEach((el) => {
      el.classList.remove("row-violation");
      if (el.dataset.violationReason) delete el.dataset.violationReason;
    });
    if (state.violations.length === 0) return;
    const grouped = {};
    for (const v of state.violations) {
      const key = JSON.stringify(v.path);
      (grouped[key] = grouped[key] || []).push(v.message);
    }
    $tree.querySelectorAll(".node").forEach((node) => {
      const msgs = grouped[node.dataset.path];
      if (!msgs) return;
      const row = node.querySelector(":scope > .row");
      if (!row) return;
      row.classList.add("row-violation");
      row.title = msgs.join("\n");
    });
  }

  function updateViolationBadge() {
    const n = state.violations.length;
    if (n === 0) {
      $violationBadge.hidden = true;
      return;
    }
    $violationBadge.hidden = false;
    $violationBadge.textContent = `⚠ ${n}`;
    $violationBadge.title = state.violations
      .map((v) => `${v.path.length ? "/" + v.path.join("/") : "(root)"}: ${v.message}`)
      .join("\n");
  }

  $violationBadge.addEventListener("click", () => {
    if (state.violations.length === 0) return;
    const targetKey = JSON.stringify(state.violations[0].path);
    for (const node of $tree.querySelectorAll(".node")) {
      if (node.dataset.path !== targetKey) continue;
      const row = node.querySelector(":scope > .row");
      if (!row) break;
      row.scrollIntoView({ behavior: "smooth", block: "center" });
      row.classList.remove("flash");
      void row.offsetWidth;
      row.classList.add("flash");
      break;
    }
  });

  function applySchemaInput(text) {
    const trimmed = text.trim();
    if (!trimmed) {
      Schema.set(null);
      state.schema = null;
      $schemaError.hidden = true;
      setSchemaStatus("", "");
      try { localStorage.removeItem(STORAGE_KEY_SCHEMA); } catch (_) {}
      revalidate();
      return;
    }
    try {
      const parsed = JSON.parse(trimmed);
      Schema.set(parsed);
      state.schema = parsed;
      $schemaError.hidden = true;
      setSchemaStatus("ok", "OK");
      try { localStorage.setItem(STORAGE_KEY_SCHEMA, text); } catch (_) {}
      revalidate();
    } catch (err) {
      Schema.set(null);
      state.schema = null;
      $schemaError.hidden = false;
      $schemaError.textContent = err.message;
      setSchemaStatus("err", "parse error");
      revalidate();
    }
  }

  let schemaTimer = null;
  $schemaInput.addEventListener("input", () => {
    clearTimeout(schemaTimer);
    schemaTimer = setTimeout(() => applySchemaInput($schemaInput.value), 120);
  });

  // Delegated listeners on the main tree only (modals not draggable)
  $tree.addEventListener("dragstart", (e) => {
    const handle = e.target.closest && e.target.closest(".handle");
    if (!handle) return;
    DnD.start(handle, e);
  });
  $tree.addEventListener("dragover", (e) => {
    const row = e.target.closest && e.target.closest(".row");
    if (!row) return;
    DnD.hover(row, e);
  });
  $tree.addEventListener("drop", (e) => DnD.drop(e));
  $tree.addEventListener("dragleave", (e) => {
    if (e.relatedTarget && $tree.contains(e.relatedTarget)) return;
    DnD.clearIndicators();
  });
  document.addEventListener("dragend", () => DnD.end());

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
      app: "json-diver",
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

  // One-time cleanup of legacy storage key (renamed "json-outline" → "json-diver")
  try { localStorage.removeItem("json-outline:lastInput"); } catch (_) {}

  // Restore schema from previous session
  try {
    const savedSchema = localStorage.getItem(STORAGE_KEY_SCHEMA);
    if (savedSchema) {
      $schemaInput.value = savedSchema;
      applySchemaInput(savedSchema);
    }
  } catch (_) { /* storage unavailable */ }

  // Restore JSON from previous session
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      $input.value = saved;
      parseAndRender(saved);
    }
  } catch (_) { /* storage unavailable */ }
})();
