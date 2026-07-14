// Service worker (MV3). Papel enxuto: recebe do content script uma URL de PDF
// JA PRONTA (o content script cuida do trigger + polling assincrono do SUAP,
// pois ele vive enquanto a pagina esta aberta, sem o limite de vida do SW) e
// dispara o download via chrome.downloads (usando os cookies do navegador),
// sem caixa "Salvar como". Responde quando o download conclui.

function sanitizeSegment(s) {
  return String(s).replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim();
}

function waitDownloadComplete(downloadId) {
  return new Promise((resolve) => {
    function onChanged(delta) {
      if (delta.id !== downloadId) return;
      if (delta.state && delta.state.current === "complete") {
        chrome.downloads.onChanged.removeListener(onChanged);
        resolve({ ok: true });
      } else if (delta.state && delta.state.current === "interrupted") {
        chrome.downloads.onChanged.removeListener(onChanged);
        resolve({ ok: false, reason: delta.error ? delta.error.current : "interrupted" });
      }
    }
    chrome.downloads.onChanged.addListener(onChanged);
  });
}

async function download(url, folder, filename) {
  const path = `${folder}/${sanitizeSegment(filename)}`;
  const downloadId = await chrome.downloads.download({
    url,
    filename: path,
    saveAs: false,
    conflictAction: "uniquify",
  });
  return waitDownloadComplete(downloadId);
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === "DOWNLOAD_PDF") {
    const folder = `Portarias SUAP/${sanitizeSegment(msg.servidor || "servidor")}`;
    download(msg.url, folder, msg.filename)
      .then((r) => sendResponse(r))
      .catch((e) => sendResponse({ ok: false, reason: String(e && e.message ? e.message : e) }));
    return true; // resposta assincrona
  }
  return false;
});
