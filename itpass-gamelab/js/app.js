/*
 * 画面の切り替え（ルーター）とホーム画面
 */
window.ITP = window.ITP || {};
ITP.games = ITP.games || {};

(function () {
  const U = ITP.util;
  const app = document.getElementById("app");
  let cleanup = null;

  const GAME_LIST = [
    { key: "swipe", icon: "🃏", name: "スワイプ用語カード", desc: "知ってたら右、知らなかったら左。まずは用語と仲良くなろう", time: "3分" },
    { key: "memory", icon: "🧠", name: "神経衰弱マッチング", desc: "「用語」と「意味」のペアをそろえよう。タイムを縮めて記録更新", time: "2〜4分" },
    { key: "sort", icon: "📦", name: "3分野仕分けレース", desc: "60秒で、用語を試験の3分野に仕分けよう", time: "1分" },
    { key: "hint", icon: "🔍", name: "ヒント開示クイズ", desc: "ヒントが少ないうちに当てるほど高得点。推理でもOK", time: "3〜5分" },
    { key: "calc", icon: "🧮", name: "計算ミニゲーム", desc: "2進数・稼働率・損益分岐点など、頻出の計算問題に慣れよう", time: "5分" }
  ];

  function gauge(cat) {
    const c = ITP.CATS[cat], p = ITP.store.progress(cat), cls = c.color;
    const m = p.total ? (p.mastered / p.total) * 100 : 0;
    const l = p.total ? (p.learning / p.total) * 100 : 0;
    return `
      <div class="gauge">
        <div class="gauge-head"><span class="gauge-label ${cls}">${c.name}</span><span class="gauge-num"><b>${p.mastered}</b> / ${p.total}語</span></div>
        <div class="gauge-bar" role="img" aria-label="${c.name} 習得 ${p.mastered}語、学習中 ${p.learning}語、全${p.total}語">
          <span class="seg-m ${cls}" style="width:${m}%"></span><span class="seg-l ${cls}" style="width:${l}%"></span>
        </div>
      </div>`;
  }

  function modeSwitch() {
    return `
      <section class="panel mode-panel">
        <h2>試験の版を選ぶ</h2>
        <div class="mode-switch" role="radiogroup" aria-label="試験の版">
          ${Object.keys(ITP.MODES).map(k => {
            const m = ITP.MODES[k], on = k === ITP.mode;
            return `<button type="button" class="mode-opt ${on ? "on" : ""}" data-mode="${k}" role="radio" aria-checked="${on}">
              <span class="mode-name">${m.label}</span>
              <span class="mode-exam">${m.exam}</span>
              <span class="mode-cats">${Object.values(m.cats).map(c => `<span class="tag tag-${c.color}">${c.name}</span>`).join("")}</span>
            </button>`;
          }).join("")}
        </div>
        <p class="note">${ITP.mode === "next"
          ? `IPAの${ITP.MODES.next.basis}にもとづく内容です。正式版で変わる可能性があります。新シラバスで登場する用語には <span class="tag tag-new">NEW</span> が付きます。`
          : `${ITP.MODES.now.basis}にもとづく内容です。2026年度中に受験する人はこちら。`}</p>
      </section>`;
  }

  function renderHome() {
    const all = ITP.store.progress();
    const pct = all.total ? Math.round((all.mastered / all.total) * 100) : 0;
    const rc = ITP.store.reviewCount();
    const newCount = ITP.TERMS.filter(t => t.isNew).length;
    app.innerHTML = `
      <section class="hero">
        <p class="hero-kicker">ITパスポート対策</p>
        <h1>遊んでいるうちに、<br>用語が身につく。</h1>
        <p class="hero-sub">1回3分から。ログイン不要で、スマホでもPCでも遊べます。</p>
      </section>

      ${modeSwitch()}

      <section class="panel progress-panel">
        <div class="panel-head">
          <h2>あなたの進捗 <small class="muted">（${ITP.MODES[ITP.mode].label}）</small></h2>
          <span class="big-pct">${pct}<small>%</small></span>
        </div>
        ${Object.keys(ITP.CATS).map(gauge).join("")}
        <p class="legend"><span class="lg lg-m"></span>習得済み（2回以上正解）　<span class="lg lg-l"></span>学習中</p>
      </section>

      ${rc ? `<a class="review-banner" href="#/review">
        <span class="rb-icon">📝</span>
        <span><b>復習リストに ${rc} 件</b><br><small>間違えた用語・問題をまとめて復習しよう</small></span>
        <span class="rb-arrow">›</span></a>` : ""}

      <section>
        <h2 class="section-title">ゲームを選ぶ</h2>
        <div class="game-grid">
          ${GAME_LIST.map(g => `
            <a class="game-card" href="#/${g.key}">
              <span class="gc-icon" aria-hidden="true">${g.icon}</span>
              <span class="gc-body">
                <span class="gc-name">${g.name}</span>
                <span class="gc-desc">${g.desc}</span>
              </span>
              <span class="gc-time">${g.time}</span>
            </a>`).join("")}
          <a class="game-card game-card-dict" href="#/dict">
            <span class="gc-icon" aria-hidden="true">📖</span>
            <span class="gc-body">
              <span class="gc-name">用語辞典</span>
              <span class="gc-desc">全${ITP.TERMS.length}語を検索・分野別に一覧。覚えた度合いもひと目でわかる</span>
            </span>
          </a>
        </div>
      </section>

      <footer class="foot">
        <p>収録（${ITP.MODES[ITP.mode].label}）：用語 ${ITP.TERMS.length}語${newCount ? `（うち新シラバス用語 ${newCount}語）` : ""}／計算問題 ${ITP.CALC.length}問</p>
        <p>学習記録はこのブラウザにだけ保存され、両方の版で共通です。</p>
        <button type="button" class="link-btn" id="reset-btn">学習記録をリセット</button>
      </footer>`;

    app.querySelectorAll(".mode-opt").forEach(b => b.addEventListener("click", () => {
      if (b.dataset.mode === ITP.mode) return;
      ITP.setMode(b.dataset.mode);
      renderHome();
      updateChrome();
      U.toast(`${ITP.MODES[ITP.mode].label}に切り替えました`);
    }));
    document.getElementById("reset-btn").addEventListener("click", () => {
      if (confirm("進捗・復習リスト・ベスト記録をすべて消去します。よろしいですか？")) {
        ITP.store.reset();
        renderHome();
        U.toast("学習記録をリセットしました");
      }
    });
  }

  /** ヘッダーの表示（復習件数・現在の版） */
  function updateChrome() {
    const n = ITP.store.reviewCount();
    const b = document.getElementById("review-badge");
    b.textContent = n;
    b.hidden = n === 0;
    const chip = document.getElementById("mode-chip");
    chip.textContent = ITP.MODES[ITP.mode].short;
    chip.className = "mode-chip mode-" + ITP.mode;
  }
  ITP.store.onChange = updateChrome;

  function parseHash() {
    const h = location.hash.replace(/^#\/?/, "");
    const [path, query] = h.split("?");
    const params = {};
    (query || "").split("&").filter(Boolean).forEach(kv => {
      const [k, v] = kv.split("=");
      params[decodeURIComponent(k)] = decodeURIComponent(v || "");
    });
    return { path: path || "", params };
  }

  function route() {
    if (cleanup) { try { cleanup(); } catch (e) { } cleanup = null; }
    document.getElementById("toast").className = "";
    const { path, params } = parseHash();
    document.body.dataset.page = path || "home";
    window.scrollTo(0, 0);
    const mod = ITP.games[path];
    if (mod) {
      document.title = mod.title + "｜ITパス ゲームラボ";
      cleanup = mod.render(app, params) || null;
    } else {
      document.title = "ITパス ゲームラボ";
      renderHome();
    }
    updateChrome();
    app.focus({ preventScroll: true });
  }

  window.addEventListener("hashchange", route);
  route();
})();
