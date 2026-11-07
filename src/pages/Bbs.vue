<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { supabase, supabaseReady, dbErrorText } from '../supabase.js';
import { useAuth, displayName } from '../auth/auth.js';
import '../styles/bbs.css';

const PAGE_SIZE = 10;

// 검색어에서 PostgREST 필터 문법(쉼표·괄호·따옴표)과 LIKE 와일드카드로 쓰이는 문자를 뺍니다.
const cleanQuery = q => q.replace(/[%_*,()"\\]/g, ' ').trim();

const auth = useAuth();
const route = useRoute();
const router = useRouter();

// 검색어와 페이지는 URL(?q=&page=)에 둡니다. 새로고침·뒤로가기·링크 공유를 해도 같은 화면이 나옵니다.
const q = computed(() => (typeof route.query.q === 'string' ? route.query.q : ''));
const page = computed(() => Math.max(1, Math.floor(Number(route.query.page)) || 1));

const keyword = ref(q.value);
const posts = ref([]);
const total = ref(0);
const loading = ref(supabaseReady);
const error = ref('');
const title = ref('');
const content = ref('');
const busy = ref(false);

const totalPages = computed(() => Math.ceil(total.value / PAGE_SIZE));
const hrefOf = n => {
  const next = new URLSearchParams();
  if (q.value) next.set('q', q.value);
  if (n > 1) next.set('page', n);
  const s = next.toString();
  return s ? `/bbs?${s}` : '/bbs';
};

// 현재 페이지를 가운데에 두고 최대 5개 번호를 보여줍니다.
const pageNumbers = computed(() => {
  const start = Math.max(1, Math.min(page.value - 2, totalPages.value - 4));
  return Array.from({ length: Math.min(5, totalPages.value) }, (_, i) => start + i);
});

// 뒤로가기 등으로 URL 의 검색어가 바뀌면 입력창도 맞춥니다.
watch(q, v => { keyword.value = v; });

// 입력을 멈추고 300ms 가 지나면 URL 에 반영합니다. (한 글자마다 요청하지 않도록 디바운스)
watch(keyword, (value, _old, onCleanup) => {
  const v = value.trim();
  if (v === q.value) return;
  const timer = setTimeout(() => router.replace({ query: v ? { q: v } : {} }), 300);
  onCleanup(() => clearTimeout(timer));
});

watch([q, page], ([qv, pv], _old, onCleanup) => {
  if (!supabase) return;
  let cancelled = false;
  onCleanup(() => { cancelled = true; });
  loading.value = true;
  const from = (pv - 1) * PAGE_SIZE;
  // comments(count), post_likes(count): 연결된 테이블의 개수를 글과 함께 한 번에 가져옵니다.
  let query = supabase.from('posts')
    .select('id, title, author, created_at, updated_at, comments(count), post_likes(count)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  const term = cleanQuery(qv);
  if (term) query = query.or(`title.ilike.%${term}%,content.ilike.%${term}%`);

  query.then(({ data, count, error: err }) => {
    if (cancelled) return;
    // PGRST103: 글 수보다 뒤쪽 페이지를 요청함 → 1페이지로 보냅니다.
    if (err?.code === 'PGRST103') return router.replace({ query: qv ? { q: qv } : {} });
    if (err) error.value = dbErrorText(err);
    else {
      posts.value = data.map(p => ({
        ...p,
        commentCount: p.comments[0]?.count ?? 0,
        likeCount: p.post_likes[0]?.count ?? 0,
      }));
      total.value = count ?? 0;
      error.value = '';
    }
    loading.value = false;
  });
}, { immediate: true });

const submit = async () => {
  const t = title.value.trim();
  const c = content.value.trim();
  if (!t || !c) return;
  busy.value = true;
  error.value = '';
  const { data, error: err } = await supabase.from('posts')
    .insert({ title: t, content: c, author: displayName(auth.user) })
    .select('id').single();
  busy.value = false;
  if (err) return (error.value = dbErrorText(err));
  router.push(`/bbs/${data.id}`);
};

// 상세에서 "목록"으로 돌아올 때 지금의 검색어·페이지를 유지하도록 history state 로 넘깁니다.
const postLink = id => ({
  path: `/bbs/${id}`,
  state: { from: new URLSearchParams(route.query).toString() },
});
</script>

<template>
  <main class="app bbs">
    <header>
      <RouterLink class="back" to="/">← 홈</RouterLink>
      <h1>자유게시판</h1>
      <p class="storage">저장 위치: Supabase</p>
    </header>

    <p v-if="!supabaseReady" class="notice error">Supabase 설정이 없습니다. .env 파일에 URL과 키를 입력해주세요.</p>
    <template v-else>
      <template v-if="!auth.loading">
        <form v-if="auth.user" class="write" @submit.prevent="submit">
          <input v-model="title" type="text" placeholder="제목을 입력하세요" autocomplete="off" maxlength="100" required>
          <textarea v-model="content" placeholder="내용을 입력하세요" maxlength="2000" required />
          <button type="submit" :disabled="busy">{{ busy ? '작성 중…' : '작성' }}</button>
        </form>
        <p v-else class="notice">글을 쓰려면 <RouterLink to="/login">로그인</RouterLink>이 필요합니다.</p>
      </template>

      <p v-if="error" class="notice error" role="alert">{{ error }}</p>

      <section class="board">
        <div class="board-head">
          <h2>{{ q ? `"${q}" 검색 결과` : '글 목록' }} <span class="total">{{ total }}건</span></h2>
          <input v-model="keyword" class="search" type="search" placeholder="제목·내용 검색" aria-label="게시글 검색">
        </div>
        <ul class="list posts">
          <li v-if="loading" class="empty">불러오는 중…</li>
          <li v-else-if="!posts.length" class="empty">{{ q ? '검색 결과가 없습니다' : '작성된 글이 없습니다' }}</li>
          <template v-if="!loading">
            <li v-for="p in posts" :key="p.id" class="item">
              <RouterLink class="post-link" :to="postLink(p.id)">
                <div class="row">
                  <span class="title">{{ p.title }}<span v-if="p.commentCount > 0" class="comment-count">[{{ p.commentCount }}]</span></span>
                  <span class="date">{{ new Date(p.created_at).toLocaleDateString('ko-KR') }}</span>
                </div>
                <div class="author">{{ (p.author || '익명') + (p.updated_at ? ' · 수정됨' : '') }}<span v-if="p.likeCount > 0" class="like-count">{{ ` · ♥ ${p.likeCount}` }}</span></div>
              </RouterLink>
            </li>
          </template>
        </ul>

        <nav v-if="totalPages > 1" class="pagination" aria-label="페이지">
          <RouterLink v-if="page > 1" :to="hrefOf(page - 1)">‹ 이전</RouterLink>
          <span v-else class="disabled">‹ 이전</span>
          <RouterLink v-for="n in pageNumbers" :key="n" :to="hrefOf(n)" :class="n === page ? 'current' : ''"
            :aria-current="n === page ? 'page' : undefined">{{ n }}</RouterLink>
          <RouterLink v-if="page < totalPages" :to="hrefOf(page + 1)">다음 ›</RouterLink>
          <span v-else class="disabled">다음 ›</span>
        </nav>
      </section>
    </template>
  </main>
</template>
