const EFFECTS = {
  lillie_strong: {
    label: 'リーリエの決心強', short: 'リ強', mode: 'shuffle', draw: 8, compress: 0,
    imageUrl: 'https://www.pokemon-card.com/assets/images/card_images/large/M1L/048448_T_RIRIENOKESSHIN.jpg',
  },
  lillie_weak: {
    label: 'リーリエの決心弱', short: 'リ弱', mode: 'shuffle', draw: 6, compress: 0,
    imageUrl: 'https://www.pokemon-card.com/assets/images/card_images/large/M2a/048697_T_RIRIENOKESSHIN.jpg',
  },
  redcard: {
    label: 'スペシャルレッドカード', short: '赤', mode: 'bottom', draw: 3, compress: 0,
    imageUrl: 'https://www.pokemon-card.com/assets/images/card_images/large/M4/050156_T_SUPESHIXYARUREDDOKADO.jpg',
  },
  unfair5: {
    label: "アンフェアスタンプ", short: "不5", mode: "shuffle", draw: 5, compress: 0,
    imageUrl: "https://www.pokemon-card.com/assets/images/card_images/large/MC/049349_T_ANFUEASUTANPU.jpg",
  },
  unfair2: {
    label: "アンフェアスタンプ2", short: "不2", mode: "shuffle", draw: 2, compress: 0,
    imageUrl: "https://www.pokemon-card.com/assets/images/card_images/large/MC/049349_T_ANFUEASUTANPU.jpg",
  },
  sakateni: {
    label: 'さかてにとる', short: '逆', mode: 'draw', draw: 3, compress: 0,
    imageUrl: 'https://www.pokemon-card.com/assets/images/card_images/large/SV6a/046066_P_KICHIKIGISUEX.jpg',
  },
  dash: {
    label: 'お使いダッシュ', short: '走', mode: 'draw', draw: 2, compress: 0,
    imageUrl: 'https://www.pokemon-card.com/assets/images/card_images/large/M1S/047847_P_MGARURAEX.jpg',
  },
  midori: {
    label: 'みどりのまい', short: '緑', mode: 'draw', draw: 1, compress: 0,
    imageUrl: 'https://www.pokemon-card.com/assets/images/card_images/large/MC/048798_P_OGAPONMIDORINOMENEX.jpg',
  },
  compress: {
    label: '山札圧縮', short: '圧', mode: 'compress', draw: 0, compress: 1,
    imageUrl: 'https://www.pokemon-card.com/assets/images/card_images/large/XY/037415_T_BATORUKONPURESSAFUREADANGIA.jpg',
  },
};

let steps = [];
let globalCondition = 'any';
let globalMin = 1;

function makeStep(key) {
  const e = EFFECTS[key];
  return {
    id: Date.now() + Math.random(),
    key,
    mode: e.mode,
    draw: e.draw,
    compress: e.compress || 0,
  };
}

function num(id, min = 0, max = 999) {
  const el = document.getElementById(id);
  const raw = String(el.value).trim();
  if (raw === '') return min;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.floor(n))) : min;
}

function normalizeNumberInput(input) {
  const raw = String(input.value).trim();
  if (raw === '') input.value = input.min || '0';
}

function comb(n, k) {
  n = Math.floor(n); k = Math.floor(k);
  if (k < 0 || k > n) return 0;
  k = Math.min(k, n - k);
  let result = 1;
  for (let i = 1; i <= k; i++) result = (result * (n - k + i)) / i;
  return result;
}

function formatPct(p) {
  if (!Number.isFinite(p)) return '—';
  if (p <= 0) return '0%';
  if (p >= 0.99995 && p < 1) return '99.99%';
  return `${(p * 100).toFixed(2)}%`;
}

function stateKey(s) {
  return [s.deck, s.hand, ...s.unseenDeck, ...s.seenDeck, ...s.seenHand, ...s.hits].join('|');
}

