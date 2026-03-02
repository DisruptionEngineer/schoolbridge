/**
 * Content script that runs on ClassDojo pages.
 * Detects login state and notifies the background service worker.
 */
(function detectLoginState() {
  // ClassDojo's logged-in parent view has /story in the URL hash
  const isLoggedIn =
    window.location.hash.includes("/story") ||
    window.location.hash.includes("/events") ||
    document.querySelector('[class*="parentNav"]') !== null;

  chrome.runtime.sendMessage({
    type: "CLASSDOJO_STATE",
    loggedIn: isLoggedIn,
    url: window.location.href,
  });
})();
