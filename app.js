const SYMBOLS = [
  { id: "pain", label: "Pain" },
  { id: "tender", label: "Tender joint" },
  { id: "adhesion", label: "Adhesion" },
  { id: "friction", label: "Friction" },
  { id: "inflammation", label: "Inflammation" },
  { id: "hypersensitivity", label: "Hypersensitivity" },
  { id: "spasm", label: "Spasm" },
  { id: "trigger", label: "Trigger point" },
  { id: "elevation", label: "Elevation" }
];

const VIEWS = [
  { id: "posterior", label: "Posterior", x: 40, y: 36 },
  { id: "left", label: "Left lateral", x: 370, y: 36 },
  { id: "anterior", label: "Anterior", x: 700, y: 36 },
  { id: "right", label: "Right lateral", x: 1030, y: 36 }
];

const state = {
  mode: "draw",
  symbol: "pain",
  marks: [],
  selected: null,
  view: { x: 0, y: 0, k: 1 },
  dirty: false
};
const history = [];

function pad(n) { return String(n).padStart(2, "0"); }
function localStamp(d = new Date()) {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}`;
}
function toDatetimeLocal(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fileBase() {
  const when = document.getElementById("when").value;
  const d = when ? new Date(when) : new Date();
  const stamp = isNaN(d) ? localStamp() : localStamp(d);
  const extra = (document.getElementById("pname").value || document.getElementById("pid").value || "").trim();
  return extra ? `${stamp} ${extra} Body Chart` : `${stamp} Body Chart`;
}
function symbolGlyph(id, x, y, size = 16, color = "#e24b4b") {
  const s = size;
  const g = `<g transform="translate(${x},${y})">`;
  switch (id) {
    case "pain": return `${g}<circle r="${s * 0.42}" fill="${color}" stroke="#1a0a0a" stroke-width="1"/></g>`;
    case "tender": return `${g}<circle r="${s * 0.42}" fill="none" stroke="${color}" stroke-width="2"/><circle r="${s * 0.18}" fill="${color}"/></g>`;
    case "adhesion": return `${g}<path d="M${-s*0.38},${-s*0.38} L${s*0.38},${s*0.38} M${s*0.38},${-s*0.38} L${-s*0.38},${s*0.38}" stroke="${color}" stroke-width="2.4" stroke-linecap="round"/></g>`;
    case "friction": return `${g}<circle r="${s * 0.4}" fill="none" stroke="${color}" stroke-width="2"/><path d="M${-s*0.22},${-s*0.22} L${s*0.22},${s*0.22} M${s*0.22},${-s*0.22} L${-s*0.22},${s*0.22}" stroke="${color}" stroke-width="1.8" stroke-linecap="round"/></g>`;
    case "inflammation": return `${g}<circle r="${s * 0.42}" fill="none" stroke="${color}" stroke-width="1.6"/><circle r="${s * 0.26}" fill="none" stroke="${color}" stroke-width="1.6"/></g>`;
    case "hypersensitivity": return `${g}<path d="M${-s*0.4},${-s*0.22} H${s*0.4} M${-s*0.4},0 H${s*0.4} M${-s*0.4},${s*0.22} H${s*0.4}" stroke="${color}" stroke-width="2" stroke-linecap="round"/></g>`;
    case "spasm": return `${g}<text text-anchor="middle" dominant-baseline="central" font-size="${s * 0.72}" font-family="Georgia,serif" fill="${color}">≈</text></g>`;
    case "trigger": return `${g}<path d="M${-s*0.08},${-s*0.42} C${s*0.5},${-s*0.1} ${s*0.15},${s*0.45} ${-s*0.35},${s*0.2} C${s*0.05},${s*0.05} ${s*0.05},${-s*0.2} ${-s*0.08},${-s*0.42}Z" fill="none" stroke="${color}" stroke-width="2"/></g>`;
    case "elevation": return `${g}<path d="M${-s*0.28},${s*0.32} L${s*0.28},${-s*0.32}" stroke="${color}" stroke-width="2.4" stroke-linecap="round"/></g>`;
    default: return `${g}<circle r="${s * 0.3}" fill="${color}"/></g>`;
  }
}