function addDist(map, state, prob) {
  if (prob <= 0) return;
  const key = stateKey(state);
  const prev = map.get(key);
  if (prev) prev.prob += prob;
  else map.set(key, { state, prob });
}

function splitComb(totalA, totalB, take, maxTake) {
  const out = [];
  for (let a = 0; a <= Math.min(totalA, take, maxTake); a++) {
    const b = take - a;
    if (b < 0 || b > totalB) continue;
    out.push({ a, ways: comb(totalA, a) * comb(totalB, b) });
  }
  return out;
}

function enumerateDraw(state, draw) {
  const n = Math.min(draw, state.deck);
  const u = state.unseenDeck;
  const sd = state.seenDeck;
  const targetDeck = u.reduce((a,b)=>a+b,0) + sd.reduce((a,b)=>a+b,0);
  const other = state.deck - targetDeck;
  const totalWays = comb(state.deck, n);
  const results = [];
  if (totalWays <= 0 || other < 0) return results;

  function walk(i, used, unseenDrawn, seenDrawn, ways) {
    if (i === u.length) {
      const otherDrawn = n - used;
      if (otherDrawn < 0 || otherDrawn > other) return;
      results.push({ unseenDrawn, seenDrawn, prob: (ways * comb(other, otherDrawn)) / totalWays });
      return;
    }
    const maxFromCat = u[i] + sd[i];
    const maxTake = Math.min(maxFromCat, n - used);
    for (let take = 0; take <= maxTake; take++) {
      for (const split of splitComb(u[i], sd[i], take, maxTake)) {
        walk(
          i + 1,
          used + take,
          [...unseenDrawn, split.a],
          [...seenDrawn, take - split.a],
          ways * split.ways
        );
      }
    }
  }

  walk(0, 0, [], [], 1);
  return results;
}

function applyDraw(state, draw) {
  const next = [];
  for (const out of enumerateDraw(state, draw)) {
    const unseenDeck = state.unseenDeck.map((x, i) => x - out.unseenDrawn[i]);
    const seenDeck = state.seenDeck.map((x, i) => x - out.seenDrawn[i]);
    const seenHand = state.seenHand.map((x, i) => x + out.unseenDrawn[i] + out.seenDrawn[i]);
    const hits = state.hits.map((x, i) => x + out.unseenDrawn[i]);
    next.push({
      state: { ...state, deck: Math.max(0, state.deck - Math.min(draw, state.deck)), hand: state.hand + Math.min(draw, state.deck), unseenDeck, seenDeck, seenHand, hits },
      prob: out.prob,
    });
  }
  return next;
}

function applyStepToState(state, step) {
  if (step.mode === 'compress') {
    const totalTargetDeck = state.unseenDeck.reduce((a,b)=>a+b,0) + state.seenDeck.reduce((a,b)=>a+b,0);
    const removableOther = Math.max(0, state.deck - totalTargetDeck);
    const c = Math.min(step.compress, removableOther);
    return [{ state: { ...state, deck: state.deck - c }, prob: 1 }];
  }

  if (step.mode === 'discard') {
    const base = {
      ...state,
      hand: 0,
      seenHand: state.seenHand.map(() => 0),
    };
    return applyDraw(base, step.draw).map(({ state: s, prob }) => ({ state: { ...s, hand: Math.min(step.draw, base.deck) }, prob }));
  }

  if (step.mode === 'shuffle') {
    const base = {
      ...state,
      deck: state.deck + state.hand,
      hand: 0,
      seenDeck: state.seenDeck.map((x, i) => x + state.seenHand[i]),
      seenHand: state.seenHand.map(() => 0),
    };
    return applyDraw(base, step.draw).map(({ state: s, prob }) => ({ state: { ...s, hand: Math.min(step.draw, base.deck) }, prob }));
  }

  if (step.mode === 'bottom') {
    const base = {
      ...state,
      hand: 0,
      seenHand: state.seenHand.map(() => 0),
    };
    const oldHand = state.hand;
    const oldSeenHand = state.seenHand;
    return applyDraw(base, step.draw).map(({ state: s, prob }) => ({
      state: {
        ...s,
        deck: s.deck + oldHand,
        hand: Math.min(step.draw, base.deck),
        seenDeck: s.seenDeck.map((x, i) => x + oldSeenHand[i]),
      },
      prob,
    }));
  }

  return applyDraw(state, step.draw);
}

