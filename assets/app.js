const GROUPS = ['A', 'B', 'C'];

const PRESETS = {
  custom: { label: 'カスタム', mode: 'draw', draw: 3, hand: 0 },
  professor: { label: '博士の研究', mode: 'discard', draw: 7, hand: 0 },
  lillieStrong: { label: 'リーリエの決心強', mode: 'shuffle', draw: 8, hand: 5 },
  lillieWeak: { label: 'リーリエの決心弱', mode: 'shuffle', draw: 6, hand: 5 },
  redcard: { label: 'スペシャルレッドカード', mode: 'bottom', draw: 3, hand: 5 },
};

let steps = [
  makeStep(1, { draw: 3, condition: { type: 'any', groups: ['A'], min: 1 } }),
  makeStep(2, { preset: 'lillieStrong', mode: 'shuffle', hand: 5, draw: 8, condition: { type: 'any', groups: ['B', 'C'], min: 1 } }),
];

function makeStep(id, overrides = {}) {
  return {
    id,
    preset: 'custom',
    mode: 'draw', // draw / discard / shuffle / bottom
    draw: 3,
    hand: 0,
    condition: { type: 'any', groups: ['A'], min: 1 },
    ...overrides,
  };
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
  if (!Number.isFinite(n)) {
    input.value = '';
    return;
  }
  input.value = Math.max(min, Math.min(max, Math.floor(n)));
}

function formatPct(p) {
  if (!Number.isFinite(p)) return '—';
  if (p === 0) return '0%';
  if (p === 1) return '100%';
  return `${(p * 100).toFixed(p < 0.001 ? 4 : 2)}%`;
}

function comb(n, k) {
  if (k < 0 || k > n) return 0;
  k = Math.min(k, n - k);
  let result = 1;
  for (let i = 1; i <= k; i++) result = (result * (n - k + i)) / i;
  return result;
}

function hyperAtLeastOne(deck, targets, draw) {
  if (deck <= 0 || draw <= 0 || targets <= 0) return 0;
  draw = Math.min(draw, deck);
  const total = comb(deck, draw);
  if (total === 0) return 0;
  return 1 - comb(deck - targets, draw) / total;
}

function stateKey(state) { return `${state.deck}|${state.A}|${state.B}|${state.C}`; }
function validState(state) { return state.deck >= 0 && state.A >= 0 && state.B >= 0 && state.C >= 0 && state.A + state.B + state.C <= state.deck; }

function normalizeDist(dist) {
  const sum = [...dist.values()].reduce((acc, item) => acc + item.prob, 0);
  if (sum <= 0) return new Map();
  const next = new Map();
  for (const item of dist.values()) next.set(stateKey(item.state), { state: item.state, prob: item.prob / sum });
  return next;
}

function enumerateDrawOutcomes(state, draw) {
  const n = Math.min(draw, state.deck);
  const other = state.deck - state.A - state.B - state.C;
  const total = comb(state.deck, n);
  const outcomes = [];
  if (total <= 0) return outcomes;
  for (let a = 0; a <= Math.min(state.A, n); a++) {
    for (let b = 0; b <= Math.min(state.B, n - a); b++) {
      for (let c = 0; c <= Math.min(state.C, n - a - b); c++) {
        const o = n - a - b - c;
        if (o < 0 || o > other) continue;
        const ways = comb(state.A, a) * comb(state.B, b) * comb(state.C, c) * comb(other, o);
        if (ways <= 0) continue;
        outcomes.push({
          drawn: { A: a, B: b, C: c },
          prob: ways / total,
          nextState: { deck: state.deck - n, A: state.A - a, B: state.B - b, C: state.C - c },
        });
      }
    }
  }
  return outcomes;
}

function matchesCondition(drawn, condition) {
  if (condition.type === 'none') return true;
  if (condition.type === 'any') return condition.groups.some((g) => drawn[g] >= 1);
  if (condition.type === 'all') return condition.groups.every((g) => drawn[g] >= 1);
  if (condition.type === 'atLeast') return condition.groups.reduce((sum, g) => sum + drawn[g], 0) >= condition.min;
  return true;
}

function prepareStateForStep(state, step) {
  const hand = safeNum(step.hand, 0, 60);
  if (step.mode === 'shuffle') {
    // 手札を山札に混ぜる。対象枚数は「混ぜた後の山札内に存在する枚数」として扱う。
    return { ...state, deck: state.deck + hand };
  }
  // discard: 手札はトラッシュしてから引くので山札は増えない。
  // bottom: 手札は山札下に戻すため、このステップのドロー対象にはならない。
  return state;
}

