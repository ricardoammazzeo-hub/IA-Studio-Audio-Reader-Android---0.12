// Background Service Worker for Chrome & Microsoft Edge Extension (Manifest V3)

chrome.runtime.onInstalled.addListener(() => {
  // Create Context Menus for right-click interactions
  chrome.contextMenus.create({
    id: "open-audiobook-window",
    title: "📖 Abrir Audiobook & Leitor Universal (Janela Completa)",
    contexts: ["page", "action"]
  });

  chrome.contextMenus.create({
    id: "read-selection-audiobook",
    title: "🎙️ Ouvir texto selecionado no Audiobook",
    contexts: ["selection"]
  });
});

// Function to extract text from page including translated DOM text
async function getPageSelection(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => window.getSelection()?.toString() || ""
    });
    return results?.[0]?.result || "";
  } catch (e) {
    return "";
  }
}

// Open app in a dedicated standalone window with generous resolution
function openDedicatedAppWindow() {
  chrome.windows.create({
    url: "index.html",
    type: "popup",
    width: 1280,
    height: 850,
    focused: true
  });
}

// Handle Context Menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "read-selection-audiobook") {
    let capturedText = info.selectionText || "";
    if (tab?.id) {
      const liveText = await getPageSelection(tab.id);
      if (liveText) {
        capturedText = liveText;
      }
    }

    if (capturedText) {
      // Store selected text into local storage for the reader to load
      await chrome.storage.local.set({
        importedText: {
          title: tab?.title ? `Seleção: ${tab.title}` : "Texto Selecionado",
          text: capturedText,
          timestamp: Date.now()
        }
      });
      openDedicatedAppWindow();
    }
  } else if (info.menuItemId === "open-audiobook-window") {
    openDedicatedAppWindow();
  }
});

// Extension toolbar icon click handler: Open naturally in standalone window
chrome.action?.onClicked?.addListener((tab) => {
  openDedicatedAppWindow();
});
