/*
 * ③ 3分野仕分けレース
 *   60秒で、流れてくる用語を3つの箱へドラッグ（またはタップ）して仕分ける。
 */
window.ITP = window.ITP || {};
ITP.games = ITP.games || {};

ITP.games.sort = {
  title: "3分野仕分けレース",
  render(root) {
    const U = ITP.util;
    const LIMIT = 60;
    let timers = [], tick = null, keyHandler = null;

    function setup() {
      const best = ITP.store.best("sort_" + ITP.mode);
      const keys = Object.keys(ITP.CATS);
      root.innerHTML = `
        ${U.head("📦", "3分野仕分けレース", "用語がどの分野に属するかを、60秒でできるだけたくさん仕分けよう。")}
        <div class="panel setup">
          <ul class="howto">
            <li>カードを下の箱へ<b>ドラッグ</b>するか、<b>箱をタップ</b>して仕分けます</li>
            <li>連続正解で<b>コンボボーナス</b>。間違えると復習リストに入ります</li>
            <li>PCでは <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> キーでも操作できます</li>
          </ul>
          <div class="bins-preview">
            ${keys.map(k => `${U.catTag(k)}<small>${ITP.CATS[k].desc}</small>`).join("")}
          </div>
          <p class="note">${ITP.MODES[ITP.mode].label}（${ITP.MODES[ITP.mode].basis}）の分野で仕分けます。</p>
          <button type="button" class="btn btn-primary btn-block" id="start">スタート</button>
          <p class="note center">ベストスコア：<b>${best !== undefined ? best + "点" : "—"}</b></p>
        </div>`;
      root.querySelector("#start").addEventListener("click", play);
    }

    function play() {
      const deck = U.shuffle(ITP.TERMS);
      let i = 0, score = 0, combo = 0, maxCombo = 0, correct = 0;
      const misses = [];
      const endAt = Date.now() + LIMIT * 1000;
      let ended = false;

      root.innerHTML = `
        ${U.head("📦", "3分野仕分けレース")}
        <div class="sort-hud">
          <div class="time-line"><span id="s-bar"></span></div>
          <div class="hud-row">
            <span>残り <b id="s-time">${LIMIT}</b>秒</span>
            <span class="combo" id="s-combo"></span>
            <span><b id="s-score">0</b>点</span>
          </div>
        </div>
        <div class="sort-stage" id="stage"></div>
        <div class="bins" id="bins">
          ${Object.keys(ITP.CATS).map((k, n) => `<button type="button" class="bin bin-${ITP.CATS[k].color}" data-cat="${k}"><span class="bin-key">${n + 1}</span>${ITP.CATS[k].name}</button>`).join("")}
        </div>`;

      const stage = root.querySelector("#stage");
      const bins = [...root.querySelectorAll(".bin")];
      let card = null, locked = false;

      function next() {
        if (ended) return;
        if (i >= deck.length) { i = 0; }
        const t = deck[i];
        stage.innerHTML = `<div class="sort-card" id="card">${U.newTag(t)}<span class="sort-term">${U.esc(t.term)}</span><span class="sort-tip">ドラッグして箱へ</span></div>`;
        card = stage.querySelector("#card");
        bindDrag(card);
        locked = false;
      }

      function answer(cat) {
        if (locked || ended) return;
        locked = true;
        const t = deck[i];
        i++;
        const ok = t.cat === cat;
        const bin = bins.find(b => b.dataset.cat === cat);
        if (ok) {
          combo++; correct++;
          maxCombo = Math.max(maxCombo, combo);
          const gain = 10 + Math.min(combo - 1, 10) * 2;
          score += gain;
          flash(bin, "ok");
          card.classList.add("gone-ok");
        } else {
          combo = 0;
          misses.push(t);
          ITP.store.soft(t.term);
          flash(bin, "ng");
          card.classList.add("gone-ng");
          U.toast(`「${t.term}」は ${ITP.CATS[t.cat].name}`, "ng");
        }
        root.querySelector("#s-score").textContent = score;
        root.querySelector("#s-combo").textContent = combo >= 2 ? `🔥 ${combo}コンボ` : "";
        timers.push(setTimeout(next, ok ? 180 : 450));
      }

      function flash(el, kind) {
        el.classList.remove("ok", "ng");
        void el.offsetWidth;
        el.classList.add(kind);
        timers.push(setTimeout(() => el.classList.remove(kind), 350));
      }

      function binAt(x, y) {
        return bins.find(b => {
          const r = b.getBoundingClientRect();
          return x >= r.left && x <= r.right && y >= r.top - 20 && y <= r.bottom;
        });
      }

      function bindDrag(el) {
        let sx = 0, sy = 0, dragging = false;
        el.addEventListener("pointerdown", e => {
          if (locked) return;
          dragging = true; sx = e.clientX; sy = e.clientY;
          el.setPointerCapture(e.pointerId);
          el.classList.add("dragging");
        });
        el.addEventListener("pointermove", e => {
          if (!dragging) return;
          el.style.transform = `translate(${e.clientX - sx}px, ${e.clientY - sy}px) rotate(${(e.clientX - sx) / 25}deg)`;
          const over = binAt(e.clientX, e.clientY);
          bins.forEach(b => b.classList.toggle("hover", b === over));
        });
        const end = e => {
          if (!dragging) return;
          dragging = false;
          el.classList.remove("dragging");
          bins.forEach(b => b.classList.remove("hover"));
          const over = binAt(e.clientX, e.clientY);
          if (over) { answer(over.dataset.cat); }
          else { el.style.transform = ""; }
        };
        el.addEventListener("pointerup", end);
        el.addEventListener("pointercancel", () => { dragging = false; el.classList.remove("dragging"); el.style.transform = ""; });
      }

      bins.forEach(b => b.addEventListener("click", () => answer(b.dataset.cat)));
      keyHandler = e => {
        const k = Object.keys(ITP.CATS)[+e.key - 1];
        if (k) answer(k);
      };
      document.addEventListener("keydown", keyHandler);

      tick = setInterval(() => {
        const left = Math.max(0, (endAt - Date.now()) / 1000);
        root.querySelector("#s-time").textContent = Math.ceil(left);
        root.querySelector("#s-bar").style.width = (left / LIMIT) * 100 + "%";
        if (left <= 10) root.querySelector(".sort-hud").classList.add("hurry");
        if (left <= 0) finish();
      }, 100);
      next();

      function finish() {
        if (ended) return;
        ended = true;
        clearInterval(tick); tick = null;
        document.removeEventListener("keydown", keyHandler); keyHandler = null;
        const total = correct + misses.length;
        const rate = total ? Math.round((correct / total) * 100) : 0;
        const rec = ITP.store.setBest("sort_" + ITP.mode, score, (n, o) => n > o);
        root.innerHTML = `
          ${U.head("📦", "3分野仕分けレース")}
          <div class="panel result">
            ${rec && score > 0 ? `<div class="badge-new">ベストスコア更新！</div>` : ""}
            <div class="result-big">${score}<small>点</small></div>
            <p class="result-sub">${total}枚中 ${correct}枚正解（正答率 ${rate}%）・最大 ${maxCombo}コンボ</p>
            <div class="btn-row">
              <button type="button" class="btn btn-primary" id="again">もう一度</button>
              <a class="btn btn-ghost" href="#/">ホームへ</a>
            </div>
          </div>
          ${misses.length ? `<div class="panel"><h2>間違えた用語</h2><p class="note">正しい分野と意味を確認しよう（復習リストに追加しました）。</p>
            <ul class="term-list">${misses.map(t => `<li>${U.catTag(t.cat)}<b>${U.newTag(t)}${U.esc(t.term)}</b><span>${U.esc(t.desc)}</span></li>`).join("")}</ul></div>` : ""}`;
        root.querySelector("#again").addEventListener("click", play);
      }
    }

    setup();
    return () => {
      timers.forEach(clearTimeout);
      clearInterval(tick);
      if (keyHandler) document.removeEventListener("keydown", keyHandler);
    };
  }
};
