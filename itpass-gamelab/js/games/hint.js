/*
 * ⑤ ヒント開示クイズ
 *   ヒントを1つずつ開いて4択で答える。少ないヒントで当てるほど高得点（30→20→10点）。
 */
window.ITP = window.ITP || {};
ITP.games = ITP.games || {};

ITP.games.hint = {
  title: "ヒント開示クイズ",
  render(root, params) {
    const U = ITP.util;
    const POINTS = [30, 20, 10];
    let timers = [];

    function setup() {
      const preset = params.cat || "all";
      const best = ITP.store.best("hint_" + ITP.mode);
      root.innerHTML = `
        ${U.head("🔍", "ヒント開示クイズ", "ヒントを見ながら用語を当てよう。ヒントが少ないうちに答えるほど高得点！")}
        <div class="panel setup">
          <div class="point-rule">
            <div><b>30点</b><small>ヒント1つで正解</small></div>
            <div><b>20点</b><small>ヒント2つで正解</small></div>
            <div><b>10点</b><small>ヒント3つで正解</small></div>
          </div>
          <h2>分野</h2>
          ${U.catPicker(preset, true)}
          <h2>問題数</h2>
          <div class="chips" data-group="n">
            <button type="button" class="chip" data-value="5">5問</button>
            <button type="button" class="chip on" data-value="10">10問</button>
            <button type="button" class="chip" data-value="20">20問</button>
          </div>
          <button type="button" class="btn btn-primary btn-block" id="start">はじめる</button>
          <p class="note center">ベストスコア（10問）：<b>${best !== undefined ? best + "点" : "—"}</b></p>
        </div>`;
      const get = U.bindChips(root);
      root.querySelector("#start").addEventListener("click", () => {
        const cat = get("cat"), n = +get("n");
        const pool = U.termsFor(cat);
        if (!pool.length) { U.toast("この分野には出題できる用語がありません"); return; }
        play(U.pickWeighted(pool, n), cat, n);
      });
      if (params.start && U.termsFor(preset).length) {
        const pool = U.termsFor(preset);
        play(U.pickWeighted(pool, Math.min(10, pool.length)), preset, 10);
      }
    }

    // 説明文の末尾から「何の種類の用語か」を判定（攻撃なら攻撃同士、法律なら法律同士で選択肢を作るため）
    const KINDS = ["攻撃", "法律", "権利", "マルウェア", "指標", "分析する手法", "手法", "方式", "契約", "テスト", "組織", "図", "装置", "プロトコル", "ネットワーク", "データ構造", "規格", "制度", "活動", "仕組み", "技術", "考え方", "状態", "現象", "AI", "メモリ", "利益", "資産", "費用", "形態", "情報", "ソフトウェア", "サービス", "設計"];
    const kindOf = d => KINDS.find(k => d.replace(/[（(].*?[)）]$/, "").endsWith(k)) || "";

    function choicesFor(t) {
      // 同じ分野・同じ種類の用語を優先して、紛らわしい選択肢を3つ選ぶ
      const k = kindOf(t.desc);
      const sameCat = U.shuffle(ITP.TERMS.filter(x => x.cat === t.cat && x.term !== t.term));
      const sameKind = k ? U.shuffle(ITP.TERMS.filter(x => x.term !== t.term && kindOf(x.desc) === k)) : [];
      const picked = [];
      [sameKind.filter(x => x.cat === t.cat), sameKind, sameCat, U.shuffle(ITP.TERMS.filter(x => x.term !== t.term))]
        .forEach(list => list.forEach(x => { if (picked.length < 3 && !picked.includes(x)) picked.push(x); }));
      return U.shuffle([t, ...picked]);
    }

    function play(qs, cat, n) {
      let qi = 0, score = 0;
      const log = [];

      function showQ() {
        const t = qs[qi];
        const hints = [t.hints[0], t.hints[1], t.desc];
        const opts = choicesFor(t);
        let shown = 1, answered = false;

        root.innerHTML = `
          ${U.head("🔍", "ヒント開示クイズ")}
          <div class="quiz-top">
            <span class="counter">第${qi + 1}問 / ${qs.length}</span>
            <span class="score-pill">${score}点</span>
          </div>
          <div class="progress-line"><span style="width:${(qi / qs.length) * 100}%"></span></div>
          <div class="panel">
            <div class="q-head">${U.catTag(t.cat)}${U.newTag(t)}<span class="q-title">この用語はなに？</span><span class="worth" id="worth">${POINTS[0]}点</span></div>
            <ol class="hint-list" id="hints"></ol>
            <button type="button" class="btn btn-ghost btn-block" id="more">ヒントをもう1つ見る（−10点）</button>
          </div>
          <div class="choices" id="choices">
            ${opts.map((o, k) => `<button type="button" class="choice" data-k="${k}">${U.esc(o.term)}</button>`).join("")}
          </div>
          <div id="feedback"></div>`;

        const hintsEl = root.querySelector("#hints"), more = root.querySelector("#more");
        function renderHints() {
          hintsEl.innerHTML = hints.map((h, k) =>
            k < shown ? `<li class="hint open"><span class="hint-no">ヒント${k + 1}</span>${U.esc(h)}</li>`
                      : `<li class="hint locked"><span class="hint-no">ヒント${k + 1}</span>？？？</li>`).join("");
          root.querySelector("#worth").textContent = answered ? "" : POINTS[shown - 1] + "点";
          more.hidden = shown >= 3 || answered;
        }
        renderHints();
        more.addEventListener("click", () => { if (shown < 3) { shown++; renderHints(); } });

        root.querySelector("#choices").addEventListener("click", e => {
          const b = e.target.closest(".choice");
          if (!b || answered) return;
          answered = true;
          const pick = opts[+b.dataset.k];
          const ok = pick.term === t.term;
          const gain = ok ? POINTS[shown - 1] : 0;
          score += gain;
          if (ok) ITP.store.correct(t.term); else ITP.store.wrong(t.term);
          log.push({ t, ok, gain });
          root.querySelectorAll(".choice").forEach((c, k) => {
            c.disabled = true;
            if (opts[k].term === t.term) c.classList.add("correct");
            else if (c === b) c.classList.add("wrong");
          });
          shown = 3; renderHints();
          root.querySelector(".score-pill").textContent = score + "点";
          const fb = root.querySelector("#feedback");
          fb.innerHTML = `
            <div class="feedback ${ok ? "fb-ok" : "fb-ng"}">
              <b>${ok ? `正解！ +${gain}点` : `ざんねん… 正解は「${U.esc(t.term)}」`}</b>
              <p>${U.esc(t.desc)}</p>
            </div>
            <button type="button" class="btn btn-primary btn-block" id="next">${qi + 1 < qs.length ? "次の問題へ" : "結果を見る"}</button>`;
          const nx = fb.querySelector("#next");
          nx.addEventListener("click", () => { qi++; qi < qs.length ? showQ() : finish(); });
          nx.focus({ preventScroll: true });
          fb.scrollIntoView({ behavior: "smooth", block: "nearest" });
        });
      }

      function finish() {
        const max = qs.length * POINTS[0];
        const correct = log.filter(l => l.ok).length;
        const rec = qs.length === 10 && cat !== "review" && ITP.store.setBest("hint_" + ITP.mode, score, (a, b) => a > b);
        const wrongs = log.filter(l => !l.ok).map(l => l.t);
        root.innerHTML = `
          ${U.head("🔍", "ヒント開示クイズ")}
          <div class="panel result">
            ${rec && score > 0 ? `<div class="badge-new">ベストスコア更新！</div>` : ""}
            <div class="result-big">${score}<small> / ${max}点</small></div>
            <p class="result-sub">${qs.length}問中 ${correct}問正解</p>
            <div class="btn-row">
              <button type="button" class="btn btn-primary" id="again">もう一度</button>
              <button type="button" class="btn" id="change">設定を変える</button>
              <a class="btn btn-ghost" href="#/">ホームへ</a>
            </div>
          </div>
          <div class="panel"><h2>ふりかえり</h2>
            <ul class="term-list">${log.map(l => `<li class="${l.ok ? "" : "is-ng"}">${U.catTag(l.t.cat)}<b>${l.ok ? "○" : "×"} ${U.esc(l.t.term)}${l.ok ? `<em>+${l.gain}点</em>` : ""}</b><span>${U.esc(l.t.desc)}</span></li>`).join("")}</ul>
            ${wrongs.length ? `<p class="note">間違えた用語は復習リストに追加しました。</p>` : ""}
          </div>`;
        root.querySelector("#again").addEventListener("click", () => {
          const pool = U.termsFor(cat);
          if (!pool.length) { setup(); return; }
          play(U.pickWeighted(pool, n), cat, n);
        });
        root.querySelector("#change").addEventListener("click", () => { params = {}; setup(); });
      }

      showQ();
    }

    setup();
    return () => timers.forEach(clearTimeout);
  }
};
