/*
 * ① スワイプ用語カード
 *   右スワイプ＝知ってる / 左スワイプ＝知らない。タップで意味を表示。
 */
window.ITP = window.ITP || {};
ITP.games = ITP.games || {};

ITP.games.swipe = {
  title: "スワイプ用語カード",
  render(root, params) {
    const U = ITP.util;
    let timers = [];
    let keyHandler = null;

    function setup() {
      const preset = params.cat || "all";
      root.innerHTML = `
        ${U.head("🃏", "スワイプ用語カード", "知ってたら右へ、知らなかったら左へ。カードをタップすると意味が見られます。")}
        <div class="panel setup">
          <h2>分野</h2>
          ${U.catPicker(preset, true)}
          <h2>枚数</h2>
          <div class="chips" data-group="n">
            <button type="button" class="chip on" data-value="10">10枚</button>
            <button type="button" class="chip" data-value="20">20枚</button>
            <button type="button" class="chip" data-value="40">40枚</button>
          </div>
          <button type="button" class="btn btn-primary btn-block" id="start">はじめる</button>
          <p class="note">まだ覚えていない用語から優先して出題します。</p>
        </div>`;
      const get = U.bindChips(root);
      root.querySelector("#start").addEventListener("click", () => {
        const cat = get("cat"), n = +get("n");
        const pool = U.termsFor(cat);
        if (!pool.length) { U.toast("この分野には出題できる用語がありません"); return; }
        play(U.pickWeighted(pool, n), cat, n);
      });
      if (params.start && U.termsFor(preset).length) {
        play(U.pickWeighted(U.termsFor(preset), 20), preset, 20);
      }
    }

    function play(deck, cat, n) {
      let idx = 0;
      const known = [], unknown = [];
      root.innerHTML = `
        ${U.head("🃏", "スワイプ用語カード")}
        <div class="swipe-wrap">
          <div class="progress-line"><span id="sw-bar"></span></div>
          <p class="counter" id="sw-count"></p>
          <div class="swipe-stage" id="stage"></div>
          <div class="swipe-actions">
            <button type="button" class="btn btn-no" id="no"><span aria-hidden="true">←</span> 知らない</button>
            <button type="button" class="btn btn-yes" id="yes">知ってる <span aria-hidden="true">→</span></button>
          </div>
          <p class="note center">PCでは ← → キーでも操作できます／スペースキーで裏返し</p>
        </div>`;
      const stage = root.querySelector("#stage");
      let current = null, busy = false;

      function showCard() {
        root.querySelector("#sw-count").textContent = `${idx + 1} / ${deck.length}`;
        root.querySelector("#sw-bar").style.width = (idx / deck.length) * 100 + "%";
        const t = deck[idx];
        stage.innerHTML = `
          <div class="swipe-card" id="card" tabindex="0" role="button" aria-label="${U.esc(t.term)}。タップで意味を表示">
            <span class="stamp stamp-yes">知ってる</span>
            <span class="stamp stamp-no">知らない</span>
            <div class="flip">
              <div class="face face-front">
                <span>${U.catTag(t.cat)} ${U.newTag(t)}</span>
                <div class="sc-term">${U.esc(t.term)}</div>
                <div class="sc-tip">タップで意味を見る</div>
              </div>
              <div class="face face-back">
                ${U.catTag(t.cat)}
                <div class="sc-term-sm">${U.esc(t.term)}</div>
                <div class="sc-desc">${U.esc(t.desc)}</div>
              </div>
            </div>
          </div>`;
        current = stage.querySelector("#card");
        bindDrag(current);
        busy = false;
      }

      function decide(isKnown) {
        if (busy || !current) return;
        busy = true;
        const t = deck[idx];
        if (isKnown) { known.push(t); ITP.store.correct(t.term); }
        else { unknown.push(t); ITP.store.wrong(t.term); }
        current.style.transition = "transform .3s ease, opacity .3s ease";
        current.style.transform = `translateX(${isKnown ? 120 : -120}vw) rotate(${isKnown ? 25 : -25}deg)`;
        current.style.opacity = "0";
        timers.push(setTimeout(() => {
          idx++;
          if (idx >= deck.length) finish(); else showCard();
        }, 260));
      }

      function bindDrag(card) {
        let sx = 0, sy = 0, dx = 0, dragging = false, moved = false;
        const yes = card.querySelector(".stamp-yes"), no = card.querySelector(".stamp-no");
        card.addEventListener("pointerdown", e => {
          if (busy) return;
          dragging = true; moved = false; sx = e.clientX; sy = e.clientY; dx = 0;
          card.setPointerCapture(e.pointerId);
          card.style.transition = "none";
        });
        card.addEventListener("pointermove", e => {
          if (!dragging) return;
          dx = e.clientX - sx;
          if (Math.abs(dx) > 6 || Math.abs(e.clientY - sy) > 6) moved = true;
          card.style.transform = `translateX(${dx}px) rotate(${dx / 18}deg)`;
          yes.style.opacity = Math.max(0, Math.min(1, dx / 90));
          no.style.opacity = Math.max(0, Math.min(1, -dx / 90));
        });
        const end = () => {
          if (!dragging) return;
          dragging = false;
          if (dx > 90) return decide(true);
          if (dx < -90) return decide(false);
          card.style.transition = "transform .25s ease";
          card.style.transform = "";
          yes.style.opacity = 0; no.style.opacity = 0;
          if (!moved) card.classList.toggle("flipped");
        };
        card.addEventListener("pointerup", end);
        card.addEventListener("pointercancel", end);
        card.addEventListener("keydown", e => {
          if (e.key === "Enter") { e.preventDefault(); card.classList.toggle("flipped"); }
        });
      }

      keyHandler = e => {
        if (e.key === "ArrowRight") decide(true);
        else if (e.key === "ArrowLeft") decide(false);
        else if (e.key === " " && current) { e.preventDefault(); current.classList.toggle("flipped"); }
      };
      document.addEventListener("keydown", keyHandler);
      root.querySelector("#yes").addEventListener("click", () => decide(true));
      root.querySelector("#no").addEventListener("click", () => decide(false));
      showCard();

      function finish() {
        document.removeEventListener("keydown", keyHandler);
        keyHandler = null;
        const rate = Math.round((known.length / deck.length) * 100);
        root.innerHTML = `
          ${U.head("🃏", "スワイプ用語カード")}
          <div class="panel result">
            <div class="result-big">${rate}<small>%</small></div>
            <p class="result-sub">知ってる ${known.length}枚 ／ 知らない ${unknown.length}枚</p>
            <p class="result-msg">${rate === 100 ? "全部知ってた！次は別の分野にも挑戦しよう" : rate >= 70 ? "いい調子！知らなかった用語だけもう一周しよう" : "「聞いたことある」が増えれば十分。知らなかった用語をもう一周しよう"}</p>
            <div class="btn-row">
              ${unknown.length ? `<button type="button" class="btn btn-primary" id="again-unknown">知らなかった${unknown.length}枚をもう一度</button>` : ""}
              <button type="button" class="btn" id="again">別のカードで遊ぶ</button>
              <a class="btn btn-ghost" href="#/">ホームへ</a>
            </div>
          </div>
          ${unknown.length ? `<div class="panel"><h2>知らなかった用語</h2><p class="note">復習リストに追加しました。</p>
            <ul class="term-list">${unknown.map(t => `<li>${U.catTag(t.cat)}<b>${U.newTag(t)}${U.esc(t.term)}</b><span>${U.esc(t.desc)}</span></li>`).join("")}</ul></div>` : ""}`;
        const ag = root.querySelector("#again-unknown");
        if (ag) ag.addEventListener("click", () => play(U.shuffle(unknown), cat, n));
        root.querySelector("#again").addEventListener("click", () => {
          const pool = U.termsFor(cat);
          if (!pool.length) { setup(); return; }
          play(U.pickWeighted(pool, n), cat, n);
        });
      }
    }

    setup();
    return () => {
      timers.forEach(clearTimeout);
      if (keyHandler) document.removeEventListener("keydown", keyHandler);
    };
  }
};
