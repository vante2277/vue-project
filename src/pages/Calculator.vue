<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import '../styles/calculator.css';

const SYMBOL = { '+': '+', '-': '−', '*': '×', '/': '÷' };

const INITIAL = { current: '0', previous: null, operator: null, resetNext: false, lastExpr: '' };

function format(str) {
  if (str === 'Error') return str;
  const [int, dec] = str.split('.');
  const sign = int.startsWith('-') ? '-' : '';
  const body = int.replace('-', '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return sign + body + (dec !== undefined ? '.' + dec : '');
}

function calculate(a, b, op) {
  a = parseFloat(a); b = parseFloat(b);
  let r;
  switch (op) {
    case '+': r = a + b; break;
    case '-': r = a - b; break;
    case '*': r = a * b; break;
    case '/': if (b === 0) return 'Error'; r = a / b; break;
  }
  return String(parseFloat(r.toPrecision(12)));
}

function reducer(state, { type, value }) {
  const s = { ...state, lastExpr: '' };

  switch (type) {
    case 'digit': {
      const base = s.current === 'Error' ? { ...INITIAL } : s;
      const cur = base.resetNext ? '0' : base.current;
      if (cur.replace(/[-.]/g, '').length >= 15) return { ...base, current: cur, resetNext: false };
      return { ...base, current: cur === '0' ? value : cur + value, resetNext: false };
    }
    case 'decimal': {
      const base = s.current === 'Error' ? { ...INITIAL } : s;
      const cur = base.resetNext ? '0' : base.current;
      return { ...base, current: cur.includes('.') ? cur : cur + '.', resetNext: false };
    }
    case 'operator': {
      if (s.current === 'Error') return s;
      let cur = s.current;
      if (s.operator && !s.resetNext) {
        cur = calculate(s.previous, s.current, s.operator);
        if (cur === 'Error') return { ...s, current: cur, previous: null, operator: null };
      }
      return { ...s, current: cur, previous: cur, operator: value, resetNext: true };
    }
    case 'equals': {
      if (!s.operator || s.current === 'Error') return state;
      const expr = `${format(s.previous)} ${SYMBOL[s.operator]} ${format(s.current)} =`;
      return {
        current: calculate(s.previous, s.current, s.operator),
        previous: null, operator: null, resetNext: true, lastExpr: expr,
      };
    }
    case 'clear':
      return { ...INITIAL };
    case 'sign':
      if (s.current === 'Error' || s.current === '0') return s;
      return { ...s, current: s.current.startsWith('-') ? s.current.slice(1) : '-' + s.current };
    case 'percent':
      if (s.current === 'Error') return s;
      return { ...s, current: String(parseFloat((parseFloat(s.current) / 100).toPrecision(12))) };
    case 'backspace': {
      if (s.resetNext || s.current === 'Error') return state;
      let cur = s.current.length > 1 ? s.current.slice(0, -1) : '0';
      if (cur === '-') cur = '0';
      return { ...s, current: cur };
    }
    default:
      return state;
  }
}

const KEYS = [
  { label: 'C', cls: 'func', type: 'clear' },
  { label: '±', cls: 'func', type: 'sign' },
  { label: '%', cls: 'func', type: 'percent' },
  { label: '÷', cls: 'op', type: 'operator', value: '/' },
  { label: '7', type: 'digit', value: '7' },
  { label: '8', type: 'digit', value: '8' },
  { label: '9', type: 'digit', value: '9' },
  { label: '×', cls: 'op', type: 'operator', value: '*' },
  { label: '4', type: 'digit', value: '4' },
  { label: '5', type: 'digit', value: '5' },
  { label: '6', type: 'digit', value: '6' },
  { label: '−', cls: 'op', type: 'operator', value: '-' },
  { label: '1', type: 'digit', value: '1' },
  { label: '2', type: 'digit', value: '2' },
  { label: '3', type: 'digit', value: '3' },
  { label: '+', cls: 'op', type: 'operator', value: '+' },
  { label: '0', cls: 'zero', type: 'digit', value: '0' },
  { label: '.', type: 'decimal' },
  { label: '=', cls: 'equal', type: 'equals' },
];

const state = ref({ ...INITIAL });
const dispatch = action => { state.value = reducer(state.value, action); };

const onKey = e => {
  if (/^\d$/.test(e.key)) dispatch({ type: 'digit', value: e.key });
  else if (e.key === '.') dispatch({ type: 'decimal' });
  else if ('+-*/'.includes(e.key)) dispatch({ type: 'operator', value: e.key });
  else if (e.key === 'Enter' || e.key === '=') { e.preventDefault(); dispatch({ type: 'equals' }); }
  else if (e.key === 'Escape' || e.key.toLowerCase() === 'c') dispatch({ type: 'clear' });
  else if (e.key === '%') dispatch({ type: 'percent' });
  else if (e.key === 'Backspace') dispatch({ type: 'backspace' });
};
onMounted(() => document.addEventListener('keydown', onKey));
onUnmounted(() => document.removeEventListener('keydown', onKey));

const expression = computed(() => {
  const { previous, operator, lastExpr } = state.value;
  return lastExpr || (previous !== null && operator ? `${format(previous)} ${SYMBOL[operator]}` : '');
});
const fontSize = computed(() => {
  const len = state.value.current.length;
  return len > 12 ? '1.8rem' : len > 8 ? '2.4rem' : '3rem';
});

const keyClass = k => ['key', k.cls,
  k.type === 'operator' && k.value === state.value.operator && state.value.resetNext && 'active'].filter(Boolean).join(' ');
const press = (e, k) => { e.currentTarget.blur(); dispatch({ type: k.type, value: k.value }); };
</script>

<template>
  <main class="calculator">
    <RouterLink class="back" to="/">← 홈</RouterLink>
    <div class="display">
      <div class="expression">{{ expression }}</div>
      <div class="result" :style="{ fontSize }">{{ format(state.current) }}</div>
    </div>
    <div class="keys">
      <button v-for="k in KEYS" :key="k.label" :class="keyClass(k)" @click="press($event, k)">
        {{ k.label }}
      </button>
    </div>
    <div class="links">
      <RouterLink class="todo-link" to="/todo">📝 To do list</RouterLink>
      <RouterLink class="board-link" to="/bbs">📋 자유게시판</RouterLink>
    </div>
  </main>
</template>
