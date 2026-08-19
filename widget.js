// ============================================================================
// YT Monetization Tracker — widget Scriptable na ekran główny iPhone'a
// ============================================================================
//
// JAK DODAĆ:
//   1. Zainstaluj apkę "Scriptable" (App Store, darmowa).
//   2. Scriptable → "+" → wklej ten plik → nazwij np. "YT Tracker".
//   3. Uzupełnij niżej API i KEY (KEY = WIDGET_KEY z backendu).
//   4. Wyjdź. Na ekranie głównym: przytrzymaj → "+" → Scriptable →
//      wybierz rozmiar (Small albo Medium) → dodaj.
//   5. Przytrzymaj widget → "Edytuj widget":
//        - Script    = YT Tracker
//        - Parameter = id kanału (np. 3) ALBO "next" (rotacja po kanałach)
//      Zostaw puste = zachowanie z CHANNEL poniżej ("next").
//   6. Możesz dodać kilka widgetów z różnymi Parameter (różne kanały).
//
// ============================================================================

// ─────────────── KONFIG (uzupełnij) ───────────────
const API = "https://twoj-projekt.vercel.app/api/widget"; // <- podmień na swój host
const KEY = "wklej-tu-WIDGET_KEY";                         // <- = WIDGET_KEY z backendu
const CHANNEL = "next"; // domyślnie; nadpisywane przez "Parameter" widgetu
// ───────────────────────────────────────────────────

// Parameter widgetu ma pierwszeństwo nad CHANNEL.
const channel = (args.widgetParameter && String(args.widgetParameter).trim()) || CHANNEL;

// Stonowane, ciemne tła zależne od pace.
const THEME = {
  green:  { bg: ["#0e2a17", "#0a1f11"], accent: "#3fb950", label: "na czas" },
  orange: { bg: ["#2b2410", "#1f1a0b"], accent: "#d29922", label: "w tyle" },
  red:    { bg: ["#2b1315", "#1f0d0e"], accent: "#f85149", label: "zagrożone" },
  none:   { bg: ["#161b22", "#0d1117"], accent: "#8b949e", label: "" },
};

const CACHE = FileManager.local();
const CACHE_PATH = CACHE.joinPath(
  CACHE.cacheDirectory(),
  "yt_tracker_" + channel.replace(/[^a-z0-9]/gi, "_") + ".json"
);

async function fetchData() {
  const url = `${API}?key=${encodeURIComponent(KEY)}&channel=${encodeURIComponent(channel)}`;
  const req = new Request(url);
  req.timeoutInterval = 15;
  const data = await req.loadJSON();
  if (!data || typeof data.days_left === "undefined") {
    throw new Error("Zła odpowiedź API");
  }
  // Zapisz jako ostatnie dobre dane.
  try { CACHE.writeString(CACHE_PATH, JSON.stringify(data)); } catch (e) {}
  return { data, stale: false };
}

function readCache() {
  try {
    if (CACHE.fileExists(CACHE_PATH)) {
      return { data: JSON.parse(CACHE.readString(CACHE_PATH)), stale: true };
    }
  } catch (e) {}
  return null;
}

