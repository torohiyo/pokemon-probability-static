const EFFECTS = {
  professor: {
    label: '博士の研究', short: '博士', mode: 'discard', draw: 7, compress: 0,
    description: '手札をトラッシュして7枚引く',
    imageUrl: 'https://www.pokemon-card.com/assets/images/card_images/large/S8b/041094_T_HAKASENOKENKIXYUUARARAGI.jpg',
  },
  lillie_strong: {
    label: 'リーリエの決心強', short: 'リーリエ強', mode: 'shuffle', draw: 8, compress: 0,
    description: '手札を山札に戻し8枚引く',
    imageUrl: 'https://www.pokemon-card.com/assets/images/card_images/large/M1L/048448_T_RIRIENOKESSHIN.jpg',
  },
  lillie_weak: {
    label: 'リーリエの決心弱', short: 'リーリエ弱', mode: 'shuffle', draw: 6, compress: 0,
    description: '手札を山札に戻し6枚引く',
    imageUrl: 'https://www.pokemon-card.com/assets/images/card_images/large/M2a/048697_T_RIRIENOKESSHIN.jpg',
  },
  redcard: {
    label: 'スペシャルレッドカード', short: 'レッドカード', mode: 'bottom', draw: 3, compress: 0,
    description: '手札を山札の下に戻し3枚引く',
    imageUrl: 'https://www.pokemon-card.com/assets/images/card_images/large/M4/050156_T_SUPESHIXYARUREDDOKADO.jpg',
  },
  sakateni: {
    label: 'さかてにとる', short: 'さかてに', mode: 'draw', draw: 3, compress: 0,
    description: '山札を3枚引く',
    imageUrl: 'https://www.pokemon-card.com/assets/images/card_images/large/SV6a/046066_P_KICHIKIGISUEX.jpg',
  },
  dash: {
    label: 'お使いダッシュ', short: 'ダッシュ', mode: 'draw', draw: 2, compress: 0,
    description: '山札を2枚引く',
    imageUrl: 'https://www.pokemon-card.com/assets/images/card_images/large/M1S/047847_P_MGARURAEX.jpg',
  },
  midori: {
    label: 'みどりのまい', short: 'みどり', mode: 'draw', draw: 1, compress: 0,
    description: '山札を1枚引く',
    imageUrl: 'https://www.pokemon-card.com/assets/images/card_images/large/MC/048798_P_OGAPONMIDORINOMENEX.jpg',
  },
  compress: {
    label: '山札圧縮', short: '圧縮', mode: 'compress', draw: 0, compress: 1,
    description: '山札の枚数をn枚減らす',
    imageUrl: '',
  },
};

const PRESETS = {
  custom: { label: 'カスタム', short: '自由', mode: 'draw', draw: 1, compress: 0, description: '自由入力', imageUrl: '' },
  ...EFFECTS,
};

let steps = [];

function defaultTargets() {
  return [
    { name: '引きたいカード1', copies: 1 },
    { name: '引きたいカード2', copies: 0 },
    { name: '引きたいカード3', copies: 0 },
  ];
}

function makeStep(id, overrides = {}) {
  return {
    id,
    preset: 'custom',
    mode: 'draw', // draw / discard / shuffle / bottom / compress
    draw: 1,
    compress: 0,
    condition: 'any', // any / all / atLeast
    min: 1,
    targets: defaultTargets(),
    ...overrides,
  };
}

function applyEffectToStep(step, key) {
  const effect = PRESETS[key];
  if (!effect) return;
  step.preset = key;
  step.mode = effect.mode;
  step.draw = effect.draw;
  step.compress = effect.compress || 0;
}

function addEffectStep(key) {
  const step = makeStep(Date.now() + Math.random());
  applyEffectToStep(step, key);
  steps.push(step);
  renderAll();
}

function num(id, min = 0, max = 999) {
  const el = document.getElementById(id);
  const raw = String(el.value).trim();
  if (raw === '') return min;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.floor(n))) : min;
}

function safeNum(value, min = 0, max = 999) {
  const raw = String(value).trim();
  if (raw === '') return min;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.floor(n))) : min;
}

function normalizeNumberInput(input) {
  const raw = String(input.value).trim();
  if (raw === '') return;
  const min = Number(input.min || 0);
  const max = Number(input.max || 999);
  const n = Number(raw);
  if (!Number.isFinite(n)) { input.value = ''; return; }
  input.value = Math.max(min, Math.min(max, Math.floor(n)));
}

