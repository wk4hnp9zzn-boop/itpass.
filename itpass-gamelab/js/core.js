/*
 * 共通処理：試験の版（モード）、学習記録の保存（ブラウザ内）、便利関数
 */
window.ITP = window.ITP || {};

/* ---------- 試験の版（モード） ---------- */
ITP.MODES = {
  now: {
    label: "今年度版", short: "2026年度版",
    exam: "2026年度の試験（2027年3月まで）", basis: "シラバス Ver.6.4",
    cats: {
      S: { name: "ストラテジ", color: "s", desc: "経営・法務・企業活動・システム戦略" },
      M: { name: "マネジメント", color: "m", desc: "開発・プロジェクト・サービス管理・監査" },
      T: { name: "テクノロジ", color: "t", desc: "コンピュータ・ネットワーク・セキュリティ" }
    }
  },
  next: {
    label: "次年度以降版", short: "2027年度〜版",
    exam: "2027年度からの新試験（120分・100問）", basis: "シラバス案 Ver.0.1（2026年8月公表）",
    cats: {
      B: { name: "ビジネス", color: "s", desc: "DX・データ/AI活用・経営・組織・マネジメント" },
      T: { name: "テクノロジ", color: "t", desc: "デジタル技術・クラウド・AI技術・システム開発" },
      E: { name: "セキュリティ・倫理", color: "e", desc: "脅威と対策・法規・情報倫理・AI倫理" }
    }
  }
};

/** モードに合わせて ITP.TERMS（出題する用語）と ITP.CATS（分野）を組み立てる */
ITP.setMode = function (mode) {
  if (!ITP.MODES[mode]) mode = "now";
  ITP.mode = mode;
  ITP.CATS = ITP.MODES[mode].cats;
  if (mode === "next") {
    const ov = ITP.NEXT_OVERRIDES || {}, def = ITP.NEXT_DEFAULT || {};
    ITP.TERMS = ITP.TERMS_NOW.map(t => Object.assign({}, t, { cat: ov[t.term] || def[t.cat] }))
      .concat((ITP.TERMS_NEXT_ADD || []).map(t => Object.assign({}, t, { isNew: true })));
  } else {
    ITP.TERMS = ITP.TERMS_NOW.map(t => Object.assign({}, t));
  }
  if (ITP.store) ITP.store.setMode(mode);
};

/* ---------- 便利関数 ---------- */
ITP.util = {
  shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },
  esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  },
  fmtTime(sec) {
    sec = Math.max(0, Math.round(sec));
    const m = Math.floor(sec / 60), s = sec % 60;
    return m + ":" + String(s).padStart(2, "0");
  },
  catTag(cat) {
    const c = ITP.CATS[cat];
    return `<span class="tag tag-${c.color}">${c.name}</span>`;
  },
  /** 新シラバス案で追加された用語の目印 */
  newTag(t) {
    return t && t.isNew ? `<span class="tag tag-new" title="新試験のシラバス案で登場する用語">NEW</span>` : "";
  },
  /** 分野指定（"all" / 分野キー / "review"）から用語リストを返す */
  termsFor(cat) {
    if (cat === "review") {
      const set = new Set(ITP.store.reviewTerms());
      return ITP.TERMS.filter(t => set.has(t.term));
    }
    if (cat === "new") return ITP.TERMS.filter(t => t.isNew);
    if (ITP.CATS[cat]) return ITP.TERMS.filter(t => t.cat === cat);
    return ITP.TERMS.slice();
  },
  /** 学習レベルの低い用語を優先しつつシャッフル */
  pickWeighted(list, n) {
    const shuffled = ITP.util.shuffle(list);
    shuffled.sort((a, b) => ITP.store.level(a.term) - ITP.store.level(b.term));
    return ITP.util.shuffle(shuffled.slice(0, n));
  },
  /** ゲーム画面の見出し */
  head(icon, title, sub) {
    return `<div class="game-head">
      <a href="#/" class="back" aria-label="ホームに戻る">‹</a>
      <div><h1><span aria-hidden="true">${icon}</span> ${title}</h1>${sub ? `<p>${sub}</p>` : ""}</div>
    </div>`;
  },
  toast(msg, kind) {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.className = "show" + (kind ? " " + kind : "");
    clearTimeout(ITP.util._toastTimer);
    ITP.util._toastTimer = setTimeout(() => { el.className = ""; }, 1800);
  },
  /** 分野選択ボタン群のHTML */
  catPicker(selected, withReview) {
    const opts = [["all", "すべて"]].concat(Object.keys(ITP.CATS).map(k => [k, ITP.CATS[k].name]));
    if (ITP.TERMS.some(t => t.isNew)) opts.push(["new", "新シラバス用語"]);
    if (withReview) opts.push(["review", "復習リスト"]);
    if (!opts.some(o => o[0] === selected)) selected = "all";
    return `<div class="chips" data-group="cat">` + opts.map(([v, l]) =>
      `<button type="button" class="chip ${v === selected ? "on" : ""} ${v === "review" ? "chip-review" : ""}" data-value="${v}">${l} <small>${ITP.util.termsFor(v).length}</small></button>`
    ).join("") + `</div>`;
  },
  /** チップ選択の共通挙動。選ばれた値を返す関数を返す */
  bindChips(root) {
    root.querySelectorAll(".chips").forEach(group => {
      group.addEventListener("click", e => {
        const b = e.target.closest(".chip");
        if (!b) return;
        group.querySelectorAll(".chip").forEach(x => x.classList.remove("on"));
        b.classList.add("on");
      });
    });
    return name => {
      const on = root.querySelector(`.chips[data-group="${name}"] .chip.on`);
      return on ? on.dataset.value : null;
    };
  }
};