function conditionMet(hits, targets) {
  const active = targets.map((x, i) => ({ x, i })).filter((t) => t.x > 0);
  if (active.length === 0) return true;
  if (globalCondition === 'any') return active.some((t) => hits[t.i] >= 1);
  if (globalCondition === 'all') return active.every((t) => hits[t.i] >= 1);
  return hits.reduce((a,b)=>a+b,0) >= globalMin;
}

function getInitial() {
  const deck = num('deck', 1, 60);
  const hand = num('hand', 0, 20);
  const targets = [num('targetA', 0, 60), num('targetB', 0, 60), num('targetC', 0, 60)];
  return { deck, hand, targets };
}

function calculate() {
  const { deck, hand, targets } = getInitial();
  updateConditionText(targets);

  if (steps.length === 0) {
    setResult('—', 'カード効果を追加してください。', []);
    return;
  }

  if (targets.reduce((a,b)=>a+b,0) > deck) {
    setResult('—', '目的カードの合計枚数が山札枚数を超えています。', []);
    return;
  }

  let dist = new Map();
  addDist(dist, {
    deck,
    hand,
    unseenDeck: [...targets],
    seenDeck: [0, 0, 0],
    seenHand: [0, 0, 0],
    hits: [0, 0, 0],
  }, 1);

  const rows = [];
  for (const step of steps) {
    const next = new Map();
    for (const item of dist.values()) {
      for (const out of applyStepToState(item.state, step)) {
        addDist(next, out.state, item.prob * out.prob);
      }
    }
    dist = next;
    const mass = [...dist.values()].reduce((s, x) => s + x.prob, 0);
    const avgDeck = [...dist.values()].reduce((s, x) => s + x.prob * x.state.deck, 0) / Math.max(mass, 1e-12);
    const avgHand = [...dist.values()].reduce((s, x) => s + x.prob * x.state.hand, 0) / Math.max(mass, 1e-12);
    rows.push({ step, avgDeck, avgHand });
  }

  let success = 0;
  for (const item of dist.values()) {
    if (conditionMet(item.state.hits, targets)) success += item.prob;
  }

  setResult(formatPct(success), `${steps.length}手順後に「${conditionText(targets)}」を満たす確率です。`, rows);
}

function conditionText(targets) {
  const active = targets.map((x, i) => ({ label: ['A','B','C'][i], x })).filter((t) => t.x > 0);
  if (active.length === 0) return '条件なし';
  if (globalCondition === 'any') return `${active.map((t)=>`${t.label}${t.x}枚`).join(' / ')} のどれか1枚以上`;
  if (globalCondition === 'all') return `${active.map((t)=>`${t.label}${t.x}枚`).join(' / ')} をすべて1枚以上`;
  return `A/B/C合計${globalMin}枚以上`;
}

function updateConditionText(targets) {
  document.getElementById('conditionText').textContent = conditionText(targets);
}

function setResult(percent, summary, rows) {
  document.getElementById('totalProb').textContent = percent;
  document.getElementById('totalProbTop').textContent = percent;
  document.getElementById('resultSummary').textContent = summary;
  document.getElementById('resultSummaryTop').textContent = summary;

  const timeline = document.getElementById('timeline');
  if (!rows || rows.length === 0) { timeline.innerHTML = ''; return; }
  timeline.innerHTML = rows.map((row, i) => `
    <div class="timeline-row">
      <div class="badge">${i + 1}</div>
      <div>
        <b>${EFFECTS[row.step.key].label}</b>
        <p>平均終了状態：山札${row.avgDeck.toFixed(1)}枚 / 手札${row.avgHand.toFixed(1)}枚</p>
      </div>
    </div>
  `).join('');
}