function formatPct(p) {
  if (!Number.isFinite(p)) return '—';
  if (p <= 0) return '0%';
  if (p >= 1) return '100%';
  return `${(p * 100).toFixed(p < 0.001 ? 4 : 2)}%`;
}

function comb(n, k) {
  n = Math.floor(n); k = Math.floor(k);
  if (k < 0 || k > n) return 0;
  k = Math.min(k, n - k);
  let result = 1;
  for (let i = 1; i <= k; i++) result = (result * (n - k + i)) / i;
  return result;
}

function activeTargets(step) {
  return step.targets
    .map((t, i) => ({ name: String(t.name || `カード${i + 1}`).trim() || `カード${i + 1}`, copies: safeNum(t.copies, 0, 60) }))
    .filter((t) => t.copies > 0);
}

function enumerateTargetDraws(deck, draw, targets) {
  const n = Math.min(draw, deck);
  const targetTotal = targets.reduce((s, t) => s + t.copies, 0);
  const other = deck - targetTotal;
  const total = comb(deck, n);
  const outcomes = [];
  if (total <= 0 || other < 0) return outcomes;

  function walk(index, used, counts, ways) {
    if (index === targets.length) {
      const o = n - used;
      if (o < 0 || o > other) return;
      outcomes.push({ counts, totalHit: used, prob: (ways * comb(other, o)) / total });
      return;
    }
    const max = Math.min(targets[index].copies, n - used);
    for (let x = 0; x <= max; x++) {
      walk(index + 1, used + x, [...counts, x], ways * comb(targets[index].copies, x));
    }
  }
  walk(0, 0, [], 1);
  return outcomes;
}

function stepProbability(deck, draw, step) {
  if (step.mode === 'compress') return 1;
  const targets = activeTargets(step);
  if (targets.length === 0) return 1;
  const targetTotal = targets.reduce((s, t) => s + t.copies, 0);
  if (deck <= 0 || draw <= 0 || targetTotal <= 0 || targetTotal > deck) return 0;

  let p = 0;
  for (const out of enumerateTargetDraws(deck, draw, targets)) {
    let ok = false;
    if (step.condition === 'any') ok = out.counts.some((x) => x >= 1);
    if (step.condition === 'all') ok = out.counts.every((x) => x >= 1);
    if (step.condition === 'atLeast') ok = out.totalHit >= safeNum(step.min, 1, 8);
    if (ok) p += out.prob;
  }
  return p;
}

function getInitial() {
  return { deck: num('deck', 1, 60), hand: num('hand', 0, 20) };
}

function effectLabel(step) {
  return (PRESETS[step.preset] || PRESETS.custom).label;
}

function modeHelp(step) {
  const draw = safeNum(step.draw, 0, 60);
  const compress = safeNum(step.compress, 0, 60);
  return {
    draw: `現在の山札から${draw}枚引きます。`,
    discard: `現在の手札をトラッシュして、山札から${draw}枚引きます。`,
    shuffle: `現在の手札を山札に戻してから、山札を${draw}枚引きます。`,
    bottom: `現在の手札を山札の下に戻してから、山札を${draw}枚引きます。戻した手札はこのドローでは引かない扱いです。`,
    compress: `山札を${compress}枚圧縮します。確率判定は行わず、以降の山札枚数だけ減らします。`,
  }[step.mode] || '';
}

function conditionLabel(step) {
  if (step.mode === 'compress') return '山札枚数を減らす';
  const targets = activeTargets(step);
  if (targets.length === 0) return '条件なし';
  const names = targets.map((t) => `${t.name}${t.copies}枚`).join(' / ');
  if (step.condition === 'any') return `${names} のどれかを1枚以上`;
  if (step.condition === 'all') return `${names} をすべて1枚以上`;
  return `${names} の合計${safeNum(step.min, 1, 8)}枚以上`;
}

function renderEffectRail() {
  const rail = document.getElementById('effectRail');
  rail.innerHTML = Object.entries(EFFECTS).map(([key, effect]) => `
    <button class="effect-card" data-effect="${key}" aria-label="${effect.label}を追加">
      <div class="effect-art">
        ${effect.imageUrl ? `<img src="${effect.imageUrl}" alt="${effect.label}" loading="lazy" />` : `<div class="effect-fallback"><b>${effect.short}</b><span>${effect.description}</span></div>`}
      </div>
      <div class="effect-meta"><strong>${effect.label}</strong><span>${effect.description}</span></div>
    </button>
  `).join('');
  rail.querySelectorAll('[data-effect]').forEach((button) => button.addEventListener('click', () => addEffectStep(button.dataset.effect)));
}

