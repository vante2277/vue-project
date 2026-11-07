<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import IndexCard from '../components/IndexCard.vue';
import '../styles/stocks.css';

const COUNTRIES = [
  { code: 'KR', label: '한국' },
  { code: 'US', label: '미국' },
  { code: 'CN', label: '중국' },
  { code: 'TW', label: '대만' },
  { code: 'JP', label: '일본' },
];

const REFRESH_MS = 30 * 1000;
const CACHE_KEY = 'stock_indices';

const readCache = () => {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY)); } catch { return null; }
};

// 마지막으로 본 시세를 먼저 보여주고, 바로 최신 값으로 갱신합니다.
const snapshot = ref(readCache());
const loading = ref(false);
const error = ref('');

const load = async () => {
  loading.value = true;
  try {
    const res = await fetch('/api/indices');
    if (!res.ok) throw new Error();
    const json = await res.json();
    snapshot.value = json;
    error.value = '';
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(json)); } catch {}
  } catch {
    error.value = '시세를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.';
  }
  loading.value = false;
};

const onVisible = () => { if (!document.hidden) load(); };
let timer;
onMounted(() => {
  load();
  timer = setInterval(onVisible, REFRESH_MS);
  document.addEventListener('visibilitychange', onVisible);
});
onUnmounted(() => {
  clearInterval(timer);
  document.removeEventListener('visibilitychange', onVisible);
});

const data = computed(() => snapshot.value?.data || []);
const itemsOf = code => data.value.filter(d => d.country === code);
</script>

<template>
  <main class="app stocks">
    <header>
      <RouterLink class="back" to="/">← 홈</RouterLink>
      <div class="title-row">
        <h1>주식지수</h1>
        <button class="refresh" :disabled="loading" @click="load">
          {{ loading ? '갱신 중…' : '새로고침' }}
        </button>
      </div>
      <p class="storage">
        {{ (snapshot ? `마지막 갱신 ${new Date(snapshot.updatedAt).toLocaleTimeString('ko-KR')}` : '불러오는 중…')
          + ' · 30초마다 자동 갱신 · 출처 Yahoo Finance (지연 시세일 수 있음)' }}
      </p>
    </header>

    <p v-if="error" class="notice error" role="alert">{{ error }}</p>

    <section v-for="c in COUNTRIES" :key="c.code" class="country">
      <h2>{{ c.label }}</h2>
      <ul class="cards">
        <template v-if="itemsOf(c.code).length">
          <IndexCard v-for="item in itemsOf(c.code)" :key="item.symbol" :item="item" />
        </template>
        <li v-else class="card skeleton" />
      </ul>
    </section>
  </main>
</template>
