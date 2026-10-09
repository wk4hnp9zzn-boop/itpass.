/*
 * ② 神経衰弱マッチング
 *   「用語」カードと「意味」カードのペアをそろえる。タイムと手数を記録。
 */
window.ITP = window.ITP || {};
ITP.games = ITP.games || {};

ITP.games.memory = {
  title: "神経衰弱マッチング",
  render(root, params) {
    const U = ITP.util;
    let timers = [], tick = null;
    const LEVELS = { easy: { pairs: 4, label: "かんたん" }, normal: { pairs: 6, label: "ふつう" }, hard: { pairs: 8, label: "むずかしい" } };

    function setup() {
      const bestHtml = Object.keys(LEVELS).map(k => {
        const b = ITP.store.best("memory_" + k);
        return `<li><span>${LEVELS[k].label}</span><b>${b ? U.fmtTime(b.time) + "（" + b.moves + "手）" : "—"}</b></li>`;
      }).join("");
      root.innerHTML = `
        ${U.head("🧠", "神経衰弱マッチング", "「用語」と「意味」のカードをめくって、ペアをそろえよう。")}
        <div class="panel setup">
          <h2>分野</h2>
          ${U.catPicker(params.cat || "all", false)}
          <h2>難しさ</h2>
          <div class="chips" data-group="lv">
            <button type="button" class="chip on" data-value="easy">かんたん（4ペア）</button>
            <button type="button" class="chip" data-value="normal">ふつう（6ペア）</button>
            <button type="button" class="chip" data-value="hard">むずかしい（8ペア）</button>
          </div>
          <button type="button" class="btn btn-primary btn-block" id="start">はじめる</button>
          <h2>ベスト記録</h2>
          <ul class="best-list">${bestHtml}</ul>
        </div>`;
      const get = U.bindChips(root);
      root.querySelector("#start").addEventListener("click", () => play(get("cat"), get("lv")));
    }

    function play(cat, lv) {
      const pairs = LEVELS[lv].pairs;
      const terms = U.shuffle(U.termsFor(cat)).slice(0, pairs);
      const cards = U.shuffle(terms.flatMap((t, i) => [
        { pair: i, kind: "term", text: t.term, cat: t.cat },
        { pair: i, kind: "desc", text: t.desc, cat: t.cat }
      ]));
      let open = [], matched = 0, moves = 0, start = null, lock = false;

      root.innerHTML = `
        ${U.head("🧠", "神経衰弱マッチング")}
        <div class="mem-stats">
          <span>⏱ <b id="m-time">0:00</b></span>
          <span>手数 <b id="m-moves">0</b></span>
          <span>ペア <b id="m-pairs">0</b>/${pairs}</span>
        </div>
        <div class="mem-grid mem-${lv}" id="grid">
          ${cards.map((c, i) => `
            <button type="button" class="mem-card" data-i="${i}" aria-label="カード${i + 1}（裏向き）">
              <span class="mem-inner">
                <span class="mem-face mem-back" aria-hidden="true">?</span>
                <span class="mem-face mem-front mem-${c.kind} cat-${ITP.CATS[c.cat].color}">
                  <span class="mem-kind">${c.kind === "term" ? "用語" : "意味"}</span>
                  <span class="mem-text">${U.esc(c.text)}</span>
                </span>
              </span>
            </button>`).join("")}
        </div>
        <p class="note center">同じ用語の「用語」カードと「意味」カードがペアです。</p>`;

      const grid = root.querySelector("#grid");
      const els = [...grid.querySelectorAll(".mem-card")];

      grid.addEventListener("click", e => {
        const btn = e.target.closest(".mem-card");
        if (!btn || lock) return;
        const i = +btn.dataset.i;
        if (btn.classList.contains("open") || btn.classList.contains("done")) return;
        if (!start) {
          start = Date.now();
          tick = setInterval(() => { root.querySelector("#m-time").textContent = U.fmtTime((Date.now() - start) / 1000); }, 250);
        }
        btn.classList.add("open");
        btn.setAttribute("aria-label", (cards[i].kind === "term" ? "用語：" : "意味：") + cards[i].text);
        open.push(i);
        if (open.length < 2) return;

        moves++;
        root.querySelector("#m-moves").textContent = moves;
        const [a, b] = open;
        open = [];
        if (cards[a].pair === cards[b].pair && cards[a].kind !== cards[b].kind) {
          matched++;
          root.querySelector("#m-pairs").textContent = matched;
          timers.push(setTimeout(() => {
            els[a].classList.add("done"); els[b].classList.add("done");
            if (matched === pairs) finish();
          }, 350));
        } else {
          lock = true;
          timers.push(setTimeout(() => {
            [a, b].forEach(k => {
              els[k].classList.remove("open");
              els[k].setAttribute("aria-label", `カード${k + 1}（裏向き）`);
              els[k].classList.add("shake");
            });
            timers.push(setTimeout(() => els.forEach(x => x.classList.remove("shake")), 400));
            lock = false;
          }, 1000));
        }
      });

      function finish() {
        clearInterval(tick); tick = null;
        const time = (Date.now() - start) / 1000;
        const rec = ITP.store.setBest("memory_" + lv, { time, moves }, (n, o) => n.time < o.time);
        const perfect = moves === pairs;
        timers.push(setTimeout(() => {
          root.innerHTML = `
            ${U.head("🧠", "神経衰弱マッチング")}
            <div class="panel result">
              ${rec ? `<div class="badge-new">ベスト記録更新！</div>` : ""}
              <div class="result-big">${U.fmtTime(time)}</div>
              <p class="result-sub">${LEVELS[lv].label}・${moves}手でクリア${perfect ? "（ノーミス！）" : ""}</p>
              <div class="btn-row">
                <button type="button" class="btn btn-primary" id="again">もう一度</button>
                <button type="button" class="btn" id="change">設定を変える</button>
                <a class="btn btn-ghost" href="#/">ホームへ</a>
              </div>
            </div>
            <div class="panel"><h2>今回のペア</h2>
              <ul class="term-list">${terms.map(t => `<li>${U.catTag(t.cat)}<b>${U.newTag(t)}${U.esc(t.term)}</b><span>${U.esc(t.desc)}</span></li>`).join("")}</ul>
            </div>`;
          root.querySelector("#again").addEventListener("click", () => play(cat, lv));
          root.querySelector("#change").addEventListener("click", setup);
        }, 600));
      }
    }

    setup();
    return () => { timers.forEach(clearTimeout); clearInterval(tick); };
  }
};