async function makeWidget(payload, stale) {
  const w = new ListWidget();
  const t = THEME[payload && payload.pace ? payload.pace : "none"] || THEME.none;

  const grad = new LinearGradient();
  grad.colors = [new Color(t.bg[0]), new Color(t.bg[1])];
  grad.locations = [0, 1];
  w.backgroundGradient = grad;

  const family = config.widgetFamily || "small";
  const pad = family === "medium" ? 14 : 12;
  w.setPadding(pad, pad + 2, pad, pad + 2);

  if (!payload) {
    const err = w.addText("brak połączenia");
    err.font = Font.semiboldSystemFont(14);
    err.textColor = new Color("#8b949e");
    w.refreshAfterDate = new Date(Date.now() + 30 * 60 * 1000);
    return w;
  }

  // Tytuł kanału (małe caps).
  const title = w.addText((payload.name || "").toUpperCase());
  title.font = Font.semiboldSystemFont(family === "medium" ? 11 : 10);
  title.textColor = new Color(t.accent);
  title.lineLimit = 1;

  w.addSpacer(family === "medium" ? 6 : 4);

  // Wielki countdown.
  const big = w.addStack();
  big.centerAlignContent();
  const days = big.addText(`${payload.days_left}`);
  days.font = Font.boldSystemFont(family === "medium" ? 40 : 34);
  days.textColor = new Color("#f0f6fc");
  big.addSpacer(5);
  const unit = big.addText(payload.days_left === 0 ? "po terminie" : "dni");
  unit.font = Font.mediumSystemFont(13);
  unit.textColor = new Color("#8b949e");

  w.addSpacer(family === "medium" ? 10 : 8);

  // Szerokość dostępna na paski (przybliżona: rozmiar widgetu - padding).
  const widths = { small: 130, medium: 300 };
  const barW = (widths[family] || 130);

  drawBar(w, "SUBY", payload.pct_subs, t.accent, barW);
  w.addSpacer(6);
  drawBar(w, "VIEWS 90D", payload.pct_views, t.accent, barW);

  w.addSpacer(family === "medium" ? 10 : 8);

  // Completion % + pace.
  const foot = w.addStack();
  foot.centerAlignContent();
  const dot = foot.addText("●");
  dot.font = Font.systemFont(9);
  dot.textColor = new Color(t.accent);
  foot.addSpacer(5);
  const comp = foot.addText(`${payload.completion_pct}% ukończone`);
  comp.font = Font.mediumSystemFont(11);
  comp.textColor = new Color("#c9d1d9");
  foot.addSpacer();
  if (stale) {
    const s = foot.addText("offline");
    s.font = Font.systemFont(9);
    s.textColor = new Color("#8b949e");
  } else if (t.label) {
    const s = foot.addText(t.label);
    s.font = Font.systemFont(10);
    s.textColor = new Color(t.accent);
  }

  w.refreshAfterDate = new Date(Date.now() + 30 * 60 * 1000);
  return w;
}

// Pasek rysowany przez DrawContext — pewne proporcje niezależnie od quirków stacków.
function drawBar(container, label, pct, accent, width) {
  const row = container.addStack();
  row.layoutVertically();
  row.spacing = 3;

  const head = row.addStack();
  const lbl = head.addText(label);
  lbl.font = Font.mediumSystemFont(9);
  lbl.textColor = new Color("#8b949e");
  head.addSpacer();
  const val = head.addText(`${Math.round(pct)}%`);
  val.font = Font.semiboldSystemFont(9);
  val.textColor = new Color("#c9d1d9");

  const h = 6;
  const clamped = Math.max(0, Math.min(100, pct)) / 100;
  const ctx = new DrawContext();
  ctx.size = new Size(width, h);
  ctx.opaque = false;
  ctx.respectScreenScale = true;

  const bg = new Path();
  bg.addRoundedRect(new Rect(0, 0, width, h), h / 2, h / 2);
  ctx.setFillColor(new Color("#ffffff", 0.10));
  ctx.addPath(bg);
  ctx.fillPath();

  const fw = Math.max(h, width * clamped); // min = kółko
  const fg = new Path();
  fg.addRoundedRect(new Rect(0, 0, fw, h), h / 2, h / 2);
  ctx.setFillColor(new Color(accent));
  ctx.addPath(fg);
  ctx.fillPath();

  const img = row.addImage(ctx.getImage());
  img.imageSize = new Size(width, h);
}

// ─────────────── main ───────────────
let result;
try {
  result = await fetchData();
} catch (e) {
  // Błąd sieci: spróbuj ostatnich danych z cache.
  result = readCache() || { data: null, stale: true };
}

const widget = await makeWidget(result.data, result.stale);

if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  // Podgląd w apce.
  if (config.widgetFamily === "medium") await widget.presentMedium();
  else await widget.presentSmall();
}
Script.complete();
