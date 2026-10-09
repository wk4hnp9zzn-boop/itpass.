/*
 * 復習リスト
 *   どのゲームで間違えた用語・計算問題も、ここにまとめて表示される。
 *   正解すると自動でリストから外れる。
 */
window.ITP = window.ITP || {};
ITP.games = ITP.games || {};

ITP.games.review = {
  title: "復習リスト",
  render(root) {
    const U = ITP.util;

    function draw() {
      const terms = U.termsFor("review");
      const calcSet = new Set(ITP.store.reviewCalc());
      const calcs = ITP.CALC.filter(c => calcSet.has(c.id));
      const empty = !terms.length && !calcs.length;

      root.innerHTML = `
        ${U.head("📝", "復習リスト", "ゲームで間違えた用語・問題がたまります。正解するとリストから自動で消えます。")}
        ${empty ? `
          <div class="panel empty">
            <div class="empty-icon" aria-hidden="true">🎉</div>
            <p><b>復習リストは空です</b></p>
            <p class="note">ゲームで間違えた用語や問題がここに表示されます。</p>
            <a class="btn btn-primary" href="#/">ゲームで遊ぶ</a>
          </div>` : ""}
        ${terms.length ? `
          <div class="panel">
            <div class="panel-head"><h2>用語（${terms.length}語）</h2></div>
            <div class="btn-row left">
              <a class="btn btn-primary" href="#/swipe?cat=review&start=1">🃏 スワイプで復習</a>
              <a class="btn" href="#/hint?cat=review&start=1">🔍 クイズで復習</a>
            </div>
            <ul class="term-list removable">
              ${terms.map(t => `<li>${U.catTag(t.cat)}<b>${U.newTag(t)}${U.esc(t.term)}</b><span>${U.esc(t.desc)}</span>
                <button type="button" class="rm" data-term="${U.esc(t.term)}" aria-label="${U.esc(t.term)}をリストから外す">✓ 覚えた</button></li>`).join("")}
            </ul>
          </div>` : ""}
        ${calcs.length ? `
          <div class="panel">
            <div class="panel-head"><h2>計算問題（${calcs.length}問）</h2></div>
            <div class="btn-row left">
              <a class="btn btn-primary" href="#/calc?type=review&start=1">🧮 解き直す</a>
            </div>
            <ul class="calc-log removable">
              ${calcs.map(q => `<li><span class="tag tag-calc">${U.esc(q.type)}</span>
                <div><p>${U.esc(q.q)}</p><p class="cl-ans">答え：<b>${U.esc(q.choices[q.answer])}</b></p><p class="cl-exp">${U.esc(q.exp)}</p></div>
                <button type="button" class="rm" data-calc="${q.id}" aria-label="この問題をリストから外す">✓ 覚えた</button></li>`).join("")}
            </ul>
          </div>` : ""}`;

      root.querySelectorAll(".rm").forEach(b => b.addEventListener("click", () => {
        if (b.dataset.term) ITP.store.removeReview(b.dataset.term);
        if (b.dataset.calc) ITP.store.removeCalc(b.dataset.calc);
        draw();
      }));
    }

    draw();
  }
};