function imageFor(step) {
  return (PRESETS[step.preset] || PRESETS.custom).imageUrl || '';
}

function renderSteps() {
  const wrap = document.getElementById('steps');
  wrap.innerHTML = '';
  if (steps.length === 0) {
    wrap.innerHTML = '<section class="card"><p>上のカード画像をタップして、計算したい順番で効果を追加してください。</p></section>';
    return;
  }

  steps.forEach((step, index) => {
    const preset = PRESETS[step.preset] || PRESETS.custom;
    const img = imageFor(step);
    const el = document.createElement('section');
    el.className = 'card step-card';
    el.innerHTML = `
      <div class="step-head">
        <div><p class="eyebrow">STEP ${index + 1}</p><h3>${effectLabel(step)}</h3><p>${modeHelp(step)}</p></div>
        <button class="delete-button" data-action="delete">×</button>
      </div>
      <div class="step-main">
        <div class="step-thumb">${img ? `<img src="${img}" alt="${preset.label}" loading="lazy" />` : `<span>${preset.short || '自由'}</span>`}</div>
        <div class="step-controls">
          <label class="field">
            <span>カード効果</span>
            <select data-action="preset">
              ${Object.entries(PRESETS).map(([key, p]) => `<option value="${key}" ${step.preset === key ? 'selected' : ''}>${p.label}</option>`).join('')}
            </select>
          </label>
          <div class="effect-box">
            <div class="grid two">
              ${step.mode === 'compress' ? numberMarkup('圧縮する枚数', 'compress', step.compress, 0, 30) : numberMarkup('この効果で引く枚数', 'draw', step.draw, 0, 30)}
            </div>
            <p>${modeHelp(step)}</p>
          </div>
        </div>
      </div>
      ${step.mode === 'compress' ? '' : `
        <details class="details" open>
          <summary>引きたいカード・条件の詳細設定</summary>
          <div class="details-body">
            <div class="target-list">
              ${step.targets.map((target, i) => targetRowMarkup(target, i)).join('')}
            </div>
            <div class="condition-box">
              <div class="condition-tabs">
                ${conditionButton(step, 'any', 'どれか1種')}
                ${conditionButton(step, 'all', 'すべて')}
                ${conditionButton(step, 'atLeast', '合計n枚以上')}
              </div>
              <div class="min-grid" style="display:${step.condition === 'atLeast' ? 'grid' : 'none'}">
                ${[1,2,3,4,5,6,7,8].map((n) => `<button class="min-button ${safeNum(step.min,1,8) === n ? 'active' : ''}" data-action="min" data-min="${n}">${n}</button>`).join('')}
              </div>
              <p>${conditionLabel(step)}</p>
            </div>
          </div>
        </details>`}
      <div class="step-prob"><span>このステップの成功率</span><strong id="stepProb-${step.id}">—</strong></div>
    `;

    el.querySelectorAll('input').forEach((input) => {
      input.addEventListener('input', () => {
        const key = input.dataset.key;
        const targetIndex = input.dataset.targetIndex;
        if (targetIndex !== undefined) {
          const t = step.targets[Number(targetIndex)];
          if (key === 'targetName') t.name = input.value;
          if (key === 'targetCopies') t.copies = safeNum(input.value, 0, 60);
        } else {
          step[key] = safeNum(input.value, Number(input.min || 0), Number(input.max || 60));
          step.preset = step.preset === 'custom' ? 'custom' : step.preset;
        }
        calculate();
      });
      input.addEventListener('blur', () => { if (input.type === 'number') normalizeNumberInput(input); });
    });

    el.querySelectorAll('select').forEach((select) => {
      select.addEventListener('change', () => { applyEffectToStep(step, select.value); renderSteps(); calculate(); });
    });

    el.querySelectorAll('button').forEach((button) => {
      button.addEventListener('click', () => {
        const action = button.dataset.action;
        if (action === 'delete') steps = steps.filter((s) => s.id !== step.id);
        if (action === 'condition') step.condition = button.dataset.condition;
        if (action === 'min') { step.condition = 'atLeast'; step.min = safeNum(button.dataset.min, 1, 8); }
        renderSteps();
        calculate();
      });
    });

    wrap.appendChild(el);
  });
}

