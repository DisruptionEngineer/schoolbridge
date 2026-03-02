/**
 * SchoolBridge ClassDojo Connector - Popup UI Logic
 */

const dojoDot = document.getElementById("dojo-dot");
const dojoText = document.getElementById("dojo-text");
const dojoStatus = document.getElementById("classdojo-status");
const apiKeyInput = document.getElementById("api-key");
const connectBtn = document.getElementById("connect-btn");
const messageEl = document.getElementById("message");

// Load saved API key
chrome.storage.sync.get(["apiKey"], ({ apiKey }) => {
  if (apiKey) {
    apiKeyInput.value = apiKey;
  }
});

// Check ClassDojo status on popup open
chrome.runtime.sendMessage({ type: "CHECK_STATUS" }, (status) => {
  if (status.hasClassDojoCookie) {
    dojoDot.className = "status-dot green";
    dojoText.textContent = "Logged into ClassDojo";
    dojoStatus.className = "status-card connected";
    updateConnectButton();
  } else {
    dojoDot.className = "status-dot red";
    dojoText.textContent = "Not logged into ClassDojo";
    dojoStatus.className = "status-card disconnected";
    connectBtn.disabled = true;
  }
});

// Save API key on input change
apiKeyInput.addEventListener("input", () => {
  chrome.storage.sync.set({ apiKey: apiKeyInput.value });
  updateConnectButton();
});

function updateConnectButton() {
  connectBtn.disabled = !apiKeyInput.value || apiKeyInput.value.length < 10;
}

// Connect button handler
connectBtn.addEventListener("click", async () => {
  connectBtn.disabled = true;
  connectBtn.textContent = "Connecting...";
  showMessage("", "");

  chrome.runtime.sendMessage(
    { type: "SEND_COOKIE", apiKey: apiKeyInput.value },
    (result) => {
      connectBtn.disabled = false;
      connectBtn.textContent = "Connect to SchoolBridge";

      if (result.success) {
        showMessage("Connected! ClassDojo session synced to SchoolBridge.", "success");
      } else {
        showMessage(result.error || "Connection failed. Please try again.", "error");
      }
    },
  );
});

function showMessage(text, type) {
  if (!text) {
    messageEl.style.display = "none";
    return;
  }
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
  messageEl.style.display = "block";
}
