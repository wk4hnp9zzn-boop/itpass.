/*
 * ⑧ 計算ミニゲーム
 *   2進数・稼働率・損益分岐点などの計算問題を4択でタイムアタック。
 */
window.ITP = window.ITP || {};
ITP.games = ITP.games || {};

ITP.games.calc = {
  title: "計算ミニゲーム",
  render(root, params) {
    const U = ITP.util;
    let tick = null;

    function pool(type) {
      if (type === "review") {
        const set = new Set(ITP.store.reviewCalc());
        return ITP.CALC.filter(c => set.has(c.id));
      }
      return type === "all" ? ITP.CALC.slice() : ITP.CALC.filter(c => c.type === type);
    }

    function setup() {
      const preset = params.type || "all";
      const rc = ITP.store.reviewCalc().length;
      const types = [["all", "すべて"], ...ITP.CALC_TYPES.map(t => [t, t]), ["review", `復習リスト (${rc})`]];
      const best = ITP.store.best("calc");
      root.innerHTML = `
        ${U.head("🧮", "計算ミニゲーム", "試験に出る計算問題を、テンポよく解いてみよう。紙とペンを用意するのがおすすめです。")}
        <div class="panel setup">
          <h2>問題の種類</h2>
          <div class="chips" data-group="type">
            ${types.map(([v, l]) => `<button type="button" class="chip ${v === preset ? "on" : ""} ${v === "review" ? "chip-review" : ""}" data-value="${v}">${l}${v !== "all" && v !== "review" ? ` (${pool(v).length})` : ""}</button>`).join("")}
          </div>
          <h2>問題数</h2>
          <div class="chips" data-group="n">
            <button type="button" class="chip on" data-value="5">5問</button>
            <button type="button" class="chip" data-value="10">10問</button>
          </div>
          <button type="button" class="btn btn-primary btn-block" id="start">スタート</button>
          <p class="note center">ベスト記録（すべて・10問）：<b>${best ? `${best.correct}問正解 / ${U.fmtTime(best.time)}` : "—"}</b></p>
        </div>`;
      const get = U.bindChips(root);
      root.querySelector("#start").addEventListener("click", () => {
        const type = get("type"), n = +get("n");
        const p = pool(type);
        if (!p.length) { U.toast("この種類には出題できる問題がありません"); return; }
        play(U.shuffle(p).slice(0, n), type, n);
      });
      if (params.start && pool(preset).length) play(U.shuffle(pool(preset)).slice(0, 10), preset, 10);
    }

    function play(qs, type, n) {
      let qi = 0, correct = 0;
      const log = [];
      const start = Date.now();
      clearInterval(tick);

      function showQ() {
        const q = qs[qi];
        const order = U.shuffle(q.choices.map((c, k) => k));
        root.innerHTML = `
          ${U.head("🧮", "計算ミニゲーム")}
          <div class="quiz-top">
            <span class="counter">第${qi + 1}問 / ${qs.length}</span>
            <span class="score-pill">⏱ <span id="c-time">${U.fmtTime((Date.now() - start) / 1000)}</span></span>
          </div>
          <div class="progress-line"><span style="width:${(qi / qs.length) * 100}%"></span></div>
          <div class="panel">
            <div class="q-head"><span class="tag tag-calc">${U.esc(q.type)}</span></div>
            <p class="calc-q">${U.esc(q.q)}</p>
          </div>
          <div class="choices" id="choices">
            ${order.map(k => `<button type="button" class="choice" data-k="${k}">${U.esc(q.choices[k])}</button>`).join("")}
          </div>
          <div id="feedback"></div>`;

        root.querySelector("#choices").addEventListener("click", e => {
          const b = e.target.closest(".choice");
          if (!b || b.disabled) return;
          const ok = +b.dataset.k === q.answer;
          if (ok) { correct++; ITP.store.calcCorrect(q.id); } else ITP.store.calcWrong(q.id);
          log.push({ q, ok });
          root.querySelectorAll(".choice").forEach(c => {
            c.disabled = true;
            if (+c.dataset.k === q.answer) c.classList.add("correct");
            else if (c === b) c.classList.add("wrong");
          });
          const fb = root.querySelector("#feedback");
          fb.innerHTML = `
            <div class="feedback ${ok ? "fb-ok" : "fb-ng"}">
              <b>${ok ? "正解！" : `ざんねん… 正解は「${U.esc(q.choices[q.answer])}」`}</b>
              <p>${U.esc(q.exp)}</p>
            </div>
            <button type="button" class="btn btn-primary btn-block" id="next">${qi + 1 < qs.length ? "次の問題へ" : "結果を見る"}</button>`;
          const nx = fb.querySelector("#next");
          nx.addEventListener("click", () => { qi++; qi < qs.length ? showQ() : finish(); });
          nx.focus({ preventScroll: true });
          fb.scrollIntoView({ behavior: "smooth", block: "nearest" });
        });
      }

      tick = setInterval(() => {
        const el = root.querySelector("#c-time");
        if (el) el.textContent = U.fmtTime((Date.now() - start) / 1000);
      }, 500);

      function finish() {
        clearInterval(tick); tick = null;
        const time = (Date.now() - start) / 1000;
        const rec = type === "all" && qs.length === 10 &&
          ITP.store.setBest("calc", { correct, time }, (a, b) => a.correct > b.correct || (a.correct === b.correct && a.time < b.time));
        const rate = Math.round((correct / qs.length) * 100);
        root.innerHTML = `
          ${U.head("🧮", "計算ミニゲーム")}
          <div class="panel result">
            ${rec ? `<div class="badge-new">ベスト記録更新！</div>` : ""}
            <div class="result-big">${correct}<small> / ${qs.length}問</small></div>
            <p class="result-sub">正答率 ${rate}%・タイム ${U.fmtTime(time)}</p>
            <div class="btn-row">
              <button type="button" class="btn btn-primary" id="again">もう一度</button>
              <button type="button" class="btn" id="change">設定を変える</button>
              <a class="btn btn-ghost" href="#/">ホームへ</a>
            </div>
          </div>
          <div class="panel"><h2>ふりかえり</h2>
            <ul class="calc-log">${log.map(l => `
              <li class="${l.ok ? "" : "is-ng"}">
                <span class="cl-mark">${l.ok ? "○" : "×"}</span>
                <div><p>${U.esc(l.q.q)}</p><p class="cl-ans">答え：<b>${U.esc(l.q.choices[l.q.answer])}</b></p><p class="cl-exp">${U.esc(l.q.exp)}</p></div>
              </li>`).join("")}</ul>
            ${log.some(l => !l.ok) ? `<p class="note">間違えた問題は復習リストに追加しました。</p>` : ""}
          </div>`;
        root.querySelector("#again").addEventListener("click", () => {
          const p = pool(type);
          if (!p.length) { setup(); return; }
          play(U.shuffle(p).slice(0, n), type, n);
        });
        root.querySelector("#change").addEventListener("click", () => { params = {}; setup(); });
      }

      showQ();
    }

    setup();
    return () => clearInterval(tick);
  }
};
