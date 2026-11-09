<script setup>
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import '../styles/pisik.css';

const STATUS = { success: '성공', skipped: '건너뜀', failed: '실패' };
const TRIGGER = { schedule: '예약', startup: '서버 시작', manual: '수동', cli: 'CLI' };

const longDate = date => new Date(date + 'T00:00:00+09:00').toLocaleDateString('ko-KR', {
  timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
});
const time = iso => new Date(iso).toLocaleString('ko-KR', {
  timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
});

const route = useRoute();
const router = useRouter();
const data = ref(null);
const error = ref('');
const busy = ref(false);

const load = async () => {
  try {
    const res = await fetch('/api/comics');
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error);
    data.value = body;
    error.value = '';
  } catch (err) {
    error.value = `포스트를 불러오지 못했습니다. ${err.message || '서버에 연결할 수 없습니다.'}`;
  }
};
load();

const runNow = async () => {
  busy.value = true;
  try { await fetch('/api/comics', { method: 'POST' }); } catch {}
  await load();
  busy.value = false;
};

const posts = computed(() => data.value?.posts || []);
const current = computed(() => posts.value.find(p => p.id === route.query.p) || posts.value[0]);

const open = id => {
  router.push({ query: id === posts.value[0]?.id ? {} : { p: id } });
  window.scrollTo({ top: 0, behavior: 'smooth' });
};
</script>

<template>
  <main class="app pisik">
    <header>
      <RouterLink class="back" to="/">← 홈</RouterLink>
      <h1>피식</h1>
      <p class="storage">일주일에 한 편, 짧고 웃긴 만화 · 지금까지 {{ posts.length }}편</p>
    </header>

    <p v-if="error" class="notice error" role="alert">{{ error }}</p>
    <p v-if="!data && !error" class="empty">불러오는 중…</p>
    <p v-if="data && !current" class="empty">아직 수집된 만화가 없습니다. 아래 ‘지금 실행’을 눌러 보세요.</p>

    <article v-if="current" class="post">
      <p class="post-meta">
        <span class="badge">이번 주 피식</span>
        <time :datetime="current.date">{{ longDate(current.date) }}</time>
      </p>
      <h2>{{ current.title }}</h2>
      <figure>
        <img :src="current.img" :alt="current.title" loading="lazy">
      </figure>
      <blockquote class="alt">
        <span>작가의 한마디</span>
        {{ current.alt }}
      </blockquote>
      <section v-if="current.titleKo" class="ko">
        <span>한국어 번역 · 기계 번역</span>
        <dl>
          <dt>제목</dt>
          <dd>{{ current.titleKo }}</dd>
          <template v-if="current.altKo">
            <dt>작가의 한마디</dt>
            <dd>{{ current.altKo }}</dd>
          </template>
        </dl>
        <p class="ko-note">만화 속 대사는 번역되지 않아요. 원문 이미지를 함께 봐 주세요.</p>
      </section>
      <footer class="post-foot">
        <span class="tags">#xkcd #{{ current.num }} {{ current.isLatest ? '#최신화' : '' }}</span>
        <a :href="current.link" target="_blank" rel="noreferrer">원문 보기 ↗</a>
      </footer>
      <p class="credit">
        출처: xkcd #{{ current.num }} ({{ current.published }}) · Randall Munroe · CC BY-NC 2.5
      </p>
    </article>

    <section v-if="posts.length > 1" class="archive" aria-label="지난 포스트">
      <h3>지난 피식</h3>
      <ul>
        <li v-for="p in posts" :key="p.id">
          <button :class="p.id === current.id ? 'active' : ''" @click="open(p.id)">
            <time :datetime="p.date">{{ p.date.slice(5).replace('-', '.') }}</time>
            <span>{{ p.title }}</span>
          </button>
        </li>
      </ul>
    </section>

    <details v-if="data" class="batch">
      <summary>
        배치 실행 기록 <span>매주 {{ data.schedule }} (한국 시간) 자동 수집</span>
      </summary>
      <div class="batch-head">
        <p>이번 주 포스트가 이미 있으면 다시 실행해도 건너뜁니다.</p>
        <button class="btn-primary" :disabled="busy" @click="runNow">{{ busy ? '수집 중…' : '지금 실행' }}</button>
      </div>
      <p v-if="!data.runs.length" class="empty">아직 실행 기록이 없습니다</p>
      <ul v-else class="runs">
        <li v-for="r in data.runs" :key="r.id" :class="r.status">
          <span class="status">{{ STATUS[r.status] }}</span>
          <span class="msg">{{ r.message }}</span>
          <span class="when">{{ time(r.startedAt) }} · {{ TRIGGER[r.trigger] || r.trigger }} · {{ r.durationMs }}ms</span>
        </li>
      </ul>
    </details>
  </main>
</template>
