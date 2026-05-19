/* =========================================================
   FlexCover demo page — interactive behaviors
   - Auto-generates case cards (Sections 2 & 3) from data
   - Single horizontal row per case
   - Collapsible cases (first in each subsection expanded)
   - Lyrics expand/collapse
   - Active TOC highlight on scroll
   ========================================================= */

(function () {

  // --------------------------------------------------------
  // Data
  // --------------------------------------------------------
  const FULL_SYSTEMS = [
    { key: "flexcover", name: "FlexCover", ours: true  },
    { key: "suno",      name: "Suno v5.5",     ours: false },
    { key: "acestep",   name: "ACE-Step 1.5",  ours: false },
    { key: "songecho",  name: "SongEcho",      ours: false },
  ];

  const PARTIAL_SYSTEMS = [
    { key: "flexcover", name: "FlexCover", ours: true  },
    { key: "acestep",   name: "ACE-Step 1.5",  ours: false },
    { key: "songecho",  name: "SongEcho",      ours: false },
  ];

  // SAMPLES_DATA is injected by samples_data.js; fall back gracefully if absent.
  const DATA = window.SAMPLES_DATA || {};
  const PLACEHOLDER_LYRICS =
    "[Lyrics placeholder]\nLine 1 ...\nLine 2 ...\nLine 3 ...\nLine 4 ...\n" +
    "Line 5 ...\nLine 6 ...\nLine 7 ...\nLine 8 ...";
  const PLACEHOLDER_STYLE  = "[Style tag prompts placeholder]";

  function makeFullCase(idx, group) {
    // §2.1 (original-lyrics): idx 1..4 in DATA.fullOriginal, use entry.lyrics.
    // §2.2 (new-lyrics):     idx 5..8 in DATA.fullNew,      use entry.lyrics_new.
    let entry, lyricsText;
    if (group === "original") {
      entry = (DATA.fullOriginal || [])[idx - 1];
      lyricsText = entry ? entry.lyrics : PLACEHOLDER_LYRICS;
    } else {
      entry = (DATA.fullNew || [])[idx - 5];
      lyricsText = entry ? (entry.lyrics_new || entry.lyrics) : PLACEHOLDER_LYRICS;
    }
    return {
      idx, group,
      pending: !entry,
      lang:    entry ? entry.lang : null,
      title: group === "original" ? "Original lyrics + new style"
                                  : "New lyrics + new style",
      reference: `assets/audio/full/${group}/case${idx}/reference.mp3`,
      lyrics:    lyricsText,
      style:     entry ? entry.style : PLACEHOLDER_STYLE,
      outputs: FULL_SYSTEMS.reduce((a, s) => {
        a[s.key] = `assets/audio/full/${group}/case${idx}/${s.key}.mp3`;
        return a;
      }, {}),
    };
  }

  function makePartialCase(idx, config) {
    // Partial section indexing in SAMPLES_DATA:
    //   continuation: cases 1..2  -> indices 0..1
    //   outpainting:  cases 3..4  -> indices 0..1
    //   inpainting:   cases 5..6  -> indices 0..1
    let list, localIdx;
    if (config === "continuation") { list = DATA.continuation || []; localIdx = idx - 1; }
    else if (config === "outpainting") { list = DATA.outpainting  || []; localIdx = idx - 3; }
    else                                { list = DATA.inpainting   || []; localIdx = idx - 5; }
    const entry = list[localIdx];

    // Inpainting shows the *invisible* chunk (the first chorus the model must
    // generate); the other two configs show the *visible* hint.
    const partialFile = config === "inpainting" ? "invisible.mp3" : "visible.mp3";

    return {
      idx, config,
      lang:  entry ? entry.lang : null,
      title: config.charAt(0).toUpperCase() + config.slice(1),
      reference: `assets/audio/partial/${config}/case${idx}/reference.mp3`,
      visible:   `assets/audio/partial/${config}/case${idx}/${partialFile}`,
      lyrics: entry ? entry.lyrics : PLACEHOLDER_LYRICS,
      style:  entry ? entry.style  : PLACEHOLDER_STYLE,
      outputs: PARTIAL_SYSTEMS.reduce((a, s) => {
        a[s.key] = `assets/audio/partial/${config}/case${idx}/${s.key}.mp3`;
        return a;
      }, {}),
    };
  }

  const FULL_ORIGINAL = [1, 2, 3, 4].map(i => makeFullCase(i, "original"));
  const FULL_NEW      = [5, 6, 7, 8].map(i => makeFullCase(i, "new"));
  const PARTIAL_CONT  = [1, 2].map(i => makePartialCase(i, "continuation"));
  const PARTIAL_OUT   = [3, 4].map(i => makePartialCase(i, "outpainting"));
  const PARTIAL_IN    = [5, 6].map(i => makePartialCase(i, "inpainting"));

  // Populate intro section lyrics + style from SAMPLES_DATA.intro
  (function fillIntro() {
    const intro = DATA.intro;
    if (!intro) return;
    document.querySelectorAll("[data-intro-lyrics] .lyrics-text").forEach(node => {
      node.textContent = intro.lyrics;
    });
    document.querySelectorAll("[data-intro-new-lyrics] .lyrics-text").forEach(node => {
      node.textContent = intro.lyrics_new || intro.lyrics;
    });
    document.querySelectorAll("[data-intro-style]").forEach(node => {
      node.textContent = intro.style;
    });
  })();

  // --------------------------------------------------------
  // DOM helpers
  // --------------------------------------------------------
  function el(tag, opts = {}, children = []) {
    const node = document.createElement(tag);
    if (opts.cls)  node.className   = opts.cls;
    if (opts.text != null) node.textContent = opts.text;
    if (opts.html != null) node.innerHTML   = opts.html;
    if (opts.attrs) for (const k in opts.attrs) node.setAttribute(k, opts.attrs[k]);
    for (const c of children) if (c) node.appendChild(c);
    return node;
  }

  function lyricsBox(text) {
    const box = el("div", { cls: "lyrics-box collapsible" });
    box.appendChild(el("pre", { cls: "lyrics-text", text }));
    box.appendChild(el("button", {
      cls: "lyrics-toggle",
      text: "Expand",
      attrs: { type: "button" }
    }));
    return box;
  }

  function audioCell(label, src, ours) {
    const cell = el("div", { cls: ours ? "cell ours-cell" : "cell" });
    cell.appendChild(el("div", { cls: "cell-label", text: label }));
    cell.appendChild(el("audio", { attrs: { controls: "", preload: "none", src } }));
    return cell;
  }

  // ----- Case scaffold (header + collapsible body) -----
  function caseShell(c, expanded) {
    const card = el("div", { cls: "case-card" + (expanded ? " expanded" : "") });

    const header = el("button", {
      cls: "case-header",
      attrs: { type: "button", "aria-expanded": expanded ? "true" : "false" }
    });
    const meta = el("div", { cls: "case-meta" });
    meta.appendChild(el("span", { cls: "case-id",    text: `Case ${c.idx}` }));
    if (c.lang) {
      meta.appendChild(el("span", {
        cls: `lang-badge lang-${c.lang.toLowerCase()}`,
        text: c.lang,
        attrs: { title: c.lang === "ZH" ? "Chinese lyrics" : "English lyrics" }
      }));
    }
    meta.appendChild(el("span", { cls: "case-title", text: c.title }));
    header.appendChild(meta);
    header.appendChild(el("span", { cls: "case-hint", text: "Click to expand" }));
    header.appendChild(el("span", { cls: "case-toggle", text: "▾" }));
    card.appendChild(header);

    const body = el("div", { cls: "case-body" });
    card.appendChild(body);

    return { card, body };
  }

  // ----- Full-cover case (7 panels in one row) -----
  function renderFullCase(c, expanded) {
    const { card, body } = caseShell(c, expanded);

    if (c.pending) {
      // §2.2 cases without samples yet — show a single placeholder cell
      // instead of broken audio players.
      const pend = el("div", { cls: "case-pending" });
      pend.appendChild(el("div", {
        cls: "case-pending-label",
        text: "Samples pending"
      }));
      pend.appendChild(el("div", {
        cls: "case-pending-note",
        text: "New-lyrics samples for this case have not been selected yet."
      }));
      body.appendChild(pend);
      return card;
    }

    const row = el("div", { cls: "case-row case-row-full" });

    const refCell = el("div", { cls: "cell" });
    refCell.appendChild(el("div", { cls: "cell-label", text: "Reference Music" }));
    refCell.appendChild(el("audio", { attrs: { controls: "", preload: "none", src: c.reference } }));
    row.appendChild(refCell);

    const lyrCell = el("div", { cls: "cell" });
    lyrCell.appendChild(el("div", {
      cls: "cell-label",
      text: c.group === "original" ? "Reference Lyrics" : "Generation Lyrics"
    }));
    lyrCell.appendChild(lyricsBox(c.lyrics));
    row.appendChild(lyrCell);

    const styleCell = el("div", { cls: "cell" });
    styleCell.appendChild(el("div", { cls: "cell-label", text: "Style Prompt" }));
    styleCell.appendChild(el("div", { cls: "style-box", text: c.style }));
    row.appendChild(styleCell);

    for (const s of FULL_SYSTEMS) {
      row.appendChild(audioCell(s.name, c.outputs[s.key], s.ours));
    }

    body.appendChild(row);
    return card;
  }

  // ----- Partial-cover case (6 panels in one row) -----
  function renderPartialCase(c, expanded) {
    const { card, body } = caseShell(c, expanded);

    const row = el("div", { cls: "case-row case-row-partial" });

    // Reference + visible-part panel (stacked vertically inside the cell)
    const refCell = el("div", { cls: "cell" });
    refCell.appendChild(el("div", { cls: "cell-label", text: "Full Reference Music" }));
    refCell.appendChild(el("audio", { attrs: { controls: "", preload: "none", src: c.reference } }));

    const partial = el("div", { cls: "partial-panel" });
    // Inpainting shows the missing (invisible) chunk; the other two show the
    // visible hint that the model gets to condition on.
    const panelKind = c.config === "inpainting" ? "Invisible" : "Visible";
    partial.appendChild(el("div", {
      cls: "partial-panel-title",
      text: `Partial ${panelKind} — ${c.title}`
    }));
    let cfgDesc = "";
    if (c.config === "continuation") cfgDesc = "Visible: from start to first chorus.";
    else if (c.config === "outpainting") cfgDesc = "Visible: first chorus only.";
    else cfgDesc = "Invisible: first chorus only (the model must generate this part).";
    partial.appendChild(el("div", { cls: "partial-panel-config", text: cfgDesc }));
    partial.appendChild(el("audio", { attrs: { controls: "", preload: "none", src: c.visible } }));
    refCell.appendChild(partial);
    row.appendChild(refCell);

    // Lyrics
    const lyrCell = el("div", { cls: "cell" });
    lyrCell.appendChild(el("div", { cls: "cell-label", text: "Full Lyrics" }));
    lyrCell.appendChild(lyricsBox(c.lyrics));
    row.appendChild(lyrCell);

    // Style
    const styleCell = el("div", { cls: "cell" });
    styleCell.appendChild(el("div", { cls: "cell-label", text: "Style Prompt" }));
    styleCell.appendChild(el("div", { cls: "style-box", text: c.style }));
    row.appendChild(styleCell);

    // Outputs (3 systems, Suno excluded)
    for (const s of PARTIAL_SYSTEMS) {
      row.appendChild(audioCell(s.name, c.outputs[s.key], s.ours));
    }

    body.appendChild(row);
    return card;
  }

  // --------------------------------------------------------
  // Mount: first case in each subsection is expanded
  // --------------------------------------------------------
  function mount(containerId, cases, renderer) {
    const root = document.getElementById(containerId);
    if (!root) return;
    cases.forEach((c, i) => root.appendChild(renderer(c, i === 0)));
  }

  mount("full-cases-original",         FULL_ORIGINAL, renderFullCase);
  mount("full-cases-new",              FULL_NEW,      renderFullCase);
  mount("partial-cases-continuation",  PARTIAL_CONT,  renderPartialCase);
  mount("partial-cases-outpainting",   PARTIAL_OUT,   renderPartialCase);
  mount("partial-cases-inpainting",    PARTIAL_IN,    renderPartialCase);

  // --------------------------------------------------------
  // Click delegation: lyrics toggle + case header toggle
  // (case-header is a sibling of case-body, so clicks inside
  //  case-body never match .case-header and vice versa)
  // --------------------------------------------------------
  document.addEventListener("click", function (ev) {
    const lyrBtn = ev.target.closest(".lyrics-toggle");
    if (lyrBtn) {
      const box = lyrBtn.closest(".lyrics-box");
      if (box) {
        const open = box.classList.toggle("expanded");
        lyrBtn.textContent = open ? "Collapse" : "Expand";

        // 同一行里其他 .lyrics-box 跟着同步状态
        // (主要服务于 §1.1 同时展示 Original Lyrics + New Lyrics 的情形)
        const row = box.closest(".case-row");
        if (row) {
          row.querySelectorAll(".lyrics-box").forEach(other => {
            if (other === box) return;
            other.classList.toggle("expanded", open);
            const ob = other.querySelector(".lyrics-toggle");
            if (ob) ob.textContent = open ? "Collapse" : "Expand";
          });
        }
      }
      return;
    }

    const caseHeader = ev.target.closest(".case-header");
    if (caseHeader) {
      const card = caseHeader.closest(".case-card");
      if (card) {
        const expanded = card.classList.toggle("expanded");
        caseHeader.setAttribute("aria-expanded", expanded ? "true" : "false");
      }
    }
  });

  // --------------------------------------------------------
  // TOC active-link highlight
  // --------------------------------------------------------
  const tocLinks = document.querySelectorAll('#toc a[href^="#"]');
  const targets  = Array.from(tocLinks)
    .map(a => document.getElementById(a.getAttribute("href").slice(1)))
    .filter(Boolean);

  function updateActive() {
    const fromTop = window.scrollY + 140;
    let current = targets[0];
    for (const t of targets) if (t.offsetTop <= fromTop) current = t;
    tocLinks.forEach(a => {
      a.classList.toggle("active",
        current && a.getAttribute("href") === "#" + current.id);
    });
  }
  window.addEventListener("scroll", updateActive, { passive: true });
  window.addEventListener("load",   updateActive);
  updateActive();

})();
