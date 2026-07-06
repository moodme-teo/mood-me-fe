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
  const storage = {
    get(key) {
      try { return localStorage.getItem(key); } catch { return null; }
    },
    set(key, value) {
      try { localStorage.setItem(key, value); } catch {}
    },
  };

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
    account: null,             // "kakao" | "google" | "guest"
    saved: false,
    qIndex: 0,
    answers: {},               // qid -> { selected:[keys], text }
    testBoardItems: [],         // 테스트 중 보드에 안착한 오브젝트
    boardPhotos: [],           // 최종 보드 6장
    elements: [],              // 편집 요소 {id,type,payload,x,y}
    activeTool: "move",
    profile: null,
    moodValues: null,
    genTimer: null,
    savedBoards: [],           // History — 완성된 무드보드 기록
    currentBoardId: null,      // 편집 중인 보드(재저장 시 중복 방지)
    isPlacing: false,
    readyToGenerate: false,
  };
  let elSeq = 0;

  const TEST_PLACEMENTS = [
    { x: 7, y: 8, w: 35, h: 25, r: -3 },
    { x: 53, y: 11, w: 34, h: 18, r: 4 },
    { x: 16, y: 39, w: 31, h: 17, r: 2 },
    { x: 49, y: 44, w: 38, h: 24, r: -5 },
    { x: 17, y: 68, w: 55, h: 16, r: 3 },
  ];

  /* --- screen router --------------------------------------------------- */
  const BOARDS_KEY = "moodme.boards";
  const SCREENS = ["login", "home", "main", "test", "generating", "edit", "result"];
  function go(name) {
    SCREENS.forEach((s) => {
      const el = $(`#screen-${s}`);
      if (!el) return;
      const active = s === name;
      el.dataset.active = String(active);
      el.hidden = !active;
    });
    const active = $(`#screen-${name}`);
    if (!active) return;
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

  function persistBoards() {
    try { storage.set(BOARDS_KEY, JSON.stringify(state.savedBoards)); } catch {}
  }
  function loadBoards() {
    try {
      const raw = storage.get(BOARDS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      state.savedBoards = Array.isArray(parsed) ? parsed : [];
    } catch { state.savedBoards = []; }
  }
  // 저장된 보드가 있으면 History(home), 없으면 첫 진입(main)
  function routeHome() {
    renderHome();
    go(state.savedBoards.length ? "home" : "main");
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
  function isLoggedIn() { return state.account === "kakao" || state.account === "google"; }

  function enter(account) {
    state.account = account;
    renderAccount();
    renderGallery();
    routeHome();
  }
  $('[data-action="login-kakao"]').addEventListener("click", () => {
    toast("카카오 계정으로 시작했어요");
    enter("kakao");
  });
  $('[data-action="login-google"]').addEventListener("click", () => {
    toast("구글 계정으로 시작했어요");
    enter("google");
  });
  $('[data-action="login-guest"]').addEventListener("click", () => enter("guest"));
  $$('[data-action="account"]').forEach((el) => el.addEventListener("click", () => {
    // 로그인 상태면 로그아웃 메뉴, 아니면 로그인 화면으로.
    if (isLoggedIn()) { openAccountMenu(el); return; }
    go("login");
  }));

  function renderAccount() {
    const initial = state.account === "kakao" ? "혜" : state.account === "google" ? "G" : null;
    $$('[data-slot="account"]').forEach((accountEl) => {
      accountEl.innerHTML = initial || icon("i-user");
      accountEl.dataset.on = String(isLoggedIn());
      accountEl.setAttribute("aria-label", isLoggedIn() ? "계정 메뉴 열기" : "로그인하기");
      accountEl.setAttribute("aria-haspopup", isLoggedIn() ? "menu" : "false");
    });
  }

  // 로그인 상태에서 프로필(아바타)을 누르면 뜨는 계정 메뉴 (로그아웃).
  function openAccountMenu(anchor) {
    const menu = slot("acct-menu");
    if (!menu) return;
    const r = anchor.getBoundingClientRect();
    menu.style.top = `${r.bottom + 8}px`;
    menu.style.right = `${Math.max(8, window.innerWidth - r.right)}px`;
    menu.hidden = false;
    menu.dataset.open = "true";
    requestAnimationFrame(() => menu.querySelector(".acct-menu__item")?.focus());
  }
  function closeAccountMenu() {
    const menu = slot("acct-menu");
    if (!menu) return;
    menu.dataset.open = "false";
    menu.hidden = true;
  }
  $('[data-action="logout"]').addEventListener("click", () => {
    state.account = null;
    state.saved = false;
    renderAccount();
    closeAccountMenu();
    toast("로그아웃했어요");
    // 로그아웃 시 History가 아니라 초기 홈(메인)으로.
    go("main");
  });
  document.addEventListener("click", (e) => {
    const menu = slot("acct-menu");
    if (menu && menu.dataset.open === "true" &&
        !menu.contains(e.target) && !e.target.closest('[data-action="account"]')) {
      closeAccountMenu();
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAccountMenu();
  });

  /* ==================================================================== */
  /* MAIN                                                                 */
  /* ==================================================================== */
  const GALLERY = [
    { photos: ["fog_road", "clouds", "film", "lake"], cap: "고요한 몽상가" },
    { photos: ["field", "cozy", "forest_ray", "fog_layers"], cap: "다정한 산책자" },
    { photos: ["neon", "stars", "film", "clouds"], cap: "빛을 모으는 사람" },
    { photos: ["forest_ray", "lake", "field", "cozy"], cap: "잔잔한 관찰자" },
  ];
  function renderGallery() {
    const g = slot("gallery");
    g.innerHTML = GALLERY.map((it, boardIndex) => {
      const tiles = it.photos.map((key) => {
        const p = PHOTOS[key];
        return `<span class="mood-card__tile"><img src="${IMG(p.id, 360)}" alt="${p.alt}" loading="lazy" decoding="async"></span>`;
      }).join("");
      return `<figure class="mood-card mood-card--${boardIndex + 1}">
        <div class="mood-card__grid">${tiles}</div>
        <figcaption>${it.cap}</figcaption>
      </figure>`;
    }).join("");
  }
  $$('[data-action="start-test"]').forEach((b) => b.addEventListener("click", startTest));

  /* ==================================================================== */
  /* HOME · History (저장된 무드보드 목록)                                */
  /* ==================================================================== */
  function boardMini(photos) {
    return photos.slice(0, 6).map((key) => {
      const p = PHOTOS[key];
      if (!p) return "";
      return `<span class="mood-card__tile"><img src="${IMG(p.id, 300)}" alt="" loading="lazy" decoding="async"></span>`;
    }).join("");
  }
  function renderHome() {
    const host = slot("history-stack");
    if (!host) return;
    const boards = state.savedBoards;
    slot("history-count").textContent = boards.length ? `${boards.length}개의 무드보드를 모았어요` : "";
    host.innerHTML = boards.map((b, i) =>
      `<button class="hist-card" type="button" data-board="${i}" aria-label="${b.profileName} 무드보드 열기">
        <span class="hist-card__grid">${boardMini(b.photos)}</span>
        <figcaption>${b.profileName}</figcaption>
      </button>`
    ).join("");
    $$("[data-board]", host).forEach((btn) =>
      btn.addEventListener("click", () => openSavedBoard(Number(btn.dataset.board))));
  }
  function openSavedBoard(index) {
    const e = state.savedBoards[index];
    if (!e) return;
    state.boardPhotos = e.photos.slice();
    state.elements = e.elements.map((r) => ({ ...r, id: ++elSeq }));
    state.profile = { name: e.profileName, en: e.profileEn, desc: e.profileDesc };
    state.moodValues = e.moodValues;
    state.saved = !!e.saved;
    state.currentBoardId = e.id;
    renderResultView();
  }

  /* ==================================================================== */
  /* TEST                                                                 */
  /* ==================================================================== */
  function startTest() {
    state.qIndex = 0;
    state.answers = {};
    state.testBoardItems = [];
    state.isPlacing = false;
    state.readyToGenerate = false;
    state.saved = false;
    state.currentBoardId = null;   // 새 보드 시작
    renderTestBoard();
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
    const stage = slot("test-stage");
    if (stage) stage.dataset.phase = "card";
    state.isPlacing = false;
    state.readyToGenerate = false;

    // progress
    const pct = ((state.qIndex) / QUESTIONS.length) * 100;
    slot("test-progress").style.setProperty("--progress", pct / 100);
    slot("test-count").textContent = `${state.qIndex + 1} / ${QUESTIONS.length}`;
    slot("q-step").textContent = `step${state.qIndex + 1}`;

    $("#q-title").textContent = q.title;
    slot("q-hint").textContent = q.hint;

    const host = slot("q-choices");
    if (q.type === "keyword") host.innerHTML = renderKeywordChoices(q, ans);
    else host.innerHTML = renderImageChoices(q, ans);

    wireChoices(q);
    updateMeta(q);
  }

  function isLastQuestion() {
    return state.qIndex === QUESTIONS.length - 1;
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
    return `<div class="choices-img">${chips}</div>`;
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
      btn.addEventListener("click", () => {
        toggleSelect(q, btn.dataset.key);
      });
    });
  }

  function selectedChoiceKey(q) {
    const ans = ensureAnswer(q);
    return ans.selected[0] || q.options[0]?.key;
  }

  function keywordLabel(q, key) {
    return q.options.find((o) => o.key === key)?.label || key;
  }

  function boardObjectInner(item) {
    if (item.photo) {
      const p = PHOTOS[item.photo];
      return `<img src="${IMG(p.id, 360)}" alt="">${item.label ? `<span>${escapeHtml(item.label)}</span>` : ""}`;
    }
    return `<strong>${escapeHtml(item.label)}</strong>`;
  }

  function buildBoardObject(q) {
    const ans = ensureAnswer(q);
    const placement = TEST_PLACEMENTS[state.qIndex % TEST_PLACEMENTS.length];
    const base = {
      id: `${q.id}-${Date.now()}`,
      questionIndex: state.qIndex,
      x: placement.x,
      y: placement.y,
      w: placement.w,
      h: placement.h,
      r: placement.r,
    };

    if (q.type === "keyword") {
      const labels = ans.selected.map((key) => keywordLabel(q, key)).join(" · ");
      return { ...base, type: "keyword", label: labels };
    }

    const selected = q.options.find((o) => o.key === selectedChoiceKey(q));
    return { ...base, type: "image", photo: selected?.photo, label: "" };
  }

  function renderTestBoard() {
    const host = slot("test-board-items");
    if (!host) return;
    host.innerHTML = state.testBoardItems.map((item) =>
      `<div class="board-object board-object--${item.type}" style="--x:${item.x};--y:${item.y};--w:${item.w};--h:${item.h};--r:${item.r}">
        ${boardObjectInner(item)}
      </div>`
    ).join("");
  }

  function animateSelectionToBoard(q, done) {
    const item = buildBoardObject(q);
    const stage = slot("test-stage");
    const selectedKey = selectedChoiceKey(q);
    const selectedEl =
      $$("[data-key]", slot("q-choices")).find((el) => el.dataset.key === selectedKey) ||
      slot("question-card");
    const stageRect = stage.getBoundingClientRect();
    const fromRect = selectedEl.getBoundingClientRect();
    const canvasRect = $(".build-board__canvas", stage).getBoundingClientRect();

    state.isPlacing = true;
    updateMeta(q);
    stage.dataset.phase = "placing";

    const fly = document.createElement("div");
    fly.className = `board-object board-object--${item.type} fly-object`;
    fly.innerHTML = boardObjectInner(item);
    fly.style.left = (fromRect.left - stageRect.left) + "px";
    fly.style.top = (fromRect.top - stageRect.top) + "px";
    fly.style.width = fromRect.width + "px";
    fly.style.height = fromRect.height + "px";
    fly.style.transform = "translate3d(0,0,0) rotate(0deg)";
    stage.appendChild(fly);

    const reduced = prefersReduced();
    const tx = canvasRect.left - stageRect.left + canvasRect.width * (item.x / 100) - (fromRect.left - stageRect.left);
    const ty = canvasRect.top - stageRect.top + canvasRect.height * (item.y / 100) - (fromRect.top - stageRect.top);
    const tw = canvasRect.width * (item.w / 100);
    const th = canvasRect.height * (item.h / 100);
    const sx = tw / Math.max(1, fromRect.width);
    const sy = th / Math.max(1, fromRect.height);

    requestAnimationFrame(() => {
      fly.style.transform = reduced
        ? `translate3d(${tx}px, ${ty}px, 0) scale(${sx}, ${sy}) rotate(${item.r}deg)`
        : `translate3d(${tx}px, ${ty}px, 0) scale(${sx}, ${sy}) rotate(${item.r}deg)`;
    });

    const finish = () => {
      fly.remove();
      state.testBoardItems = state.testBoardItems.filter((old) => old.questionIndex !== state.qIndex);
      state.testBoardItems.push(item);
      renderTestBoard();
      stage.dataset.phase = "settled";
      state.isPlacing = false;
      updateMeta(q);
      done();
    };
    window.setTimeout(finish, reduced ? 80 : 720);
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
    updateTestAction(q);
  }

  function updateTestAction(q = QUESTIONS[state.qIndex]) {
    const btn = $('[data-action="test-next"]');
    if (!btn) return;
    btn.disabled = state.readyToGenerate ? false : !selectionValid(q) || state.isPlacing;
    btn.innerHTML = state.readyToGenerate
      ? `무드보드 생성하기 ${icon("i-sparkle")}`
      : `다음 ${icon("i-arrow-right")}`;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;",
    }[ch]));
  }

  // 질문마다 대표 사진 한 장을 골라 최종 생성 보드의 재료로 쓴다.
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

  $('[data-action="test-next"]').addEventListener("click", () => {
    if (state.readyToGenerate) {
      startGenerating();
      return;
    }

    const q = QUESTIONS[state.qIndex];
    if (!selectionValid(q) || state.isPlacing) return;
    animateSelectionToBoard(q, () => {
      if (!isLastQuestion()) {
        window.setTimeout(() => {
          state.qIndex++;
          renderQuestion();
        }, prefersReduced() ? 0 : 360);
      } else {
        slot("test-progress").style.setProperty("--progress", 1);
        state.readyToGenerate = true;
        updateTestAction(q);
      }
    });
  });

  function moveTestBack() {
    if (state.isPlacing) return;
    if (state.readyToGenerate) {
      state.readyToGenerate = false;
      state.testBoardItems = state.testBoardItems.filter((item) => item.questionIndex < state.qIndex);
      renderTestBoard();
      renderQuestion();
      return;
    }
    if (state.qIndex === 0) { go("main"); return; }
    state.qIndex--;
    state.testBoardItems = state.testBoardItems.filter((item) => item.questionIndex < state.qIndex);
    renderTestBoard();
    renderQuestion();
  }

  $('[data-action="test-back"]').addEventListener("click", moveTestBack);

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
    fill.style.setProperty("--progress", 0);
    percentEl.textContent = "0%";
    statusEl.textContent = GEN_MESSAGES[0];

    clearInterval(state.genTimer);
    const total = reduced ? 600 : 3600;
    const start = performance.now();
    state.genTimer = setInterval(() => {
      const elapsed = performance.now() - start;
      pct = clamp(Math.round((elapsed / total) * 100), 0, 100);
      fill.style.setProperty("--progress", pct / 100);
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
    if (tool === "erase") {
      setTool("erase");
      toast(state.elements.length ? "지울 스티커·글자를 탭하세요" : "스티커나 글자를 먼저 추가해보세요");
      return;
    }
    setTool("move");
  }
  function setTool(tool) {
    state.activeTool = tool;
    tools.forEach((t) => t.setAttribute("aria-pressed", String(t.dataset.tool === tool)));
    const board = slot("edit-board");
    if (board) board.dataset.tool = tool;
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
      removeElement(el, id);
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
      if (state.activeTool === "erase") return;   // 지우개 모드: 드래그·선택 대신 탭으로 삭제
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
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      if (state.activeTool === "erase") { removeElement(el, rec.id); return; }
      selectElement(el);
    });
  }
  function removeElement(el, id) {
    state.elements = state.elements.filter((r) => r.id !== id);
    el.remove();
  }
  function point(e) { return { x: e.clientX, y: e.clientY }; }

  // 빈 캔버스 클릭 → 선택 해제
  slot("edit-board").addEventListener("pointerdown", (e) => {
    if (e.target === slot("edit-board") || e.target.closest(".board__grid") === e.target)
      selectElement(null);
  });

  $('[data-action="edit-back"]').addEventListener("click", () => {
    // 편집 나가기: 생성중 화면으로 되돌아가지 않는다. 저장 여부만 확인 후 홈으로.
    if (!window.confirm("지금까지 만든 무드보드를 저장하지 않고 나가시겠어요?")) return;
    routeHome();
  });
  $('[data-action="save-board"]').addEventListener("click", () => {
    selectElement(null);
    // 엔딩 마찰 제거: 공개 직전에 로그인으로 가로막지 않는다.
    // 로그인 상태면 보관, 게스트면 결과의 안내 배너로 로그인 유도.
    if (isLoggedIn()) {
      state.saved = true;
      toast("무드보드를 저장했어요");
    }
    buildResult();
  });

  /* ==================================================================== */
  /* RESULT                                                               */
  /* ==================================================================== */
  // 편집 완료 → 무드 계산, History에 기록, 결과 화면 렌더
  function buildResult() {
    const { norm, profile } = computeMood();
    state.profile = profile;
    state.moodValues = norm;

    const snapshot = {
      photos: state.boardPhotos.slice(),
      elements: state.elements.map(({ type, payload, x, y }) => ({ type, payload, x, y })),
      profileName: profile.name,
      profileEn: profile.en,
      profileDesc: profile.desc,
      moodValues: norm,
      saved: state.saved,
    };
    const existing = state.savedBoards.find((b) => b.id === state.currentBoardId);
    if (existing) {
      Object.assign(existing, snapshot);
      state.savedBoards = [existing, ...state.savedBoards.filter((b) => b !== existing)];
    } else {
      const entry = { id: Date.now(), ...snapshot };
      state.savedBoards.unshift(entry);
      state.currentBoardId = entry.id;
    }
    // 저장(로그인) 보드만 영속화. 게스트 임시 보드는 세션 History에만 남는다.
    if (state.saved) persistBoards();

    renderResultView();
  }

  // 결과 화면을 state(현재/불러온 보드)로부터 그린다
  function renderResultView() {
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

    const profile = state.profile;
    slot("profile-name").textContent = profile.name;
    slot("profile-en").textContent = profile.en;
    slot("profile-desc").textContent = profile.desc;
    slot("result-board").setAttribute("aria-label", `${profile.name} 무드보드`);

    renderRadar(state.moodValues);
    renderBars(slot("bars"), state.moodValues, { showVal: true });
    renderHighlight(state.moodValues);
    slot("guest-banner").hidden = state.saved;
    go("result");
  }

  // 다섯 축의 비중을 가로 막대로 (결과 스펙트럼 + 생성중 미니 공용)
  function renderBars(host, values, opts = {}) {
    if (!host) return;
    host.innerHTML = AXES.map((a) => {
      const pct = Math.round(clamp(values[a.key] || 0, 0, 1) * 100);
      return `<div class="bar-row">
        <span class="bar-row__label">${a.label}</span>
        <span class="bar-row__track"><span class="bar-row__fill" style="--v:0"></span></span>
        ${opts.showVal ? `<span class="bar-row__val">${pct}%</span>` : ""}
      </div>`;
    }).join("");
    // 다음 프레임에 목표값으로 → transition(scaleX) 발동
    requestAnimationFrame(() => {
      $$(".bar-row__fill", host).forEach((fill, i) => {
        fill.style.setProperty("--v", clamp(values[AXES[i].key] || 0, 0, 1).toFixed(3));
      });
    });
  }

  function renderHighlight(values) {
    const host = slot("mood-highlight");
    if (!host) return;
    const ranked = [...AXES].sort((a, b) => (values[b.key] || 0) - (values[a.key] || 0));
    host.innerHTML =
      `가장 강한 결 <strong>${ranked[0].label}</strong> · 가장 옅은 결 <strong>${ranked[ranked.length - 1].label}</strong>`;
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
  $('[data-action="go-home"]').addEventListener("click", routeHome);

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
        ctx.font = `700 ${fs}px "SUIT", sans-serif`;
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
  loadBoards();
  renderAccount();
  renderGallery();
  routeHome();
})();
