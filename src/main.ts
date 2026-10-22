import "./style.css";
import {
  parseMetadata,
  openStreetMapUrl,
  type PhotoMetadata,
  type GpsLocation,
} from "./metadata.ts";

const app = document.querySelector<HTMLDivElement>("#app")!;

app.innerHTML = `
  <div class="app">
    <header class="topbar">
      <div class="brand">
        <span class="brand-mark" aria-hidden="true">◇</span>
        <span class="brand-name">Oh-My-Metadata</span>
      </div>
      <p class="topbar-note">Reads EXIF locally, nothing is uploaded.</p>
    </header>

    <div class="workspace">
      <aside class="pane pane-input">
        <div id="dropzone" class="dropzone" tabindex="0" role="button"
             aria-label="Drop a photo here or click to choose a file">
          <p class="dropzone-title">Drop a photo</p>
          <p class="dropzone-hint">or click to browse</p>
          <input id="file-input" type="file" accept="image/*" hidden />
        </div>

        <figure id="preview" class="preview" hidden>
          <img id="preview-img" alt="Selected photo preview" />
          <figcaption id="preview-name" class="preview-name"></figcaption>
        </figure>

        <p id="status" class="status" role="status" aria-live="polite" hidden></p>
      </aside>

      <main class="pane pane-output">
        <div id="metadata" class="metadata">
          <div class="placeholder">
            <p class="placeholder-title">No photo yet</p>
            <p class="placeholder-hint">
              Drop an image on the left to inspect its camera, capture
              settings, and GPS data.
            </p>
          </div>
        </div>
      </main>
    </div>
  </div>
`;

const dropzone = app.querySelector<HTMLDivElement>("#dropzone")!;
const fileInput = app.querySelector<HTMLInputElement>("#file-input")!;
const statusEl = app.querySelector<HTMLElement>("#status")!;
const previewFigure = app.querySelector<HTMLElement>("#preview")!;
const previewImg = app.querySelector<HTMLImageElement>("#preview-img")!;
const previewName = app.querySelector<HTMLElement>("#preview-name")!;
const metadataEl = app.querySelector<HTMLDivElement>("#metadata")!;

let previewUrl: string | null = null;

function showStatus(message: string, kind: "info" | "error"): void {
  statusEl.textContent = message;
  statusEl.classList.toggle("status-error", kind === "error");
  statusEl.hidden = false;
}

function clearStatus(): void {
  statusEl.hidden = true;
  statusEl.textContent = "";
  statusEl.classList.remove("status-error");
}

function setPreview(file: File): void {
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = URL.createObjectURL(file);
  previewImg.src = previewUrl;
  previewName.textContent = file.name;
  previewFigure.hidden = false;
}

function hidePreview(): void {
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
    previewUrl = null;
  }
  previewImg.removeAttribute("src");
  previewName.textContent = "";
  previewFigure.hidden = true;
}

function showPlaceholder(title: string, hint: string): void {
  const wrap = document.createElement("div");
  wrap.className = "placeholder";
  const t = document.createElement("p");
  t.className = "placeholder-title";
  t.textContent = title;
  const h = document.createElement("p");
  h.className = "placeholder-hint";
  h.textContent = hint;
  wrap.append(t, h);
  metadataEl.replaceChildren(wrap);
}

function renderGps(gps: GpsLocation): HTMLElement {
  const section = document.createElement("section");
  section.className = "meta-section";

  const heading = document.createElement("h2");
  heading.textContent = "GPS";
  section.appendChild(heading);

  const rows = document.createElement("dl");
  rows.className = "meta-rows";
  for (const [label, value] of [
    ["Latitude", gps.latitude.toFixed(6)],
    ["Longitude", gps.longitude.toFixed(6)],
  ] as const) {
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = value;
    rows.append(dt, dd);
  }
  section.appendChild(rows);

  const link = document.createElement("a");
  link.className = "map-link";
  link.href = openStreetMapUrl(gps);
  link.target = "_blank";
  link.rel = "noopener";
  link.textContent = "View location on OpenStreetMap";
  section.appendChild(link);

  return section;
}

function renderMetadata(data: PhotoMetadata): void {
  metadataEl.replaceChildren();

  if (data.isEmpty) {
    const empty = document.createElement("p");
    empty.className = "empty-note";
    empty.textContent = "No EXIF metadata found in this image.";
    metadataEl.appendChild(empty);
    return;
  }

  for (const section of data.sections) {
    const el = document.createElement("section");
    el.className = "meta-section";

    const heading = document.createElement("h2");
    heading.textContent = section.title;
    el.appendChild(heading);

    const rows = document.createElement("dl");
    rows.className = "meta-rows";
    for (const field of section.fields) {
      const dt = document.createElement("dt");
      dt.textContent = field.label;
      const dd = document.createElement("dd");
      dd.textContent = field.value;
      rows.append(dt, dd);
    }
    el.appendChild(rows);
    metadataEl.appendChild(el);
  }

  if (data.gps) {
    metadataEl.appendChild(renderGps(data.gps));
  }
}

async function handleFile(file: File): Promise<void> {
  if (!file.type.startsWith("image/")) {
    hidePreview();
    showPlaceholder(
      "Not an image",
      "That file does not look like a photo. Try a JPEG, PNG, or HEIC.",
    );
    showStatus(
      "That does not look like an image file. Please choose a photo.",
      "error",
    );
    return;
  }

  clearStatus();
  setPreview(file);
  metadataEl.replaceChildren();
  showStatus("Reading metadata…", "info");

  try {
    const data = await parseMetadata(file);
    clearStatus();
    renderMetadata(data);
  } catch (error) {
    console.error(error);
    renderMetadata({ sections: [], gps: null, isEmpty: true });
    showStatus(
      "Could not read metadata from this file. It may be corrupted or unsupported.",
      "error",
    );
  }
}

// Click / keyboard opens the native file picker.
dropzone.addEventListener("click", () => fileInput.click());
dropzone.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    fileInput.click();
  }
});

fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  if (file) void handleFile(file);
});

// Drag-and-drop with visual feedback.
dropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropzone.classList.add("is-dragover");
});

for (const type of ["dragleave", "dragend"] as const) {
  dropzone.addEventListener(type, () =>
    dropzone.classList.remove("is-dragover"),
  );
}

dropzone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropzone.classList.remove("is-dragover");
  const file = event.dataTransfer?.files?.[0];
  if (file) void handleFile(file);
});

// Prevent the browser from navigating away if a file is dropped outside the zone.
window.addEventListener("dragover", (event) => event.preventDefault());
window.addEventListener("drop", (event) => event.preventDefault());
