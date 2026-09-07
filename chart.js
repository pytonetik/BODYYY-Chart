function snapshot() {
  history.push(JSON.stringify(state.marks));
  if (history.length > 60) history.shift();
}
function renderPalette() {
  const nav = document.getElementById("palette");
  nav.innerHTML = "<h2>Symbols</h2>" + SYMBOLS.map(s => `
    <button type="button" data-symbol="${s.id}" class="${state.symbol === s.id ? "active" : ""}">
      <svg class="swatch" viewBox="-16 -16 32 32">${symbolGlyph(s.id, 0, 0, 22)}</svg>
      ${s.label}
    </button>`).join("");
  nav.querySelectorAll("button[data-symbol]").forEach(btn => {
    btn.onclick = () => {
      state.symbol = btn.dataset.symbol;
      state.mode = "draw";
      syncMode();
      renderPalette();
    };
  });
}
function renderMarks() {
  const g = document.getElementById("marks");
  g.innerHTML = state.marks.map(m => {
    const view = VIEWS.find(v => v.id === m.view);
    const sel = state.selected === m.id ? `<circle r="13" fill="none" stroke="#c9a96e" stroke-width="1.5"/>` : "";
    return `<g class="mark" data-id="${m.id}" transform="translate(${view.x + m.x},${view.y + m.y})">${sel}${symbolGlyph(m.symbol, 0, 0, 18)}</g>`;
  }).join("");
}
function renderFigures(stroke = "#e6e4dc") {
  document.getElementById("figures").innerHTML = VIEWS.map(v => figureGroup(v, stroke)).join("");
}
function applyView() {
  const { x, y, k } = state.view;
  document.getElementById("world").setAttribute("transform", `translate(${x} ${y}) scale(${k})`);
}
function clientToWorld(evt) {
  const svg = document.getElementById("stage");
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  const ctm = svg.getScreenCTM().inverse();
  const p = pt.matrixTransform(ctm);
  return { x: (p.x - state.view.x) / state.view.k, y: (p.y - state.view.y) / state.view.k };
}
function hitView(wx, wy) {
  return VIEWS.find(v => wx >= v.x + 20 && wx <= v.x + 280 && wy >= v.y && wy <= v.y + 790);
}
function nearestMark(wx, wy) {
  let best = null, dist = 16;
  for (const m of state.marks) {
    const view = VIEWS.find(v => v.id === m.view);
    const d = Math.hypot(wx - (view.x + m.x), wy - (view.y + m.y));
    if (d < dist) { dist = d; best = m; }
  }
  return best;
}
function selectMark(mark) {
  state.selected = mark ? mark.id : null;
  const info = document.getElementById("markInfo");
  const note = document.getElementById("note");
  if (!mark) {
    info.textContent = "Tap a symbol to select. Tap empty figure to place.";
    note.value = "";
  } else {
    const lab = SYMBOLS.find(s => s.id === mark.symbol)?.label || mark.symbol;
    info.textContent = `${lab} · ${mark.view}`;
    note.value = mark.note || "";
  }
  renderMarks();
}
function placeMark(wx, wy) {
  const view = hitView(wx, wy);
  if (!view) return;
  snapshot();
  state.marks.push({
    id: "m" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    view: view.id, x: wx - view.x, y: wy - view.y, symbol: state.symbol, note: ""
  });
  state.dirty = true;
  selectMark(state.marks[state.marks.length - 1]);
}
function currentChart() {
  return {
    version: 1, app: "BodyChart",
    header: {
      datetime: document.getElementById("when").value,
      name: document.getElementById("pname").value.trim(),
      id: document.getElementById("pid").value.trim()
    },
    marks: state.marks
  };
}
function loadChart(data) {
  if (!data || !Array.isArray(data.marks)) throw new Error("Not a BodyChart file");
  document.getElementById("when").value = data.header?.datetime || toDatetimeLocal();
  document.getElementById("pname").value = data.header?.name || "";
  document.getElementById("pid").value = data.header?.id || "";
  state.marks = data.marks;
  state.selected = null;
  state.dirty = false;
  history.length = 0;
  selectMark(null);
  renderMarks();
}
function download(filename, blob) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}
function exportPng() {
  const svg = document.getElementById("stage").cloneNode(true);
  svg.setAttribute("width", "2800");
  svg.setAttribute("height", "1640");
  const bg = svg.querySelector(".bg-screen");
  if (bg) bg.setAttribute("fill", "#ffffff");
  svg.querySelector("#world").setAttribute("transform", "");
  svg.querySelectorAll(".figure text").forEach(t => t.setAttribute("fill", "#222"));
  svg.querySelectorAll(".body").forEach(g => g.setAttribute("stroke", "#111"));
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml;charset=utf-8" }));
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 2800; canvas.height = 1640;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    canvas.toBlob(b => download(fileBase() + ".png", b), "image/png");
  };
  img.src = url;
}
function syncMode() {
  document.getElementById("stageWrap").classList.toggle("pan", state.mode === "pan");
  document.getElementById("modeDraw").style.borderColor = state.mode === "draw" ? "#c9a96e" : "";
  document.getElementById("modePan").style.borderColor = state.mode === "pan" ? "#c9a96e" : "";
}
function fit() { state.view = { x: 0, y: 0, k: 1 }; applyView(); }
function zoomAt(factor, cx, cy) {
  const k = Math.min(4, Math.max(0.5, state.view.k * factor));
  state.view.x = cx - (cx - state.view.x) * (k / state.view.k);
  state.view.y = cy - (cy - state.view.y) * (k / state.view.k);
  state.view.k = k;
  applyView();
}
function bind() {
  const wrap = document.getElementById("stageWrap");
  const stage = document.getElementById("stage");
  let pointers = new Map();
  let lastPan = null;
  let pinch = null;
  stage.addEventListener("pointerdown", e => {
    stage.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const pts = [...pointers.values()];
      pinch = { dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y), k: state.view.k };
      return;
    }
    if (state.mode === "pan" || e.button === 1) {
      wrap.classList.add("panning");
      lastPan = { x: e.clientX, y: e.clientY };
      return;
    }
    const w = clientToWorld(e);
    const hit = nearestMark(w.x, w.y);
    if (hit) selectMark(hit);
    else placeMark(w.x, w.y);
  });
  stage.addEventListener("pointermove", e => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2 && pinch) {
      const pts = [...pointers.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      const svg = document.getElementById("stage");
      const pt = svg.createSVGPoint();
      pt.x = mid.x; pt.y = mid.y;
      const p = pt.matrixTransform(svg.getScreenCTM().inverse());
      const k = Math.min(4, Math.max(0.5, pinch.k * (dist / pinch.dist)));
      state.view.x = p.x - (p.x - state.view.x) * (k / state.view.k);
      state.view.y = p.y - (p.y - state.view.y) * (k / state.view.k);
      state.view.k = k;
      applyView();
      return;
    }
    if (lastPan) {
      state.view.x += e.clientX - lastPan.x;
      state.view.y += e.clientY - lastPan.y;
      lastPan = { x: e.clientX, y: e.clientY };
      applyView();
    }
  });
  const endPtr = e => { pointers.delete(e.pointerId); lastPan = null; pinch = null; wrap.classList.remove("panning"); };
  stage.addEventListener("pointerup", endPtr);
  stage.addEventListener("pointercancel", endPtr);
  stage.addEventListener("wheel", e => {
    e.preventDefault();
    const w = clientToWorld(e);
    zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, w.x * state.view.k + state.view.x, w.y * state.view.k + state.view.y);
  }, { passive: false });
  document.getElementById("zoomIn").onclick = () => zoomAt(1.2, 700, 410);
  document.getElementById("zoomOut").onclick = () => zoomAt(1 / 1.2, 700, 410);
  document.getElementById("zoomFit").onclick = fit;
  document.getElementById("modeDraw").onclick = () => { state.mode = "draw"; syncMode(); };
  document.getElementById("modePan").onclick = () => { state.mode = "pan"; syncMode(); };
  document.getElementById("btnUndo").onclick = () => {
    const prev = history.pop();
    if (!prev) return;
    state.marks = JSON.parse(prev);
    selectMark(null);
  };
  document.getElementById("btnDelete").onclick = () => {
    if (!state.selected) return;
    snapshot();
    state.marks = state.marks.filter(m => m.id !== state.selected);
    selectMark(null);
  };
  document.getElementById("note").addEventListener("input", e => {
    const m = state.marks.find(x => x.id === state.selected);
    if (m) { m.note = e.target.value; state.dirty = true; }
  });
  document.getElementById("btnNew").onclick = () => {
    if (state.marks.length && !confirm("Clear this chart?")) return;
    state.marks = []; history.length = 0;
    document.getElementById("when").value = toDatetimeLocal();
    document.getElementById("pname").value = "";
    document.getElementById("pid").value = "";
    selectMark(null);
  };
  document.getElementById("btnSave").onclick = () => {
    download(fileBase() + ".json", new Blob([JSON.stringify(currentChart(), null, 2)], { type: "application/json" }));
    state.dirty = false;
  };
  document.getElementById("btnOpen").onclick = () => document.getElementById("fileOpen").click();
  document.getElementById("fileOpen").onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    file.text().then(t => loadChart(JSON.parse(t))).catch(err => alert(err.message));
    e.target.value = "";
  };
  document.getElementById("btnPng").onclick = exportPng;
}
document.getElementById("when").value = toDatetimeLocal();
renderFigures();
renderPalette();
renderMarks();
applyView();
syncMode();
bind();
