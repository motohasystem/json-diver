// Tauri-only integration. No-op when loaded in a regular browser.
(() => {
  const T = window.__TAURI__;
  if (!T) return;

  document.documentElement.classList.add("tauri");

  const { invoke } = T.core;
  const { listen } = T.event;

  let currentPath = null;

  const basename = (p) => (p ? String(p).split(/[\\/]/).pop() : "");

  async function openFile(path) {
    if (!path) return;
    try {
      const text = await invoke("read_text_file", { path });
      window.JsonDiver.loadText(text);
      currentPath = path;
      await invoke("set_current_file", { path });
      window.JsonDiver.setTitleSuffix(basename(path));
    } catch (err) {
      console.error("open failed:", err);
      alert("Open failed: " + err);
    }
  }

  async function saveCurrent() {
    let path = currentPath;
    if (!path) {
      path = await invoke("save_as_dialog");
      if (!path) return;
      currentPath = path;
      await invoke("set_current_file", { path });
    }
    try {
      await invoke("write_text_file", { path, contents: window.JsonDiver.getText() });
      window.JsonDiver.setTitleSuffix(basename(path));
      flashSaved();
    } catch (err) {
      console.error("save failed:", err);
      alert("Save failed: " + err);
    }
  }

  function flashSaved() {
    const btn = document.getElementById("btn-save-desktop");
    if (!btn) return;
    const orig = btn.textContent;
    btn.textContent = "Saved ✓";
    setTimeout(() => { btn.textContent = orig; }, 900);
  }

  function ensureSaveButton() {
    if (document.getElementById("btn-save-desktop")) return;
    const actions = document.querySelector(".data-actions");
    if (!actions) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = "btn-save-desktop";
    btn.textContent = "Save";
    btn.title = "Save (Ctrl+S)";
    btn.addEventListener("click", saveCurrent);
    actions.appendChild(btn);
  }

  function bindShortcuts() {
    window.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveCurrent();
      }
    });
  }

  function start() {
    ensureSaveButton();
    bindShortcuts();
    listen("file-opened", (e) => openFile(e.payload && e.payload.path ? e.payload.path : e.payload));
    invoke("get_initial_file").then((p) => { if (p) openFile(p); });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