function finishStateAfterStep(nextState, step) {
  const hand = safeNum(step.hand, 0, 60);
  if (step.mode === 'bottom') {
    // 下に戻したカードはこのドローでは引けないが、ドロー後の残山札には加わる。
    return { ...nextState, deck: nextState.deck + hand };
  }
  return nextState;
}

function prepareDist(dist, step) {
  const next = new Map();
  for (const item of dist.values()) {
    const state = prepareStateForStep(item.state, step);
    if (!validState(state)) continue;
    const key = stateKey(state);
    const current = next.get(key);
    next.set(key, { state, prob: (current?.prob || 0) + item.prob });
  }
  return next;
}

function applyStep(dist, step) {
  const before = prepareDist(dist, step);
  const weighted = new Map();
  let pass = 0;
  let all = 0;
  for (const item of before.values()) {
    for (const outcome of enumerateDrawOutcomes(item.state, safeNum(step.draw, 0, 60))) {
      const p = item.prob * outcome.prob;
      all += p;
      if (!matchesCondition(outcome.drawn, step.condition)) continue;
      pass += p;
      const finalState = finishStateAfterStep(outcome.nextState, step);
      const key = stateKey(finalState);
      const current = weighted.get(key);
      weighted.set(key, { state: finalState, prob: (current?.prob || 0) + p });
    }
  }
  return { probability: all > 0 ? pass / all : 0, next: normalizeDist(weighted) };
}

function summarizeDist(dist) {
  const sums = { deck: 0, A: 0, B: 0, C: 0 };
  for (const item of dist.values()) {
    sums.deck += item.state.deck * item.prob;
    for (const g of GROUPS) sums[g] += item.state[g] * item.prob;
  }
  return sums;
}

function getInitial() {
  return {
    deck: num('deck', 1, 60),
    A: num('copyA', 0, 60),
    B: num('copyB', 0, 60),
    C: num('copyC', 0, 60),
  };
}

function modeLabel(mode) {
  return {
    draw: '縦引き',
    discard: '手札をトラッシュして引く',
    shuffle: '手札を山札に混ぜて引く',
    bottom: '手札を山札の下に戻して引く',
  }[mode] || '縦引き';
}

function modeHelp(mode) {
  return {
    draw: '通常の縦引きです。現在の山札からそのまま引きます。',
    discard: '博士の研究など。手札はトラッシュされるため、山札枚数は増えません。',
    shuffle: 'リーリエの決心など。手札を山札に戻して混ぜた後に引きます。山札枚数は「現在の山札＋手札枚数」になります。',
    bottom: 'スペシャルレッドカードなど。手札を山札の下に戻します。このステップで引くカードは元の山札トップ側から引く扱いです。',
  }[mode] || '';
}

function conditionLabel(condition) {
  if (condition.type === 'none') return '条件なし';
  const joined = condition.groups.join('/');
  if (condition.type === 'any') return `${joined} のどれかを1枚以上`;
  if (condition.type === 'all') return `${joined} をすべて1枚以上`;
  return `${joined} の合計${condition.min}枚以上`;
}

