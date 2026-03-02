/**
 * SchoolBridge ClassDojo Connector - Background Service Worker
 *
 * Extracts the dojo_home_login.sid cookie from ClassDojo and sends it
 * to the SchoolBridge API. HttpOnly cookies are accessible to extensions
 * via chrome.cookies API (unlike JavaScript on the page).
 */

const CLASSDOJO_COOKIE = {
  url: "https://home.classdojo.com",
  name: "dojo_home_login.sid",
};

// Listen for messages from popup or content script
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "EXTRACT_COOKIE") {
    extractCookie().then(sendResponse);
    return true; // keep channel open for async
  }

  if (message.type === "SEND_COOKIE") {
    sendCookieToSchoolBridge(message.apiKey).then(sendResponse);
    return true;
  }

  if (message.type === "CHECK_STATUS") {
    checkStatus().then(sendResponse);
    return true;
  }
});

// Update badge when user visits ClassDojo
chrome.webNavigation?.onCompleted?.addListener(
  (details) => {
    if (details.frameId === 0) {
      extractCookie().then((result) => {
        chrome.action.setBadgeText({
          text: result.success ? "ON" : "",
        });
        chrome.action.setBadgeBackgroundColor({ color: "#10b981" });
      });
    }
  },
  { url: [{ hostContains: "classdojo.com" }] },
);

async function extractCookie() {
  try {
    const cookie = await chrome.cookies.get(CLASSDOJO_COOKIE);
    if (cookie && cookie.value) {
      return { success: true, cookie: cookie.value };
    }
    return { success: false, error: "Not logged into ClassDojo" };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function sendCookieToSchoolBridge(apiKey) {
  try {
    // Get cookie
    const cookieResult = await extractCookie();
    if (!cookieResult.success) {
      return cookieResult;
    }

    // Get server URL from storage
    const { serverUrl } = await chrome.storage.sync.get("serverUrl");
    const baseUrl = serverUrl || "https://schoolbridge-bice.vercel.app";

    // Send to SchoolBridge extension endpoint
    const response = await fetch(
      `${baseUrl}/api/auth/classdojo/extension`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionCookie: cookieResult.cookie,
          apiKey: apiKey,
        }),
      },
    );

    const data = await response.json();
    return data;
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function checkStatus() {
  const cookieResult = await extractCookie();
  const { apiKey, serverUrl } = await chrome.storage.sync.get([
    "apiKey",
    "serverUrl",
  ]);
  return {
    hasClassDojoCookie: cookieResult.success,
    hasApiKey: !!apiKey,
    serverUrl: serverUrl || "https://schoolbridge-bice.vercel.app",
  };
}
