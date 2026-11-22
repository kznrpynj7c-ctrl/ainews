const defaultStations = [
  { name: "K-Love", show: "Contemporary Christian", host: "K-Love", listeners: "—", letter: "K", colors: ["#4838cc", "#f35b9a"], stream: "https://maestro.emfcdn.com/stream_for/k-love/airable/aac" },
  { name: "Radio24", show: "News and talk", host: "Il Sole 24 Ore", listeners: "—", letter: "R", colors: ["#154b70", "#31c7bd"], stream: "https://ilsole24ore-radio.akamaized.net/hls/live/2035301/radio24/playlist.m3u8", format: "m3u8" }
];

const STORAGE_KEY = "pulse-radio-stations-v2";
const REMOVED_DEFAULTS_KEY = "pulse-radio-removed-defaults-v1";
const savedStations = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
const removedDefaults = new Set(JSON.parse(localStorage.getItem(REMOVED_DEFAULTS_KEY) || "[]"));
const stations = [...defaultStations.filter((station) => !removedDefaults.has(station.stream)), ...savedStations];
const stationList = document.querySelector("#station-list");
const addButton = document.querySelector("#add-button");
const addPanel = document.querySelector("#add-station-panel");
const cancelButton = document.querySelector("#cancel-button");
const addForm = document.querySelector("#add-station-form");
const stationName = document.querySelector("#station-name");
const stationUrl = document.querySelector("#station-url");
const formMessage = document.querySelector("#form-message");
const audioPlayer = document.querySelector("#audio-player");
let activeStation = 0;
let playbackRequest = 0;

function showError(message, error) {
  formMessage.textContent = message;
  if (error) console.error(message, error);
}

window.addEventListener("error", (event) => {
  showError(`Application error: ${event.message || "Unknown error."}`, event.error);
});
window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason instanceof Error ? event.reason.message : String(event.reason);
  showError(`Application error: ${reason}`, event.reason);
});
audioPlayer.addEventListener("error", () => {
  const mediaError = audioPlayer.error;
  if (mediaError?.code === MediaError.MEDIA_ERR_ABORTED) return;
  const details = mediaError ? ` (code ${mediaError.code}: ${mediaError.message || "media error"})` : "";
  showError(`This station could not be loaded${details}`, mediaError);
});
audioPlayer.addEventListener("loadstart", () => {
  if (!audioPlayer.currentSrc) return;
  formMessage.textContent = "Connecting to station...";
});
audioPlayer.addEventListener("playing", () => {
  formMessage.textContent = "";
  renderStations();
});
audioPlayer.addEventListener("pause", () => {
  renderStations();
});
audioPlayer.addEventListener("stalled", () => {
  if (audioPlayer.paused || !audioPlayer.currentSrc) return;
  showError("The station stream stalled. Check your connection or try another station.");
});

function renderStations() {
  const isPlaying = !audioPlayer.paused && audioPlayer.currentSrc;
  stationList.innerHTML = stations.map((station, index) => `
    <div class="station-row removable" data-index="${index}">
      <button class="station-card${index === activeStation ? ` active ${isPlaying ? "playing" : "stopped"}` : ""}" type="button" aria-pressed="${index === activeStation}">
        <span class="station-thumb" style="background: linear-gradient(135deg, ${station.colors[0]}, ${station.colors[1]})">${station.letter}</span>
        <span class="station-info"><strong>${station.name}</strong><small>${station.show} ${station.host}</small></span>
        ${index === activeStation ? `<span class="station-live ${isPlaying ? "playing" : "stopped"}"><i></i>${isPlaying ? "LIVE" : "OFF"}</span>` : ""}
      </button>
      <button class="delete-station" type="button" aria-label="Delete station">Delete</button>
    </div>
  `).join("");
}

function stopPlayback() {
  playbackRequest += 1;
  audioPlayer.pause();
  audioPlayer.removeAttribute("src");
  audioPlayer.load();
  formMessage.textContent = "";
  renderStations();
}

