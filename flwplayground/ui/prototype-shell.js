const eventLog = document.getElementById("event-log");
const previewStatus = document.getElementById("preview-status");
const runtimeScriptPaths = ["../main.js"];
let runtimeLoaded = false;

function logEvent(message) {
  if (!eventLog) return;
  const timestamp = new Date().toLocaleTimeString();
  const entry = document.createElement("li");
  entry.textContent = `${timestamp} · ${message}`;
  eventLog.prepend(entry);
  while (eventLog.childElementCount > 12) {
    eventLog.removeChild(eventLog.lastChild);
  }
}

function setPreviewStatus(status) {
  if (previewStatus) {
    previewStatus.textContent = `Preview status: ${status}`;
    logEvent(`Preview status updated: ${status}`);
  }
}

function handleAction(action) {
  switch (action) {
    case "start-preview":
      setPreviewStatus("warming up local preview");
      logEvent("Start Local Preview clicked");
      break;
    case "join-session":
      logEvent("Attempting to join session (UUID placeholder)");
      break;
    case "publish-camera":
      logEvent("Publish camera request issued");
      break;
    case "publish-mic":
      logEvent("Publish microphone request issued");
      break;
    case "request-screen":
      logEvent("Screen share request initiated");
      break;
    case "end-call":
      setPreviewStatus("call ended");
      logEvent("End call action fired");
      break;
    case "load-runtime":
      loadRuntimeScripts();
      break;
    default:
      logEvent(`Unhandled action: ${action}`);
  }
}

function handleHostControl(action) {
  logEvent(`Host control: ${action}`);
}

function loadRuntimeScripts() {
  if (runtimeLoaded) {
    logEvent("Runtime scripts already requested");
    return;
  }

  runtimeScriptPaths.forEach((path) => {
    const script = document.createElement("script");
    script.src = path;
    script.onload = () => {
      logEvent(`Loaded runtime script ${path}`);
    };
    script.onerror = () => {
      logEvent(`Failed to load runtime script ${path}`);
    };
    document.head.appendChild(script);
  });

  runtimeLoaded = true;
  logEvent("Runtime load requested");
}

document.querySelectorAll("button[data-action]").forEach((button) => {
  button.addEventListener("click", () => handleAction(button.dataset.action));
});

document.querySelectorAll("button[data-control]").forEach((button) => {
  button.addEventListener("click", () => handleHostControl(button.dataset.control));
});

logEvent("Prototype shell initialized");