/* ---------- 学習記録 ---------- */
(function () {
  const KEY = "itpass-gamelab-v1";
  const blank = () => ({ mode: "now", terms: {}, reviewTerms: [], reviewCalc: [], best: {} });
  let state = blank();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = Object.assign(blank(), JSON.parse(raw));
  } catch (e) { /* 保存できない環境でも動くようにする */ }

  const save = () => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { }
    if (ITP.store.onChange) ITP.store.onChange();
  };
  const addUnique = (arr, v) => { if (!arr.includes(v)) arr.push(v); };
  const remove = (arr, v) => { const i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); };

  /*
   * 習熟レベル（0〜3）
   *   正解 / 「知ってる」 … +1
   *   不正解 / 「知らない」… 0 に戻して復習リストへ
   *   レベル2以上を「習得済み」としてゲージに表示
   */
  ITP.store = {
    MASTER_LEVEL: 2,
    getMode() { return state.mode || "now"; },
    setMode(m) { if (state.mode !== m) { state.mode = m; save(); } },
    level(term) { return (state.terms[term] && state.terms[term].lv) || 0; },
    correct(term) {
      const t = state.terms[term] || (state.terms[term] = { lv: 0 });
      t.lv = Math.min(3, t.lv + 1);
      remove(state.reviewTerms, term);
      save();
    },
    wrong(term) {
      state.terms[term] = { lv: 0 };
      addUnique(state.reviewTerms, term);
      save();
    },
    /** 仕分けゲームでのミス：レベルを1下げて復習リストへ */
    soft(term) {
      const t = state.terms[term] || (state.terms[term] = { lv: 0 });
      t.lv = Math.max(0, t.lv - 1);
      addUnique(state.reviewTerms, term);
      save();
    },
    /** 今のモードで出題される用語だけを返す（他モード専用の用語は保持したまま非表示） */
    reviewTerms() {
      const set = new Set(ITP.TERMS.map(x => x.term));
      return state.reviewTerms.filter(t => set.has(t));
    },
    removeReview(term) { remove(state.reviewTerms, term); save(); },
    calcCorrect(id) { remove(state.reviewCalc, id); save(); },
    calcWrong(id) { addUnique(state.reviewCalc, id); save(); },
    reviewCalc() { return state.reviewCalc.filter(id => ITP.CALC.some(c => c.id === id)); },
    removeCalc(id) { remove(state.reviewCalc, id); save(); },
    reviewCount() { return this.reviewTerms().length + this.reviewCalc().length; },
    best(key) { return state.best[key]; },
    /** better(新, 旧) が true なら記録更新。更新したら true を返す */
    setBest(key, val, better) {
      const old = state.best[key];
      if (old === undefined || better(val, old)) { state.best[key] = val; save(); return true; }
      return false;
    },
    progress(cat) {
      const list = ITP.TERMS.filter(t => !cat || t.cat === cat);
      let mastered = 0, learning = 0;
      list.forEach(t => {
        const lv = this.level(t.term);
        if (lv >= this.MASTER_LEVEL) mastered++; else if (lv > 0) learning++;
      });
      return { total: list.length, mastered, learning };
    },
    reset() { const m = state.mode; state = blank(); state.mode = m; save(); }
  };
})();

ITP.setMode(ITP.store.getMode());