function stationFromUrl(value, customName) {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only web URLs are supported.");
  const isHls = /\.m3u8(?:$|[?#])/i.test(url.pathname + url.search + url.hash);
  const hostname = url.hostname.replace(/^www\./, "").split(".")[0];
  const fallbackName = hostname ? hostname.charAt(0).toUpperCase() + hostname.slice(1) : "New station";
  const name = customName.trim() || fallbackName;
  return {
    name,
    show: isHls ? "HLS stream" : "Custom stream",
    host: url.hostname,
    listeners: "—",
    letter: name.charAt(0).toUpperCase(),
    colors: ["#3c536d", "#8b6fb1"],
    stream: url.href,
    format: isHls ? "m3u8" : "stream"
  };
}

function selectStation(index, { play = false } = {}) {
  activeStation = index;
  const station = stations[index];
  stopPlayback();
  if (play) {
    audioPlayer.src = station.stream;
    audioPlayer.load();
  }
  renderStations();
  if (play) {
    const request = playbackRequest;
    audioPlayer.play().catch((error) => {
      if (request !== playbackRequest || error.name === "AbortError") return;
      showError("This station could not be played. Try another stream.", error);
    });
  }
}

function saveStations() {
  const defaultStreams = new Set(defaultStations.map((station) => station.stream));
  const customStations = stations.filter((station) => !defaultStreams.has(station.stream));
  const currentDefaultStreams = new Set(stations.filter((station) => defaultStreams.has(station.stream)).map((station) => station.stream));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(customStations));
  localStorage.setItem(REMOVED_DEFAULTS_KEY, JSON.stringify(defaultStations.filter((station) => !currentDefaultStreams.has(station.stream)).map((station) => station.stream)));
}

function playStation(index) {
  const station = stations[index];
  activeStation = index;
  stopPlayback();
  const request = playbackRequest;
  audioPlayer.src = station.stream;
  audioPlayer.load();
  renderStations();
  audioPlayer.play().catch((error) => {
    if (request !== playbackRequest || error.name === "AbortError") return;
    showError("This station could not be played. Try another stream.", error);
  });
}

addButton.addEventListener("click", () => {
  const isOpen = !addPanel.hidden;
  addPanel.hidden = isOpen;
  addButton.setAttribute("aria-expanded", String(!isOpen));
  if (!isOpen) stationName.focus();
  formMessage.textContent = "";
});
cancelButton.addEventListener("click", () => {
  addPanel.hidden = true;
  addButton.setAttribute("aria-expanded", "false");
  formMessage.textContent = "";
});
addForm.addEventListener("submit", (event) => {
  event.preventDefault();
  try {
    const station = stationFromUrl(stationUrl.value.trim(), stationName.value);
    if (stations.some((item) => item.stream === station.stream)) throw new Error("This station is already added.");
    stations.push(station);
    saveStations();
    stationName.value = "";
    stationUrl.value = "";
    addPanel.hidden = true;
    addButton.setAttribute("aria-expanded", "false");
    formMessage.textContent = `${station.name} added.`;
    selectStation(stations.length - 1);
  } catch (error) {
    showError(error instanceof TypeError ? "Paste a valid stream URL." : error.message, error);
  }
});
let swipeStartX = 0;
let swipeStartY = 0;
let swipeRow = null;
let swipeCaptureTarget = null;
stationList.addEventListener("pointerdown", (event) => {
  const row = event.target.closest(".station-row.removable");
  if (!row || event.target.closest(".delete-station")) return;
  swipeRow = row;
  swipeStartX = event.clientX;
  swipeStartY = event.clientY;
  swipeCaptureTarget = row.querySelector(".station-card");
  swipeCaptureTarget.setPointerCapture(event.pointerId);
});
stationList.addEventListener("pointermove", (event) => {
  if (!swipeRow) return;
  const deltaX = event.clientX - swipeStartX;
  const deltaY = event.clientY - swipeStartY;
  if (Math.abs(deltaY) > Math.abs(deltaX)) return;
  if (deltaX < 0) {
    event.preventDefault();
    swipeRow.classList.toggle("swiping", deltaX < -8);
    swipeRow.querySelector(".station-card").style.transform = `translateX(${Math.max(deltaX, -96)}px)`;
  }
});
stationList.addEventListener("pointerup", (event) => {
  if (!swipeRow) return;
  const row = swipeRow;
  const wasSwipe = swipeStartX - event.clientX > 60;
  swipeCaptureTarget.releasePointerCapture(event.pointerId);
  row.classList.toggle("swiped", wasSwipe);
  row.querySelector(".station-card").style.transform = "";
  swipeRow = null;
  swipeCaptureTarget = null;
});
stationList.addEventListener("pointercancel", () => {
  if (!swipeRow) return;
  swipeRow.classList.remove("swiping");
  swipeRow.querySelector(".station-card").style.transform = "";
  swipeRow = null;
  swipeCaptureTarget = null;
});
stationList.addEventListener("click", (event) => {
  const row = event.target.closest(".station-row");
  if (!row) return;
  if (event.target.closest(".delete-station")) {
    const index = Number(row.dataset.index);
    if (index === activeStation) stopPlayback();
    stations.splice(index, 1);
    if (index < activeStation) activeStation -= 1;
    saveStations();
    activeStation = Math.min(activeStation, stations.length - 1);
    renderStations();
    formMessage.textContent = "Station deleted.";
    return;
  }
  if (!event.target.closest(".station-card") || row.classList.contains("swiped")) return;
  const index = Number(row.dataset.index);
  if (index === activeStation && audioPlayer.hasAttribute("src")) {
    stopPlayback();
  } else {
    playStation(index);
  }
});
selectStation(0);
if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("sw.js"));
