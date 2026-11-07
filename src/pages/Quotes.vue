<script setup>
import { computed, ref } from 'vue';
import { INVESTORS, ALL_QUOTES } from '../quotes.js';
import CopyButton from '../components/CopyButton.vue';
import '../styles/quotes.css';

// 날짜마다 바뀌는 오늘의 명언
const todayIndex = () => {
  const d = new Date();
  const days = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  return days % ALL_QUOTES.length;
};

const copyText = (q, inv) => `"${q.ko}"\n${q.en}\n— ${inv.name} (${inv.en})`;
const matches = (text, keyword) => text.toLowerCase().includes(keyword);

const featured = ref(todayIndex());
const keyword = ref('');
const selected = ref('all');

const today = computed(() => ALL_QUOTES[featured.value]);

const shuffle = () => {
  let next = featured.value;
  while (next === featured.value) next = Math.floor(Math.random() * ALL_QUOTES.length);
  featured.value = next;
};

const shown = computed(() => {
  const kw = keyword.value.trim().toLowerCase();
  return INVESTORS
    .filter(inv => selected.value === 'all' || inv.id === selected.value)
    .map(inv => {
      if (!kw) return { inv, quotes: inv.quotes };
      // 인물 이름이 맞으면 명언 전체, 아니면 내용이 맞는 명언만
      const nameHit = matches(inv.name + ' ' + inv.en + ' ' + inv.style, kw);
      const quotes = nameHit ? inv.quotes : inv.quotes.filter(q => matches(q.ko + ' ' + q.en, kw));
      return { inv, quotes };
    })
    .filter(({ quotes }) => quotes.length);
});
</script>

<template>
  <main class="app quotes">
    <header>
      <RouterLink class="back" to="/">← 홈</RouterLink>
      <h1>투자명언</h1>
      <p class="storage">투자 대가 {{ INVESTORS.length }}명 · 명언 {{ ALL_QUOTES.length }}개</p>
    </header>

    <section class="today" aria-label="오늘의 명언">
      <div class="today-head">
        <span class="badge">오늘의 명언</span>
        <button class="shuffle" @click="shuffle">다른 명언 ↻</button>
      </div>
      <p class="ko">“{{ today.ko }}”</p>
      <p class="en">{{ today.en }}</p>
      <div class="quote-foot">
        <span class="who">— {{ today.investor.name }} <span>{{ today.investor.en }}</span></span>
        <CopyButton :text="copyText(today, today.investor)" />
      </div>
    </section>

    <div class="tools">
      <input v-model="keyword" type="search" placeholder="명언이나 이름으로 검색 (예: 복리, 버핏, value)">
      <nav class="chips" aria-label="인물 선택">
        <button :class="'chip' + (selected === 'all' ? ' active' : '')" @click="selected = 'all'">전체</button>
        <button v-for="inv in INVESTORS" :key="inv.id" :class="'chip' + (selected === inv.id ? ' active' : '')"
          @click="selected = selected === inv.id ? 'all' : inv.id">
          {{ inv.name }}
        </button>
      </nav>
    </div>

    <p v-if="!shown.length" class="empty">검색 결과가 없습니다</p>

    <article v-for="{ inv, quotes } in shown" :key="inv.id" class="investor">
      <header class="investor-head">
        <div>
          <h2>{{ inv.name }} <span class="en-name">{{ inv.en }}</span></h2>
          <p class="facts">{{ inv.country }} · {{ inv.years }}</p>
        </div>
        <span class="style">{{ inv.style }}</span>
      </header>
      <p class="bio">{{ inv.bio }}</p>
      <ul class="quote-list">
        <li v-for="q in quotes" :key="q.en" class="quote">
          <p class="ko">“{{ q.ko }}”</p>
          <p class="en">{{ q.en }}</p>
          <div class="quote-foot">
            <span class="source">{{ q.source }}</span>
            <CopyButton :text="copyText(q, inv)" />
          </div>
        </li>
      </ul>
    </article>

    <p class="note">명언은 본인의 저서·주주서한·인터뷰 등 출처가 확인되는 것 위주로 모았고, 한국어는 원문을 번역한 것입니다.</p>
  </main>
</template>
