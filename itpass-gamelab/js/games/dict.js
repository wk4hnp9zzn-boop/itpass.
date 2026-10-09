/*
 * 用語辞典
 *   収録用語を検索・分野別に一覧できる。各用語の習熟レベルも表示。
 */
window.ITP = window.ITP || {};
ITP.games = ITP.games || {};

ITP.games.dict = {
  title: "用語辞典",
  render(root) {
    const U = ITP.util;
    const LV_LABEL = ["未学習", "学習中", "習得済み", "習得済み"];

    root.innerHTML = `
      ${U.head("📖", "用語辞典", `${ITP.MODES[ITP.mode].label}の収録用語 ${ITP.TERMS.length}語。用語名や説明の言葉で検索できます。`)}
      <div class="panel dict-tools">
        <label class="search">
          <span aria-hidden="true">🔎</span>
          <input type="search" id="q" placeholder="例：クラウド、暗号、AI" autocomplete="off" aria-label="用語を検索">
        </label>
        <span class="filter-label">分野</span>
        ${U.catPicker("all", true)}
        <span class="filter-label">覚えた度合い</span>
        <div class="chips" data-group="lv">
          <button type="button" class="chip on" data-value="any">すべて</button>
          <button type="button" class="chip" data-value="todo">まだ覚えていない</button>
          <button type="button" class="chip" data-value="done">習得済み</button>
        </div>
      </div>
      <p class="counter" id="count" aria-live="polite"></p>
      <ul class="dict-list" id="list"></ul>`;

    const get = U.bindChips(root);
    const q = root.querySelector("#q"), list = root.querySelector("#list"), count = root.querySelector("#count");
    const norm = s => s.toLowerCase().normalize("NFKC");
    const sorted = ITP.TERMS.slice().sort((a, b) => a.term.localeCompare(b.term, "ja"));

    function draw() {
      const word = norm(q.value.trim());
      const lv = get("lv");
      const pool = new Set(U.termsFor(get("cat")).map(t => t.term));
      const hits = sorted.filter(t => {
        if (!pool.has(t.term)) return false;
        const L = ITP.store.level(t.term);
        if (lv === "todo" && L >= ITP.store.MASTER_LEVEL) return false;
        if (lv === "done" && L < ITP.store.MASTER_LEVEL) return false;
        return !word || norm(t.term).includes(word) || norm(t.desc).includes(word);
      });
      count.textContent = `${hits.length}語`;
      list.innerHTML = hits.length ? hits.map(t => {
        const L = ITP.store.level(t.term);
        return `<li>
          <div class="dl-head">${U.catTag(t.cat)}${U.newTag(t)}<b>${U.esc(t.term)}</b>
            <span class="lv lv-${Math.min(L, 2)}" title="${LV_LABEL[L]}" aria-label="${LV_LABEL[L]}">${"●".repeat(Math.min(L, 3))}${"○".repeat(3 - Math.min(L, 3))}</span>
          </div>
          <p>${U.esc(t.desc)}</p>
        </li>`;
      }).join("") : `<li class="dict-empty">見つかりませんでした。別の言葉で検索してみてください。</li>`;
    }

    q.addEventListener("input", draw);
    root.querySelectorAll(".chips").forEach(g => g.addEventListener("click", () => setTimeout(draw)));
    draw();
  }
};
