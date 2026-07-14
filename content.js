// Content script — roda na pagina do servidor no SUAP.
// Injeta um painel para listar e baixar as portarias em lote.
//
// Protocolo do SUAP (validado):
//   1) GET /documento_eletronico/imprimir_documento_pdf/{doc_id}/carta/
//        -> redireciona para /djtools/process/{uuid}/  (dispara geracao assincrona)
//   2) GET /djtools/process_progress/0/{uuid}/  -> "pct::mensagem::arquivo::url::erro"
//        (repetir ate 'mensagem' e 'arquivo' preenchidos e 'erro' vazio = pronto)
//   3) GET /djtools/process_progress/1/{uuid}/  -> o PDF de verdade (application/pdf)
//
// O content script faz (1) e (2) (fica vivo enquanto a pagina esta aberta) e
// entrega a URL do passo (3) ao service worker, que baixa via chrome.downloads.

(function () {
  "use strict";
  if (window.__spxLoaded) return;
  window.__spxLoaded = true;

  const CONCURRENCY = 3;
  const POLL_INTERVAL_MS = 1200;
  const GEN_TIMEOUT_MS = 90000; // portarias grandes podem demorar

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function getMatricula() {
    const m = location.pathname.match(/\/rh\/servidor\/(\d+)\//);
    return m ? m[1] : null;
  }

  function getServidorNome() {
    // titulo: "Fulano de Tal (1234567) - SUAP: ..."
    const t = (document.title || "").match(/^(.*?)\s*\((\d+)\)/);
    if (t) return `${t[1].trim()} (${t[2]})`;
    const mat = getMatricula();
    return mat ? mat : "servidor";
  }

  // ---- Coleta das portarias (atravessando a paginacao) ----

  function parseHtml(html) {
    return new DOMParser().parseFromString(html, "text/html");
  }

  function findPortariasTable(doc) {
    const tables = Array.from(doc.querySelectorAll("table"));
    return (
      tables.find((t) => {
        const hs = Array.from(t.querySelectorAll("th")).map((th) =>
          (th.textContent || "").trim().toLowerCase()
        );
        return hs.includes("documento") && hs.some((h) => h.includes("assinado"));
      }) || null
    );
  }

  function extractRows(doc, out) {
    const table = findPortariasTable(doc);
    if (!table) return;
    const links = Array.from(
      table.querySelectorAll('a[href*="/documento_eletronico/visualizar_documento/"]')
    );
    for (const a of links) {
      const text = (a.textContent || "").trim();
      const mm = text.match(/PORTARIA\s+(\d+)\/(\d+)/i);
      const mid = (a.getAttribute("href") || "").match(/visualizar_documento\/(\d+)/);
      if (mm && mid) {
        out.push({
          doc_id: mid[1],
          numero: mm[1],
          ano: mm[2],
          titulo: text,
          filename: `${mm[1]}-${mm[2]}.pdf`,
        });
      }
    }
  }

  function detectMaxPage(doc) {
    const nums = Array.from(doc.querySelectorAll('a[href*="tab=portarias"]')).map((a) => {
      const m = (a.getAttribute("href") || "").match(/[?&]page=(\d+)/);
      return m ? parseInt(m[1], 10) : 1;
    });
    return nums.length ? Math.max(1, ...nums) : 1;
  }

  async function fetchDoc(url) {
    const r = await fetch(url, { credentials: "include" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return parseHtml(await r.text());
  }

  async function gatherPortarias(matricula, onStatus) {
    const base = `/rh/servidor/${matricula}/?tab=portarias`;
    onStatus("Lendo pagina 1...");
    const doc1 = await fetchDoc(base);
    const maxPage = detectMaxPage(doc1);
    const all = [];
    extractRows(doc1, all);
    for (let p = 2; p <= maxPage; p++) {
      onStatus(`Lendo pagina ${p} de ${maxPage}...`);
      const doc = await fetchDoc(`/rh/servidor/${matricula}/?page=${p}&tab=portarias`);
      extractRows(doc, all);
    }
    // dedupe por doc_id
    const seen = new Set();
    const list = [];
    for (const it of all) {
      if (seen.has(it.doc_id)) continue;
      seen.add(it.doc_id);
      list.push(it);
    }
    return list;
  }

  // ---- Geracao/obtencao do PDF (passos 1 e 2) ----

  async function generatePdfUrl(docId) {
    const trig = await fetch(
      `/documento_eletronico/imprimir_documento_pdf/${docId}/carta/`,
      { credentials: "include", redirect: "follow" }
    );
    const m = (trig.url || "").match(/\/djtools\/process\/([0-9a-fA-F-]+)\//);
    if (!m) return { ok: false, reason: "sem-uuid" };
    const uuid = m[1];
    const deadline = Date.now() + GEN_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const data = await (
        await fetch(`/djtools/process_progress/0/${uuid}/`, { credentials: "include" })
      ).text();
      const tk = data.split("::");
      const message = (tk[1] || "").trim();
      const file = (tk[2] || "").trim();
      const error = (tk[4] || "").trim();
      if (error) return { ok: false, reason: "suap-erro" };
      if (message && file) {
        return { ok: true, url: `${location.origin}/djtools/process_progress/1/${uuid}/` };
      }
      await sleep(POLL_INTERVAL_MS);
    }
    return { ok: false, reason: "timeout" };
  }

  async function downloadOne(item, servidor) {
    const gen = await generatePdfUrl(item.doc_id);
    if (!gen.ok) {
      return { status: gen.reason === "timeout" ? "TIMEOUT" : "ERRO", detail: gen.reason };
    }
    try {
      const resp = await chrome.runtime.sendMessage({
        type: "DOWNLOAD_PDF",
        url: gen.url,
        filename: item.filename,
        servidor,
      });
      if (resp && resp.ok) return { status: "OK", detail: "" };
      return { status: "ERRO", detail: (resp && resp.reason) || "download" };
    } catch (e) {
      return { status: "ERRO", detail: String(e && e.message ? e.message : e) };
    }
  }

  async function runQueue(items, servidor, onEach) {
    let idx = 0;
    async function worker() {
      while (idx < items.length) {
        const i = idx++;
        const res = await downloadOne(items[i], servidor);
        onEach(i, res.status, res.detail);
      }
    }
    const workers = [];
    for (let w = 0; w < Math.min(CONCURRENCY, items.length); w++) workers.push(worker());
    await Promise.all(workers);
  }

  // ---- UI ----

  let state = { items: [], results: [], running: false };

  function el(tag, props, children) {
    const e = document.createElement(tag);
    if (props) Object.assign(e, props);
    if (children) for (const c of children) e.appendChild(c);
    return e;
  }

  function buildPanel() {
    const fab = el("button", { id: "spx-fab", textContent: "Baixar portarias" });

    const panel = el("div", { id: "spx-panel" });
    panel.innerHTML = `
      <div id="spx-header"><span>Portarias do servidor</span><button id="spx-close" title="Fechar">×</button></div>
      <div id="spx-toolbar">
        <label><input type="checkbox" id="spx-all"> Selecionar todas</label>
        <span id="spx-count">0 selecionadas</span>
      </div>
      <div id="spx-list"></div>
      <div id="spx-msg"></div>
      <div id="spx-footer">
        <button class="spx-btn" id="spx-download">Baixar selecionadas</button>
        <div id="spx-progress"><div></div></div>
        <button class="spx-btn secondary" id="spx-csv" style="display:none">Salvar log CSV</button>
      </div>`;

    document.body.appendChild(fab);
    document.body.appendChild(panel);

    fab.addEventListener("click", () => {
      panel.classList.toggle("spx-open");
      if (panel.classList.contains("spx-open") && state.items.length === 0 && !state.running) {
        loadList();
      }
    });
    panel.querySelector("#spx-close").addEventListener("click", () =>
      panel.classList.remove("spx-open")
    );
    panel.querySelector("#spx-all").addEventListener("change", (ev) => {
      panel
        .querySelectorAll(".spx-cb")
        .forEach((cb) => (cb.checked = ev.target.checked));
      updateCount();
    });
    panel.querySelector("#spx-download").addEventListener("click", startDownload);
    panel.querySelector("#spx-csv").addEventListener("click", saveCsv);

    return panel;
  }

  function setMsg(t) {
    const m = document.getElementById("spx-msg");
    if (m) m.textContent = t || "";
  }

  function updateCount() {
    const sel = document.querySelectorAll(".spx-cb:checked").length;
    const c = document.getElementById("spx-count");
    if (c) c.textContent = `${sel} selecionada${sel === 1 ? "" : "s"}`;
  }

  function renderList() {
    const list = document.getElementById("spx-list");
    list.innerHTML = "";
    state.items.forEach((it, i) => {
      const row = el("div", { className: "spx-row" });
      row.innerHTML = `
        <input type="checkbox" class="spx-cb" data-i="${i}" checked>
        <span class="spx-name" title="${it.titulo.replace(/"/g, "&quot;")}">${it.numero}/${it.ano}</span>
        <span class="spx-status" id="spx-st-${i}"></span>`;
      list.appendChild(row);
    });
    list.querySelectorAll(".spx-cb").forEach((cb) =>
      cb.addEventListener("change", updateCount)
    );
    updateCount();
  }

  async function loadList() {
    const matricula = getMatricula();
    if (!matricula) {
      setMsg("Abra a pagina de um servidor (RH) para listar as portarias.");
      return;
    }
    setMsg("Buscando portarias...");
    try {
      state.items = await gatherPortarias(matricula, setMsg);
      if (state.items.length === 0) {
        setMsg("Nenhuma portaria encontrada para este servidor.");
        return;
      }
      renderList();
      setMsg(`${state.items.length} portarias encontradas.`);
    } catch (e) {
      setMsg("Erro ao buscar portarias: " + (e && e.message ? e.message : e));
    }
  }

  function setStatus(i, status) {
    const s = document.getElementById("spx-st-" + i);
    if (s) {
      s.textContent = status;
      s.className = "spx-status " + status;
    }
  }

  async function startDownload() {
    if (state.running) return;
    const selected = Array.from(document.querySelectorAll(".spx-cb:checked")).map((cb) =>
      parseInt(cb.dataset.i, 10)
    );
    if (selected.length === 0) {
      setMsg("Selecione ao menos uma portaria.");
      return;
    }
    state.running = true;
    state.results = [];
    const servidor = getServidorNome();
    const btn = document.getElementById("spx-download");
    btn.disabled = true;
    const prog = document.getElementById("spx-progress");
    prog.classList.add("spx-show");
    const bar = prog.firstElementChild;
    let done = 0;

    const queue = selected.map((i) => state.items[i]);
    const indexOfItem = new Map(queue.map((it, k) => [it, selected[k]]));

    await runQueue(queue, servidor, (k, status, detail) => {
      const globalIdx = selected[k];
      setStatus(globalIdx, status);
      const it = queue[k];
      state.results.push({
        numero: it.numero,
        ano: it.ano,
        doc_id: it.doc_id,
        titulo: it.titulo,
        arquivo: it.filename,
        status,
        detalhe: detail,
      });
      done++;
      bar.style.width = Math.round((done / queue.length) * 100) + "%";
      setMsg(`Baixando... ${done}/${queue.length}`);
    });

    const ok = state.results.filter((r) => r.status === "OK").length;
    setMsg(`Concluido: ${ok}/${queue.length} baixadas. Pasta: Downloads/Portarias SUAP/${servidor}`);
    document.getElementById("spx-csv").style.display = "";
    btn.disabled = false;
    state.running = false;
  }

  function saveCsv() {
    const rows = [["numero", "ano", "doc_id", "titulo", "arquivo", "status", "detalhe"]];
    for (const r of state.results) {
      rows.push([r.numero, r.ano, r.doc_id, r.titulo, r.arquivo, r.status, r.detalhe]);
    }
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = el("a", { href: url, download: "_log_download.csv" });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  buildPanel();
})();
