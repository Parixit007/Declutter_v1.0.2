// background.js (manifest v3 service worker)

// Keyboard shortcut listener
chrome.commands.onCommand.addListener((command) => {
  if (command === "declutter-tabs") {
    declutterTabs();
  }
});

// Popup button listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "DECLUTTER_NOW") {
    declutterTabs().then((result) => sendResponse(result));
    return true; // async response
  }
});

async function declutterTabs() {
  // Get current-window tabs
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const tabsToClose = [];

  for (const tab of tabs) {
    // Basic safety filters
    if (tab.active) continue;      // don't close active tab
    if (tab.pinned) continue;      // don't close pinned tabs
    if (!tab.url) continue;        // skip tabs with no URL

    // QUICK new-tab detection (covers common variants)
    // Use startsWith to catch variants like chrome://newtab, chrome-search://local-ntp/...
    if (
      tab.url.startsWith("chrome://newtab") ||
      tab.url.startsWith("chrome://new-tab-page") ||
      tab.url.startsWith("chrome-search://") ||
      tab.url === "about:blank"
    ) {
      console.log("Declutter: closing new-tab page:", tab.url);
      tabsToClose.push(tab.id);
      continue;
    }

    // Quick direct match for the MOST common homepage URL (optional)
    // This is redundant with URL parsing below but keeps behavior consistent for exact matches.
    if (tab.url === "https://www.youtube.com/" || tab.url === "https://youtube.com/") {
      console.log("Declutter: direct match youtube root -> close", tab.url);
      tabsToClose.push(tab.id);
      continue;
    }

    // Try to parse URL; ignore invalid/internals
    let url;
    try {
      url = new URL(tab.url);
    } catch (e) {
      // internal / special URLs will throw; we've already handled common chrome:// variants above
      console.log("Declutter: skipping non-HTTP URL:", tab.url);
      continue;
    }

    const hostname = url.hostname;   // e.g. "www.youtube.com"
    const pathname = url.pathname;   // e.g. "/"
    const search = url.search;       // query string

    // OPTIONAL: Google home pages (BE CAREFUL: broad rule will close search too)
    // If you only want to close google's root pages (not search results), restrict pathname === "/"
    if (
      (hostname === "google.com" || hostname === "www.google.com" || hostname === "google.co.in" || hostname === "www.google.co.in")  &&
      pathname === "/"
    ) {
      console.log("Declutter: closing google root:", tab.url);
      tabsToClose.push(tab.id);
      continue;
    }

    // ---- YouTube: close ONLY the home page ----
    // Accept only the exact YouTube root (hostname www.youtube.com or youtube.com) with pathname === "/"
    // and ensure there's no video/search param present.
    if (hostname === "www.youtube.com" || hostname === "youtube.com") {
      const isRootPath = pathname === "/";
      const hasVideoParam = url.searchParams.has("v"); // watch?v=...
      const isWatchPath = pathname.startsWith("/watch");
      const isShorts = pathname.startsWith("/shorts");
      const isSearch = pathname.startsWith("/results");
      const isEmbed = pathname.startsWith("/embed");

      // Only close genuine home root and not if it has video/search params or any other path
      if (isRootPath && !hasVideoParam && !isWatchPath && !isShorts && !isSearch && !isEmbed) {
        console.log("Declutter: closing YouTube home:", tab.url, { hostname, pathname, search });
        tabsToClose.push(tab.id);
        continue;
      } else {
        // For debugging: log when we skip YT pages that are not home
        console.log("Declutter: skipping YouTube (not home):", tab.url, { isRootPath, hasVideoParam, isWatchPath, isShorts, isSearch, isEmbed });
      }
    }

    // Add other site-specific rules here if desired...
  } // end for loop

  // Remove collected tabs (if any)
  if (tabsToClose.length > 0) {
    try {
      console.log("Declutter: removing tabs:", tabsToClose);
      await chrome.tabs.remove(tabsToClose);
    } catch (err) {
      console.error("Declutter: error removing tabs:", err);
    }
  } else {
    console.log("Declutter: nothing to remove.");
  }

  return { closedCount: tabsToClose.length };
}