function renderSteps() {
  const wrap = document.getElementById('steps');
  wrap.innerHTML = '';
  steps.forEach((step, index) => {
    const el = document.createElement('section');
    el.className = 'card step-card';
    el.innerHTML = `
      <div class="step-head">
        <div><p class="eyebrow">STEP ${index + 1}</p><h3>${modeLabel(step.mode)}</h3></div>
        <button class="delete-button" data-action="delete" ${steps.length <= 1 ? 'disabled' : ''}>×</button>
      </div>

      <label class="field preset-field">
        <span>カード効果プリセット</span>
        <select data-action="preset">
          ${Object.entries(PRESETS).map(([key, preset]) => `<option value="${key}" ${step.preset === key ? 'selected' : ''}>${preset.label}</option>`).join('')}
        </select>
      </label>

      <div class="mode-tabs mode-tabs-four">
        <button class="mode-button ${step.mode === 'draw' ? 'active' : ''}" data-action="mode" data-mode="draw">縦引き</button>
        <button class="mode-button ${step.mode === 'discard' ? 'active' : ''}" data-action="mode" data-mode="discard">トラッシュ</button>
        <button class="mode-button ${step.mode === 'shuffle' ? 'active' : ''}" data-action="mode" data-mode="shuffle">混ぜる</button>
        <button class="mode-button ${step.mode === 'bottom' ? 'active' : ''}" data-action="mode" data-mode="bottom">下に戻す</button>
      </div>

      <div class="effect-box">
        <p>${modeHelp(step.mode)}</p>
        <div class="grid two">
          ${step.mode === 'draw' ? '' : numberMarkup('最初の手札枚数', 'hand', step.hand, 0, 60)}
          ${numberMarkup('このステップで引く枚数', 'draw', step.draw, 0, 30)}
        </div>
      </div>

      <div class="condition-card">
        <div class="condition-tabs">
          ${conditionButton(step, 'none', '条件なし')}
          ${conditionButton(step, 'any', 'どれか1種')}
          ${conditionButton(step, 'all', 'すべて')}
          ${conditionButton(step, 'atLeast', '合計n枚以上')}
        </div>
        <div class="chips" style="display:${step.condition.type === 'none' ? 'none' : 'flex'}">
          ${GROUPS.map((g) => `<button class="chip ${step.condition.groups.includes(g) ? 'selected' : ''}" data-action="toggleGroup" data-group="${g}">${g}</button>`).join('')}
        </div>
        <div style="display:${step.condition.type === 'atLeast' ? 'block' : 'none'}">
          ${numberMarkup('合計何枚以上', 'min', step.condition.min, 1, 12)}
        </div>
        <p>${conditionLabel(step.condition)}</p>
      </div>
    `;

    el.querySelectorAll('input').forEach((input) => {
      input.addEventListener('input', () => {
        const key = input.dataset.key;
        if (key === 'min') step.condition.min = safeNum(input.value, 1, 12);
        else step[key] = safeNum(input.value, Number(input.min || 0), Number(input.max || 60));
        step.preset = 'custom';
        calculate();
      });
      input.addEventListener('blur', () => normalizeNumberInput(input));
    });

    el.querySelectorAll('select').forEach((select) => {
      select.addEventListener('change', () => {
        const preset = PRESETS[select.value];
        step.preset = select.value;
        step.mode = preset.mode;
        step.draw = preset.draw;
        step.hand = preset.hand;
        renderSteps();
        calculate();
      });
    });

    el.querySelectorAll('button').forEach((button) => {
      button.addEventListener('click', () => {
        const action = button.dataset.action;
        if (action === 'delete') steps = steps.filter((s) => s.id !== step.id);
        if (action === 'mode') {
          step.mode = button.dataset.mode;
          step.preset = 'custom';
        }
        if (action === 'condition') step.condition.type = button.dataset.type;
        if (action === 'toggleGroup') {
          const g = button.dataset.group;
          const groups = step.condition.groups.includes(g) ? step.condition.groups.filter((x) => x !== g) : [...step.condition.groups, g];
          step.condition.groups = groups.length ? groups : [g];
        }
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

function conditionButton(step, type, label) {
  return `<button class="condition-button ${step.condition.type === type ? 'active' : ''}" data-action="condition" data-type="${type}">${label}</button>`;
}

function calculate() {
  const initial = getInitial();
  const simpleDraw = num('simpleDraw', 1, 30);
  document.getElementById('simpleA').textContent = formatPct(hyperAtLeastOne(initial.deck, initial.A, simpleDraw));
  document.getElementById('simpleB').textContent = formatPct(hyperAtLeastOne(initial.deck, initial.B, simpleDraw));
  document.getElementById('simpleC').textContent = formatPct(hyperAtLeastOne(initial.deck, initial.C, simpleDraw));
  document.getElementById('simpleAny').textContent = formatPct(hyperAtLeastOne(initial.deck, initial.A + initial.B + initial.C, simpleDraw));

  if (!validState(initial)) {
    document.getElementById('totalProb').textContent = '対象枚数が山札枚数を超えています';
    document.getElementById('timeline').innerHTML = '';
    return;
  }

  let dist = new Map([[stateKey(initial), { state: initial, prob: 1 }]]);
  let total = 1;
  const rows = [];
  for (const step of steps) {
    const result = applyStep(dist, step);
    total *= result.probability;
    const after = summarizeDist(result.next);
    rows.push({ step, probability: result.probability, after, states: result.next.size });
    dist = result.next;
    if (dist.size === 0) break;
  }

  document.getElementById('totalProb').textContent = formatPct(total);
  document.getElementById('timeline').innerHTML = rows.map((row, i) => `
    <div class="timeline-row">
      <div class="badge">${i + 1}</div>
      <div>
        <b>${formatPct(row.probability)}</b>
        <p>${modeLabel(row.step.mode)} / ${conditionLabel(row.step.condition)} / 平均残山札 ${row.after.deck.toFixed(2)}枚 / 状態数 ${row.states}</p>
      </div>
    </div>
  `).join('');
}

['deck', 'simpleDraw', 'copyA', 'copyB', 'copyC'].forEach((id) => {
  const input = document.getElementById(id);
  input.addEventListener('input', calculate);
  input.addEventListener('blur', () => normalizeNumberInput(input));
});

document.getElementById('addStep').addEventListener('click', () => {
  steps.push(makeStep(Date.now()));
  renderSteps();
  calculate();
});

renderSteps();
calculate();