function renderEffectRail() {
  const rail = document.getElementById('effectRail');
  rail.innerHTML = Object.entries(EFFECTS).map(([key, effect]) => `
    <button class="effect-card" data-effect="${key}" aria-label="${effect.label}を追加" title="${effect.label}">
      <div class="effect-art">
        ${effect.imageUrl ? `<img src="${effect.imageUrl}" alt="${effect.label}" loading="lazy" />` : `<span class="effect-fallback">${effect.short}</span>`}
      </div>
    </button>
  `).join('');
  rail.querySelectorAll('[data-effect]').forEach((button) => button.addEventListener('click', () => {
    steps.push(makeStep(button.dataset.effect));
    renderSteps();
    calculate();
  }));
}

function renderSteps() {
  const wrap = document.getElementById('steps');
  if (steps.length === 0) {
    wrap.innerHTML = '<div class="empty-state">上のカード画像を、使う順番にタップしてください。</div>';
    return;
  }

  wrap.innerHTML = steps.map((step, index) => {
    const e = EFFECTS[step.key];
    return `
      <section class="step-card" title="STEP ${index + 1}: ${e.label}">
        <button class="delete-button" data-delete="${step.id}" aria-label="削除">×</button>
        <div class="step-thumb">${e.imageUrl ? `<img src="${e.imageUrl}" alt="${e.label}" loading="lazy" />` : e.short}</div>
        ${step.mode === 'compress' ? `<div class="step-compress"><input data-compress="${step.id}" type="number" inputmode="numeric" min="0" max="30" value="${step.compress}" aria-label="圧縮枚数" /></div>` : ''}
      </section>
    `;
  }).join('');

  wrap.querySelectorAll('[data-delete]').forEach((button) => button.addEventListener('click', () => {
    const id = Number(button.dataset.delete);
    steps = steps.filter((s) => s.id !== id);
    renderSteps();
    calculate();
  }));

  wrap.querySelectorAll('[data-compress]').forEach((input) => {
    input.addEventListener('input', () => {
      const id = Number(input.dataset.compress);
      const step = steps.find((s) => s.id === id);
      if (step) step.compress = Math.max(0, Math.min(30, Math.floor(Number(input.value || 0))));
      calculate();
    });
    input.addEventListener('blur', () => normalizeNumberInput(input));
  });
}

function updateConditionButtons() {
  document.querySelectorAll('[data-global-condition]').forEach((button) => {
    button.classList.toggle('active', button.dataset.globalCondition === globalCondition);
  });
  document.getElementById('minGrid').classList.toggle('hidden', globalCondition !== 'atLeast');
  document.querySelectorAll('[data-min]').forEach((button) => {
    button.classList.toggle('active', Number(button.dataset.min) === globalMin);
  });
}

['deck', 'hand', 'targetA', 'targetB', 'targetC'].forEach((id) => {
  const input = document.getElementById(id);
  input.addEventListener('input', calculate);
  input.addEventListener('blur', () => normalizeNumberInput(input));
});

document.querySelectorAll('[data-global-condition]').forEach((button) => {
  button.addEventListener('click', () => {
    globalCondition = button.dataset.globalCondition;
    updateConditionButtons();
    calculate();
  });
});

document.querySelectorAll('[data-min]').forEach((button) => {
  button.addEventListener('click', () => {
    globalCondition = 'atLeast';
    globalMin = Number(button.dataset.min);
    updateConditionButtons();
    calculate();
  });
});

document.getElementById('clearSteps').addEventListener('click', () => {
  steps = [];
  renderSteps();
  calculate();
});

renderEffectRail();
renderSteps();
updateConditionButtons();
calculate();
