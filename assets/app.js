const GROUPS = ['A', 'B', 'C'];
let steps = [
  makeStep(1, { draw: 3, condition: { type: 'any', groups: ['A'], min: 1 } }),
  makeStep(2, { draw: 2, condition: { type: 'any', groups: ['B', 'C'], min: 1 } }),
];

function makeStep(id, overrides = {}) {
  return {
    id,
    mode: 'draw',
    draw: 3,
    returnCards: 0,
    returnA: 0,
    returnB: 0,
    returnC: 0,
    condition: { type: 'any', groups: ['A'], min: 1 },
    ...overrides,
  };
}

function num(id, min = 0, max = 999) {
  const el = document.getElementById(id);
  const n = Number(el.value);
  const fixed = Number.isFinite(n) ? Math.max(min, Math.min(max, Math.floor(n))) : min;
  el.value = fixed;
  return fixed;
}

function safeNum(value, min = 0, max = 999) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.floor(n))) : min;
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

function applyShuffleReturn(state, step) {
  const next = {
    deck: state.deck + safeNum(step.returnCards, 0, 60),
    A: state.A + safeNum(step.returnA, 0, 60),
    B: state.B + safeNum(step.returnB, 0, 60),
    C: state.C + safeNum(step.returnC, 0, 60),
  };
  return validState(next) ? next : state;
}

function addReturnedCards(dist, step) {
  const next = new Map();
  for (const item of dist.values()) {
    const state = applyShuffleReturn(item.state, step);
    const key = stateKey(state);
    const current = next.get(key);
    next.set(key, { state, prob: (current?.prob || 0) + item.prob });
  }
  return next;
}

function applyStep(dist, step) {
  const before = step.mode === 'shuffle' ? addReturnedCards(dist, step) : dist;
  const weighted = new Map();
  let pass = 0;
  let all = 0;
  for (const item of before.values()) {
    for (const outcome of enumerateDrawOutcomes(item.state, safeNum(step.draw, 0, 60))) {
      const p = item.prob * outcome.prob;
      all += p;
      if (!matchesCondition(outcome.drawn, step.condition)) continue;
      pass += p;
      const key = stateKey(outcome.nextState);
      const current = weighted.get(key);
      weighted.set(key, { state: outcome.nextState, prob: (current?.prob || 0) + p });
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
        <div><p class="eyebrow">STEP ${index + 1}</p><h3>${step.mode === 'draw' ? '縦引き' : '混ぜ直して引く'}</h3></div>
        <button class="delete-button" data-action="delete" ${steps.length <= 1 ? 'disabled' : ''}>×</button>
      </div>
      <div class="mode-tabs">
        <button class="mode-button ${step.mode === 'draw' ? 'active' : ''}" data-action="mode" data-mode="draw">縦引き</button>
        <button class="mode-button ${step.mode === 'shuffle' ? 'active' : ''}" data-action="mode" data-mode="shuffle">混ぜ直し</button>
      </div>
      <div class="shuffle-box" style="display:${step.mode === 'shuffle' ? 'grid' : 'none'}">
        <p>引く前に山札へ戻すカードを指定します。例：手札5枚を山札に戻す場合は「戻す総数=5」。戻す中に対象Aが1枚あるならA=1。</p>
        <div class="grid four">
          ${numberMarkup('戻す総数', 'returnCards', step.returnCards)}
          ${numberMarkup('戻すA', 'returnA', step.returnA)}
          ${numberMarkup('戻すB', 'returnB', step.returnB)}
          ${numberMarkup('戻すC', 'returnC', step.returnC)}
        </div>
      </div>
      ${numberMarkup('このステップで引く枚数', 'draw', step.draw, 0, 30)}
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
        calculate();
      });
    });
    el.querySelectorAll('button').forEach((button) => {
      button.addEventListener('click', () => {
        const action = button.dataset.action;
        if (action === 'delete') steps = steps.filter((s) => s.id !== step.id);
        if (action === 'mode') step.mode = button.dataset.mode;
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
    rows.push({ probability: result.probability, after, states: result.next.size });
    dist = result.next;
    if (dist.size === 0) break;
  }

  document.getElementById('totalProb').textContent = formatPct(total);
  document.getElementById('timeline').innerHTML = rows.map((row, i) => `
    <div class="timeline-row">
      <div class="badge">${i + 1}</div>
      <div>
        <b>${formatPct(row.probability)}</b>
        <p>このステップ単体の条件付き確率 / 平均残山札 ${row.after.deck.toFixed(2)}枚 / 状態数 ${row.states}</p>
      </div>
    </div>
  `).join('');
}

['deck', 'simpleDraw', 'copyA', 'copyB', 'copyC'].forEach((id) => document.getElementById(id).addEventListener('input', calculate));
document.getElementById('addStep').addEventListener('click', () => {
  steps.push(makeStep(Date.now()));
  renderSteps();
  calculate();
});

renderSteps();
calculate();