function numberMarkup(label, key, value, min = 0, max = 60) {
  return `<label class="field"><span>${label}</span><input data-key="${key}" type="number" inputmode="numeric" min="${min}" max="${max}" value="${value}" /></label>`;
}

function targetRowMarkup(target, index) {
  return `<div class="target-row">
    <label class="field"><span>カード名</span><input data-key="targetName" data-target-index="${index}" type="text" value="${escapeHtml(target.name)}" placeholder="例：さかてにとる" /></label>
    <label class="field"><span>山に残る枚数</span><input data-key="targetCopies" data-target-index="${index}" type="number" inputmode="numeric" min="0" max="60" value="${target.copies}" /></label>
  </div>`;
}

function conditionButton(step, condition, label) {
  return `<button class="pill-button ${step.condition === condition ? 'active' : ''}" data-action="condition" data-condition="${condition}">${label}</button>`;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
}

function calculate() {
  let { deck, hand } = getInitial();
  let total = 1;
  const rows = [];

  if (steps.length === 0) {
    setResult('—', 'カード効果を追加してください。', '');
    return;
  }

  for (const step of steps) {
    const beforeDeck = deck;
    const beforeHand = hand;
    let drawDeck = deck;
    let draw = safeNum(step.draw, 0, 30);
    let prob = 1;

    if (step.mode === 'shuffle') drawDeck = deck + hand;
    if (step.mode === 'bottom') drawDeck = deck;
    if (step.mode === 'discard') drawDeck = deck;
    if (step.mode === 'draw') drawDeck = deck;

    if (step.mode === 'compress') {
      const c = Math.min(safeNum(step.compress, 0, 30), deck);
      deck -= c;
      prob = 1;
      hand = hand;
    } else {
      draw = Math.min(draw, drawDeck);
      prob = stepProbability(drawDeck, draw, step);
      total *= prob;

      if (step.mode === 'shuffle') {
        deck = Math.max(0, deck + beforeHand - draw);
        hand = draw;
      } else if (step.mode === 'bottom') {
        deck = Math.max(0, deck - draw + beforeHand);
        hand = draw;
      } else if (step.mode === 'discard') {
        deck = Math.max(0, deck - draw);
        hand = draw;
      } else {
        deck = Math.max(0, deck - draw);
        hand = beforeHand + draw;
      }
    }

    rows.push({ step, beforeDeck, beforeHand, drawDeck, draw, prob, afterDeck: deck, afterHand: hand });
  }

  setResult(formatPct(total), `${steps.length}ステップをすべて成功した場合の合計確率です。想定終了状態：山札${deck}枚 / 手札${hand}枚`, rows);
}

function setResult(percent, summary, rows) {
  document.getElementById('totalProb').textContent = percent;
  document.getElementById('totalProbTop').textContent = percent;
  document.getElementById('resultSummary').textContent = summary;
  document.getElementById('resultSummaryTop').textContent = summary;

  const timeline = document.getElementById('timeline');
  if (!Array.isArray(rows)) { timeline.innerHTML = ''; return; }

  rows.forEach((row) => {
    const el = document.getElementById(`stepProb-${row.step.id}`);
    if (el) el.textContent = formatPct(row.prob);
  });

  timeline.innerHTML = rows.map((row, i) => `
    <div class="timeline-row">
      <div class="badge">${i + 1}</div>
      <div>
        <b>${formatPct(row.prob)}</b>
        <p>${effectLabel(row.step)} / ${conditionLabel(row.step)} / 判定山札 ${row.drawDeck}枚 → 終了後 山札${row.afterDeck}枚・手札${row.afterHand}枚</p>
      </div>
    </div>
  `).join('');
}

function renderAll() {
  renderEffectRail();
  renderSteps();
  calculate();
}

['deck', 'hand'].forEach((id) => {
  const input = document.getElementById(id);
  input.addEventListener('input', calculate);
  input.addEventListener('blur', () => normalizeNumberInput(input));
});

document.getElementById('addStep').addEventListener('click', () => {
  steps.push(makeStep(Date.now()));
  renderSteps();
  calculate();
});

document.getElementById('clearSteps').addEventListener('click', () => {
  steps = [];
  renderSteps();
  calculate();
});

renderAll();
