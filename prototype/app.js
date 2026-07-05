/*
 * mood-me · prototype app
 * ------------------------------------------------------------------
 * 순수 바닐라 JS 상태머신. 프레임워크·빌드·API 키 없이 전체 여정을 시연한다.
 * 실제 서비스에서 이 흐름은 Next.js 라우트 + Supabase + Claude + fal.ai로 구현된다.
 */
(() => {
  "use strict";
  const { IMG, AXES, PHOTOS, QUESTIONS, GEN_MESSAGES, PROFILES, FALLBACK_PROFILE, STICKERS } = window.MOODME;

  /* --- tiny helpers ---------------------------------------------------- */
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const slot = (name, root = document) => root.querySelector(`[data-slot="${name}"]`);
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
  const icon = (id, cls = "i") => `<svg class="${cls}" aria-hidden="true"><use href="#${id}"/></svg>`;
  const prefersReduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 편집/결과 보드가 공유하는 6타일 콜라주 레이아웃 (3×4 그리드, 빈틈·겹침 없음)
  const BOARD_LAYOUT = [
    { c: 1, r: 1, cs: 2, rs: 2 },
    { c: 3, r: 1, cs: 1, rs: 1 },
    { c: 3, r: 2, cs: 1, rs: 2 },
    { c: 1, r: 3, cs: 1, rs: 2 },
    { c: 2, r: 3, cs: 1, rs: 1 },
    { c: 2, r: 4, cs: 2, rs: 1 },
  ];
  const ACCENT_HEX = "#f1b267";
  const BOARD_BG = "#2b3340";

  /* --- state ----------------------------------------------------------- */
  const state = {
    account: null,             // "kakao" | "guest"
    qIndex: 0,
    answers: {},               // qid -> { selected:[keys], text }
    previewPhotos: [],         // 질문별 대표 사진 키 (프리뷰 채우기)
    boardPhotos: [],           // 최종 보드 6장
    elements: [],              // 편집 요소 {id,type,payload,x,y}
    activeTool: "move",
    profile: null,
    moodValues: null,
    genTimer: null,
  };
  let elSeq = 0;

  /* --- screen router --------------------------------------------------- */
  const SCREENS = ["login", "main", "test", "generating", "edit", "result"];
  function go(name) {
    SCREENS.forEach((s) => {
      const el = $(`#screen-${s}`);
      const active = s === name;
      el.dataset.active = String(active);
      el.hidden = !active;
    });
    const active = $(`#screen-${name}`);
    active.scrollTop = 0;
    const scroll = slot("result-board") ? active.querySelector(".result-scroll") : null;
    if (scroll) scroll.scrollTop = 0;
    // 접근성: 화면 전환 시 제목으로 포커스 이동
    const heading = active.querySelector("h1, h2, [id]");
    if (heading && name !== "test") {
      heading.setAttribute("tabindex", "-1");
      requestAnimationFrame(() => heading.focus({ preventScroll: true }));
    }
  }

  /* --- toast ----------------------------------------------------------- */
  function toast(msg, kind = "ok") {
    const host = $("#toasts");
    const t = document.createElement("div");
    t.className = "toast" + (kind === "error" ? " toast--error" : "");
    t.innerHTML = `${icon(kind === "error" ? "i-close" : "i-check")}<span>${msg}</span>`;
    host.appendChild(t);
    setTimeout(() => {
      t.classList.add("out");
      t.addEventListener("animationend", () => t.remove(), { once: true });
    }, 2600);
  }

  /* --- mood math ------------------------------------------------------- */
  function addMood(target, mood) {
    if (!mood) return;
    for (const k in mood) target[k] = (target[k] || 0) + mood[k];
  }
  function moodOfOption(q, key) {
    const opt = q.options.find((o) => o.key === key);
    if (!opt) return null;
    return opt.photo ? PHOTOS[opt.photo].mood : opt.mood;
  }
  function computeMood() {
    const totals = Object.fromEntries(AXES.map((a) => [a.key, 0]));
    QUESTIONS.forEach((q) => {
      const ans = state.answers[q.id];
      if (!ans) return;
      ans.selected.forEach((key) => addMood(totals, moodOfOption(q, key)));
    });
    const max = Math.max(1, ...Object.values(totals));
    // 0.12 바닥값으로 레이더가 완전히 찌그러지지 않게
    const norm = Object.fromEntries(AXES.map((a) => [a.key, clamp(totals[a.key] / max, 0.12, 1)]));
    // 우세한 두 축
    const ranked = [...AXES].sort((a, b) => totals[b.key] - totals[a.key]).map((a) => a.key);
    const top2 = new Set([ranked[0], ranked[1]]);
    let profile =
      PROFILES.find((p) => p.keys.every((k) => top2.has(k))) || FALLBACK_PROFILE;
    return { totals, norm, profile };
  }
  function bestPhotoForMood(mood) {
    let best = null, bestScore = -1;
    for (const key in PHOTOS) {
      let s = 0;
      for (const k in mood) s += (PHOTOS[key].mood[k] || 0) * mood[k];
      if (s > bestScore) { bestScore = s; best = key; }
    }
    return best;
  }

  /* ==================================================================== */
  /* LOGIN                                                                */
  /* ==================================================================== */
  function enter(account) {
    state.account = account;
    slot("account").textContent = account === "kakao" ? "혜경 님" : "게스트로 둘러보는 중";
    renderGallery();
    go("main");
  }
  $('[data-action="login-kakao"]').addEventListener("click", () => {
    toast("카카오 계정으로 시작했어요");
    enter("kakao");
  });
  $('[data-action="login-guest"]').addEventListener("click", () => enter("guest"));

  /* ==================================================================== */
  /* MAIN                                                                 */
  /* ==================================================================== */
  const GALLERY = [
    { photo: "fog_road",  cap: "고요한 몽상가" },
    { photo: "field",     cap: "다정한 산책자" },
    { photo: "neon",      cap: "빛을 모으는 사람" },
    { photo: "clouds",    cap: "은은한 수집가" },
    { photo: "forest_ray",cap: "잔잔한 관찰자" },
    { photo: "film",      cap: "필름 무드" },
  ];
  function renderGallery() {
    const g = slot("gallery");
    g.innerHTML = GALLERY.map((it) => {
      const p = PHOTOS[it.photo];
      return `<figure>
        <img src="${IMG(p.id, 500)}" alt="${p.alt}" loading="lazy" decoding="async">
        <figcaption>${it.cap}</figcaption>
      </figure>`;
    }).join("");
  }
  $('[data-action="start-test"]').addEventListener("click", startTest);

  /* ==================================================================== */
  /* TEST                                                                 */
  /* ==================================================================== */
  function startTest() {
    state.qIndex = 0;
    state.answers = {};
    state.previewPhotos = [];
    renderPreview();
    renderQuestion();
    go("test");
  }

  function ensureAnswer(q) {
    if (!state.answers[q.id]) state.answers[q.id] = { selected: [], text: "" };
    return state.answers[q.id];
  }

  function renderQuestion() {
    const q = QUESTIONS[state.qIndex];
    const ans = ensureAnswer(q);

    // progress
    const pct = ((state.qIndex) / QUESTIONS.length) * 100;
    slot("test-progress").style.width = `${pct}%`;
    slot("test-count").textContent = `${state.qIndex + 1} / ${QUESTIONS.length}`;

    $("#q-title").textContent = q.title;
    slot("q-hint").textContent = q.hint;

    const host = slot("q-choices");
    if (q.type === "keyword") host.innerHTML = renderKeywordChoices(q, ans);
    else host.innerHTML = renderImageChoices(q, ans);

    wireChoices(q);
    updateMeta(q);
  }

  function renderImageChoices(q, ans) {
    const chips = q.options.map((o) => {
      const p = PHOTOS[o.photo];
      const on = ans.selected.includes(o.key);
      return `<button class="choice-img" type="button" role="button"
                data-key="${o.key}" aria-pressed="${on}" aria-label="${p.alt}${on ? ", 선택됨" : ""}">
        <img src="${IMG(p.id, 420)}" alt="" loading="lazy" decoding="async">
        <span class="choice-img__check">${icon("i-check")}</span>
      </button>`;
    }).join("");
    let extra = "";
    if (q.type === "image_text") {
      extra = `<div class="text-refine">
        <label for="refine-input">이 장면에 이름을 붙인다면?</label>
        <input class="field" id="refine-input" type="text" maxlength="24"
               placeholder="${q.placeholder}" value="${escapeAttr(ans.text)}">
      </div>`;
    }
    return `<div class="choices-img">${chips}</div>${extra}`;
  }

  function renderKeywordChoices(q, ans) {
    const chips = q.options.map((o) => {
      const on = ans.selected.includes(o.key);
      return `<button class="chip" type="button" data-key="${o.key}" aria-pressed="${on}">${o.label}</button>`;
    }).join("");
    return `<div class="choices-kw">${chips}</div>`;
  }

  function wireChoices(q) {
    const host = slot("q-choices");
    $$("[data-key]", host).forEach((btn) => {
      btn.addEventListener("click", () => toggleSelect(q, btn.dataset.key));
    });
    const input = $("#refine-input", host);
    if (input) {
      input.addEventListener("input", () => {
        ensureAnswer(q).text = input.value;
      });
    }
  }

  function toggleSelect(q, key) {
    const ans = ensureAnswer(q);
    const idx = ans.selected.indexOf(key);
    const single = q.maxSelect === 1;
    if (idx >= 0) {
      ans.selected.splice(idx, 1);
    } else {
      if (single) ans.selected = [key];
      else if (ans.selected.length >= q.maxSelect) {
        toast(`최대 ${q.maxSelect}개까지 고를 수 있어요`);
        return;
      } else ans.selected.push(key);
    }
    // reflect UI
    $$("[data-key]", slot("q-choices")).forEach((b) => {
      const on = ans.selected.includes(b.dataset.key);
      b.setAttribute("aria-pressed", String(on));
      if (b.classList.contains("choice-img")) {
        const p = PHOTOS[q.options.find((o) => o.key === b.dataset.key).photo];
        b.setAttribute("aria-label", p.alt + (on ? ", 선택됨" : ""));
      }
    });
    updateMeta(q);
  }

  function selectionValid(q) {
    const ans = state.answers[q.id];
    return ans && ans.selected.length >= q.minSelect;
  }
  function updateMeta(q) {
    const ans = ensureAnswer(q);
    const meta = slot("q-meta");
    const n = ans.selected.length;
    if (n < q.minSelect) {
      meta.textContent = q.minSelect > 1 ? `${q.minSelect}개 이상 골라주세요 (${n}/${q.minSelect})` : "하나 이상 골라주세요";
      meta.style.color = "var(--muted)";
    } else {
      meta.textContent = `${n}개 선택됨`;
      meta.style.color = "var(--accent)";
    }
    $('[data-action="test-next"]').disabled = !selectionValid(q);
  }

  function escapeAttr(s) { return String(s).replace(/"/g, "&quot;"); }

  // 프리뷰: 질문마다 대표 사진 한 장으로 무드보드가 "채워진다"
  function representativePhoto(q) {
    const ans = state.answers[q.id];
    if (!ans || !ans.selected.length) return null;
    if (q.type === "keyword") {
      const mood = {};
      ans.selected.forEach((k) => addMood(mood, moodOfOption(q, k)));
      return bestPhotoForMood(mood);
    }
    const first = q.options.find((o) => o.key === ans.selected[0]);
    return first ? first.photo : null;
  }
  function renderPreview() {
    const host = slot("preview");
    host.innerHTML = QUESTIONS.map((_, i) => {
      const key = state.previewPhotos[i];
      if (key) {
        const p = PHOTOS[key];
        return `<span class="pslot filled"><img src="${IMG(p.id, 160)}" alt="" decoding="async"></span>`;
      }
      return `<span class="pslot pslot-empty"></span>`;
    }).join("");
  }

  $('[data-action="test-next"]').addEventListener("click", () => {
    const q = QUESTIONS[state.qIndex];
    if (!selectionValid(q)) return;
    state.previewPhotos[state.qIndex] = representativePhoto(q);
    renderPreview();

    if (state.qIndex < QUESTIONS.length - 1) {
      state.qIndex++;
      renderQuestion();
    } else {
      slot("test-progress").style.width = "100%";
      startGenerating();
    }
  });

  $('[data-action="test-back"]').addEventListener("click", () => {
    if (state.qIndex === 0) { go("main"); return; }
    state.qIndex--;
    renderQuestion();
  });

  /* ==================================================================== */
  /* GENERATING                                                           */
  /* ==================================================================== */
  function collectBoardPhotos() {
    const picks = [];
    const push = (k) => { if (k && !picks.includes(k)) picks.push(k); };
    QUESTIONS.forEach((q) => {
      const ans = state.answers[q.id];
      if (!ans) return;
      if (q.type === "keyword") push(representativePhoto(q));
      else ans.selected.forEach((key) => {
        const opt = q.options.find((o) => o.key === key);
        if (opt) push(opt.photo);
      });
    });
    // pad to 6 with curated, aesthetically-broad fallbacks
    const pad = ["fog_layers", "clouds", "forest_ray", "film", "lake", "stars", "cozy", "neon"];
    for (const k of pad) { if (picks.length >= 6) break; push(k); }
    return picks.slice(0, 6);
  }

  function startGenerating() {
    state.boardPhotos = collectBoardPhotos();
    go("generating");

    // 보드 타일이 하나씩 채워지는 애니메이션
    const board = slot("gen-board");
    board.innerHTML = state.boardPhotos.map((k) => {
      const p = PHOTOS[k];
      return `<div class="gen-tile"><img src="${IMG(p.id, 320)}" alt="" decoding="async"></div>`;
    }).join("");
    const tiles = $$(".gen-tile", board);
    const reduced = prefersReduced();
    tiles.forEach((t, i) => {
      setTimeout(() => t.classList.add("in"), reduced ? 0 : 250 + i * 420);
    });

    // 프로그레스 + 로테이션 메시지
    const fill = slot("gen-progress");
    const percentEl = slot("gen-percent");
    const statusEl = slot("gen-status");
    let pct = 0, msgI = 0;
    fill.style.width = "0%";
    percentEl.textContent = "0%";
    statusEl.textContent = GEN_MESSAGES[0];

    clearInterval(state.genTimer);
    const total = reduced ? 600 : 3600;
    const start = performance.now();
    state.genTimer = setInterval(() => {
      const elapsed = performance.now() - start;
      pct = clamp(Math.round((elapsed / total) * 100), 0, 100);
      fill.style.width = pct + "%";
      percentEl.textContent = pct + "%";
      const wantMsg = Math.min(GEN_MESSAGES.length - 1, Math.floor((pct / 100) * GEN_MESSAGES.length));
      if (wantMsg !== msgI) {
        msgI = wantMsg;
        statusEl.textContent = GEN_MESSAGES[msgI];
        statusEl.classList.remove("swap"); void statusEl.offsetWidth; statusEl.classList.add("swap");
      }
      if (pct >= 100) {
        clearInterval(state.genTimer);
        setTimeout(buildEditor, reduced ? 100 : 520);
      }
    }, 60);
  }

  // 생성 실패 → 재시도 (엣지 케이스). 프로토타입에선 재시도 시 정상 생성.
  slot("modal").addEventListener("click", (e) => {
    if (e.target === slot("modal")) closeModal();
  });
  $('[data-action="retry-generate"]').addEventListener("click", () => {
    closeModal();
    startGenerating();
  });
  function closeModal() { slot("modal").dataset.open = "false"; }

  /* ==================================================================== */
  /* EDIT                                                                 */
  /* ==================================================================== */
  function tileStyle(l) {
    return `grid-column:${l.c}/span ${l.cs};grid-row:${l.r}/span ${l.rs}`;
  }
  function renderBoardGrid(gridEl) {
    gridEl.style.gridTemplateColumns = "repeat(3,1fr)";
    gridEl.style.gridTemplateRows = "repeat(4,1fr)";
    gridEl.innerHTML = state.boardPhotos.map((k, i) => {
      const p = PHOTOS[k];
      const l = BOARD_LAYOUT[i] || { c: 1, r: 1, cs: 1, rs: 1 };
      return `<div class="board__tile" style="${tileStyle(l)}">
        <img src="${IMG(p.id, 640)}" alt="${p.alt}" crossorigin="anonymous" decoding="async">
      </div>`;
    }).join("");
  }

  function buildEditor() {
    renderBoardGrid(slot("edit-grid"));
    state.elements = [];
    elSeq = 0;
    setTool("move");
    renderStickerTray();
    // 시작 힌트: 사용자가 붙인 한 컷 텍스트가 있으면 자동으로 얹어준다
    const textAns = QUESTIONS.find((q) => q.type === "image_text");
    const t = textAns && state.answers[textAns.id] && state.answers[textAns.id].text.trim();
    if (t) addElement({ type: "text", payload: t, x: 0.5, y: 0.86 });
    go("edit");
  }

  function renderStickerTray() {
    const grid = slot("sticker-grid");
    grid.innerHTML = STICKERS.map((s) =>
      `<button class="tray__item" type="button" data-sticker="${s.key}" aria-label="${s.label} 스티커 추가">${stickerSVG(s.key)}</button>`
    ).join("");
    $$("[data-sticker]", grid).forEach((b) => b.addEventListener("click", () => {
      addElement({ type: "sticker", payload: b.dataset.sticker, x: 0.5, y: 0.4 });
      closeTray();
    }));
  }

  const tools = $$(".tool");
  tools.forEach((t) => t.addEventListener("click", () => onTool(t.dataset.tool)));
  function onTool(tool) {
    if (tool === "sticker") { setTool("sticker"); toggleTray(); return; }
    closeTray();
    if (tool === "text") {
      setTool("text");
      const txt = prompt("어떤 글자를 넣을까요?", "나의 무드");
      setTool("move");
      if (txt && txt.trim()) addElement({ type: "text", payload: txt.trim(), x: 0.5, y: 0.5 });
      return;
    }
    if (tool === "pen") {
      // 펜은 실제 서비스에서 자유 드로잉. 프로토타입에선 안내.
      setTool("move");
      toast("펜 드로잉은 실제 앱에서 제공돼요");
      return;
    }
    setTool("move");
  }
  function setTool(tool) {
    state.activeTool = tool;
    tools.forEach((t) => t.setAttribute("aria-pressed", String(t.dataset.tool === tool)));
  }
  function toggleTray() {
    const tray = slot("sticker-tray");
    tray.dataset.open = tray.dataset.open === "true" ? "false" : "true";
  }
  function closeTray() {
    slot("sticker-tray").dataset.open = "false";
    if (state.activeTool === "sticker") setTool("move");
  }
  document.addEventListener("click", (e) => {
    const tray = slot("sticker-tray");
    if (tray && tray.dataset.open === "true" &&
        !tray.contains(e.target) && !e.target.closest('[data-tool="sticker"]')) closeTray();
  });

  function stickerSVG(key) {
    const s = 'stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"';
    const paths = {
      spark: `<path ${s} d="M12 2v6M12 16v6M2 12h6M16 12h6M5 5l3 3M16 16l3 3M19 5l-3 3M8 16l-3 3"/>`,
      star:  `<path ${s} d="M12 3l2.6 6.3L21 10l-5 4.2L17.4 21 12 17.3 6.6 21 8 14.2 3 10l6.4-.7z"/>`,
      moon:  `<path ${s} d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>`,
      sun:   `<circle ${s} cx="12" cy="12" r="4"/><path ${s} d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>`,
      wave:  `<path ${s} d="M2 12c2.5-4 5.5-4 8 0s5.5 4 8 0M2 17c2.5-4 5.5-4 8 0s5.5 4 8 0"/>`,
      arch:  `<path ${s} d="M4 21V11a8 8 0 0 1 16 0v10"/><path ${s} d="M4 21h16"/>`,
      heart: `<path ${s} d="M12 20s-7-4.5-9.5-9A5 5 0 0 1 12 6a5 5 0 0 1 9.5 5c-2.5 4.5-9.5 9-9.5 9z"/>`,
      quote: `<path ${s} d="M7 7H4v6h3l-1 4M17 7h-3v6h3l-1 4"/>`,
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[key] || paths.star}</svg>`;
  }

  function addElement({ type, payload, x, y }) {
    const board = slot("edit-board");
    const id = ++elSeq;
    const rec = { id, type, payload, x, y };
    state.elements.push(rec);
    const el = document.createElement("div");
    el.className = `el el--${type}`;
    el.dataset.id = String(id);
    if (type === "text") el.textContent = payload;
    else el.innerHTML = stickerSVG(payload);
    el.insertAdjacentHTML("beforeend", `<button class="el__del" type="button" aria-label="삭제">${icon("i-close")}</button>`);
    board.appendChild(el);
    placeElement(el, x, y);
    makeDraggable(el, rec);
    el.querySelector(".el__del").addEventListener("click", (e) => {
      e.stopPropagation();
      state.elements = state.elements.filter((r) => r.id !== id);
      el.remove();
    });
    selectElement(el);
    return el;
  }

  function placeElement(el, x, y) {
    el.style.left = x * 100 + "%";
    el.style.top = y * 100 + "%";
    el.style.transform = "translate(-50%, -50%)";
  }

  function selectElement(el) {
    $$(".el.selected", slot("edit-board")).forEach((e) => e.classList.remove("selected"));
    if (el) el.classList.add("selected");
  }

  function makeDraggable(el, rec) {
    let startX, startY, baseX, baseY, w, h, dragging = false;
    const onDown = (e) => {
      if (e.target.closest(".el__del")) return;
      e.preventDefault();
      selectElement(el);
      const board = slot("edit-board").getBoundingClientRect();
      w = board.width; h = board.height;
      const pt = point(e);
      startX = pt.x; startY = pt.y;
      baseX = rec.x; baseY = rec.y;
      dragging = true;
      el.classList.add("dragging");
      el.setPointerCapture?.(e.pointerId);
    };
    const onMove = (e) => {
      if (!dragging) return;
      const pt = point(e);
      rec.x = clamp(baseX + (pt.x - startX) / w, 0.04, 0.96);
      rec.y = clamp(baseY + (pt.y - startY) / h, 0.04, 0.96);
      placeElement(el, rec.x, rec.y);
    };
    const onUp = (e) => { dragging = false; el.classList.remove("dragging"); el.releasePointerCapture?.(e.pointerId); };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("click", (e) => { e.stopPropagation(); selectElement(el); });
  }
  function point(e) { return { x: e.clientX, y: e.clientY }; }

  // 빈 캔버스 클릭 → 선택 해제
  slot("edit-board").addEventListener("pointerdown", (e) => {
    if (e.target === slot("edit-board") || e.target.closest(".board__grid") === e.target)
      selectElement(null);
  });

  $('[data-action="edit-back"]').addEventListener("click", () => go("generating") || startGenerating());
  $('[data-action="save-board"]').addEventListener("click", () => {
    selectElement(null);
    toast(state.account === "guest" ? "임시 저장했어요 (게스트)" : "무드보드를 저장했어요");
    buildResult();
  });

  /* ==================================================================== */
  /* RESULT                                                               */
  /* ==================================================================== */
  function buildResult() {
    renderBoardGrid(slot("result-grid"));
    // 편집 요소를 결과 보드에 그대로 얹기 (비율 좌표 재사용)
    const rboard = slot("result-board");
    $$(".el", rboard).forEach((e) => e.remove());
    state.elements.forEach((rec) => {
      const el = document.createElement("div");
      el.className = `el el--${rec.type}`;
      el.style.pointerEvents = "none";
      if (rec.type === "text") el.textContent = rec.payload;
      else el.innerHTML = stickerSVG(rec.payload);
      rboard.appendChild(el);
      placeElement(el, rec.x, rec.y);
    });

    const { norm, profile } = computeMood();
    state.profile = profile; state.moodValues = norm;
    slot("profile-name").textContent = profile.name;
    slot("profile-en").textContent = profile.en;
    slot("profile-desc").textContent = profile.desc;
    slot("result-board").setAttribute("aria-label", `${profile.name} 무드보드`);

    renderRadar(norm);
    slot("guest-banner").hidden = state.account !== "guest";
    go("result");
  }

  function renderRadar(values) {
    const size = 260, cx = size / 2, cy = size / 2 + 6, R = 92;
    const n = AXES.length;
    const angle = (i) => (-90 + (360 / n) * i) * (Math.PI / 180);
    const pt = (i, r) => [cx + Math.cos(angle(i)) * r, cy + Math.sin(angle(i)) * r];

    let rings = "";
    [0.34, 0.67, 1].forEach((f) => {
      const pts = AXES.map((_, i) => pt(i, R * f).map((v) => v.toFixed(1)).join(",")).join(" ");
      rings += `<polygon class="ring" points="${pts}"/>`;
    });
    let axesLines = "", labels = "";
    AXES.forEach((a, i) => {
      const [x, y] = pt(i, R);
      axesLines += `<line class="axis-line" x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`;
      const [lx, ly] = pt(i, R + 20);
      const anchor = Math.abs(lx - cx) < 6 ? "middle" : lx > cx ? "start" : "end";
      labels += `<text class="axis-label" x="${lx.toFixed(1)}" y="${(ly + 4).toFixed(1)}" text-anchor="${anchor}">${a.label}</text>`;
    });
    const shapePts = AXES.map((a, i) => pt(i, R * values[a.key]).map((v) => v.toFixed(1)).join(",")).join(" ");
    const dots = AXES.map((a, i) => { const [x, y] = pt(i, R * values[a.key]); return `<circle class="dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5"/>`; }).join("");

    slot("radar").innerHTML =
      `<svg class="radar" viewBox="0 0 ${size} ${size + 12}" role="img" aria-label="다섯 축의 무드 성향 그래프: ${AXES.map((a) => `${a.label} ${Math.round(values[a.key] * 100)}퍼센트`).join(", ")}">
        ${rings}${axesLines}
        <polygon class="shape" points="${shapePts}"/>
        ${dots}${labels}
      </svg>`;
  }

  /* --- share / export -------------------------------------------------- */
  $('[data-action="share-link"]').addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(location.href); toast("링크를 복사했어요"); }
    catch { toast("링크 복사에 실패했어요. 주소창을 이용해 주세요", "error"); }
  });
  $('[data-action="share-kakao"]').addEventListener("click", () => toast("카카오톡 공유는 실제 앱에서 연결돼요"));
  $('[data-action="share-native"]').addEventListener("click", async () => {
    const blob = await renderBlob().catch(() => null);
    if (blob && navigator.canShare && navigator.canShare({ files: [new File([blob], "moodme.png", { type: "image/png" })] })) {
      try {
        await navigator.share({ files: [new File([blob], "moodme.png", { type: "image/png" })], title: "나의 무드보드" });
        return;
      } catch { /* 취소됨 */ return; }
    }
    toast("이 브라우저에선 '내보내기'로 저장해 주세요");
  });
  $('[data-action="export-png"]').addEventListener("click", async () => {
    const btn = $('[data-action="export-png"]');
    btn.disabled = true;
    try {
      const blob = await renderBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `mood-me_${(state.profile?.en || "board").replace(/\s+/g, "-").toLowerCase()}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast("이미지를 저장했어요");
    } catch (err) {
      console.error(err);
      toast("내보내기에 실패했어요. 다시 시도해 주세요", "error");
    } finally { btn.disabled = false; }
  });

  $('[data-action="result-edit"]').addEventListener("click", () => go("edit"));
  $('[data-action="restart"]').addEventListener("click", startTest);

  // DOM 지오메트리를 캔버스로 옮겨 실제 PNG를 만든다 (스티커·텍스트 포함)
  async function renderBlob() {
    await (document.fonts?.ready || Promise.resolve());
    const board = slot("result-board");
    const brect = board.getBoundingClientRect();
    const target = 1080;
    const scale = target / brect.width;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(brect.width * scale);
    canvas.height = Math.round(brect.height * scale);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = BOARD_BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // tiles
    for (const tile of $$(".board__tile img", board)) {
      const r = tile.getBoundingClientRect();
      const dx = (r.left - brect.left) * scale, dy = (r.top - brect.top) * scale;
      const dw = r.width * scale, dh = r.height * scale;
      await drawCover(ctx, tile, dx, dy, dw, dh);
    }
    // elements
    for (const el of $$(".el", board)) {
      const r = el.getBoundingClientRect();
      const cx = (r.left - brect.left + r.width / 2) * scale;
      const cy = (r.top - brect.top + r.height / 2) * scale;
      if (el.classList.contains("el--text")) {
        const fs = parseFloat(getComputedStyle(el).fontSize) * scale;
        ctx.font = `700 ${fs}px "Gowun Batang", serif`;
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.shadowColor = "rgba(10,14,24,0.7)"; ctx.shadowBlur = 10 * scale; ctx.shadowOffsetY = 2 * scale;
        ctx.fillText(el.textContent, cx, cy);
        ctx.shadowColor = "transparent";
      } else {
        const img = await svgToImage(el.querySelector("svg"), r.width * scale, r.height * scale);
        ctx.drawImage(img, cx - (r.width * scale) / 2, cy - (r.height * scale) / 2, r.width * scale, r.height * scale);
      }
    }
    return await new Promise((res, rej) => canvas.toBlob((b) => b ? res(b) : rej(new Error("toBlob failed")), "image/png"));
  }

  function drawCover(ctx, img, dx, dy, dw, dh) {
    return new Promise((resolve) => {
      const draw = () => {
        const iw = img.naturalWidth, ih = img.naturalHeight;
        if (!iw || !ih) return resolve();
        const s = Math.max(dw / iw, dh / ih);
        const sw = dw / s, sh = dh / s;
        const sx = (iw - sw) / 2, sy = (ih - sh) / 2;
        try { ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh); } catch (_) {}
        resolve();
      };
      if (img.complete && img.naturalWidth) draw();
      else img.addEventListener("load", draw, { once: true }), img.addEventListener("error", () => resolve(), { once: true });
    });
  }

  function svgToImage(svg, w, h) {
    const clone = svg.cloneNode(true);
    clone.setAttribute("width", w); clone.setAttribute("height", h);
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    // currentColor → accent
    clone.querySelectorAll("[stroke='currentColor']").forEach((n) => n.setAttribute("stroke", ACCENT_HEX));
    const str = new XMLSerializer().serializeToString(clone);
    const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(str);
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img); img.onerror = rej; img.src = url;
    });
  }

  /* --- boot ------------------------------------------------------------ */
  go("login");
})();
