<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { supabase, supabaseReady, dbErrorText } from '../supabase.js';
import { useAuth } from '../auth/auth.js';
import PostEditor from '../components/PostEditor.vue';
import Comments from '../components/Comments.vue';
import '../styles/bbs.css';

const formatDate = iso => new Date(iso).toLocaleString('ko-KR');

const auth = useAuth();
const userId = computed(() => auth.user?.id);
const route = useRoute();
const router = useRouter();
// 목록에서 넘겨준 검색어·페이지가 있으면 그 목록으로 돌아갑니다.
const from = window.history.state?.from;
const listHref = from ? `/bbs?${from}` : '/bbs';
const id = computed(() => String(route.params.id));
const validId = computed(() => /^\d+$/.test(id.value));

const post = ref(null);
const loading = ref(supabaseReady);
const notFound = ref(false);
const error = ref('');
const editing = ref(false);
const likes = ref(0);
const liked = ref(false);
const liking = ref(false);

watch(id, (pid, _old, onCleanup) => {
  if (!supabase) return;
  // 숫자가 아닌 id 는 DB 에 물어볼 필요 없이 없는 글입니다.
  if (!validId.value) {
    notFound.value = true;
    loading.value = false;
    return;
  }
  let cancelled = false;
  onCleanup(() => { cancelled = true; });
  loading.value = true;
  notFound.value = false;
  supabase.from('posts').select('*, post_likes(count)').eq('id', pid).maybeSingle()
    .then(({ data, error: err }) => {
      if (cancelled) return;
      if (err) error.value = dbErrorText(err);
      else if (!data) notFound.value = true;
      else {
        const { post_likes, ...rest } = data;
        post.value = rest;
        likes.value = post_likes[0]?.count ?? 0;
      }
      loading.value = false;
    });
}, { immediate: true });

// 내가 좋아요를 눌렀는지는 로그인한 사용자에 따라 달라지므로 따로 가져옵니다.
watch([id, userId], ([pid, uid], _old, onCleanup) => {
  if (!supabase || !uid || !validId.value) return (liked.value = false);
  let cancelled = false;
  onCleanup(() => { cancelled = true; });
  supabase.from('post_likes').select('post_id').eq('post_id', pid).eq('user_id', uid).maybeSingle()
    .then(({ data }) => { if (!cancelled) liked.value = Boolean(data); });
}, { immediate: true });

const toggleLike = async () => {
  if (!auth.user) return router.push('/login');
  if (liking.value) return;
  const next = !liked.value;
  // 낙관적 업데이트: 응답을 기다리지 않고 화면부터 바꾸고, 실패하면 되돌립니다.
  liked.value = next;
  likes.value += next ? 1 : -1;
  liking.value = true;
  error.value = '';
  const { error: err } = next
    ? await supabase.from('post_likes').insert({ post_id: post.value.id })
    : await supabase.from('post_likes').delete().eq('post_id', post.value.id).eq('user_id', auth.user.id);
  liking.value = false;
  if (!err) return;
  // 23505(기본키 중복): 다른 탭 등에서 이미 좋아요한 상태 → 표시는 맞고 개수만 한 번 더 센 것
  if (err.code === '23505') return (likes.value -= 1);
  liked.value = !next;
  likes.value += next ? -1 : 1;
  error.value = dbErrorText(err);
};

const update = async (t, c) => {
  error.value = '';
  const { data, error: err } = await supabase.from('posts')
    .update({ title: t, content: c, updated_at: new Date().toISOString() })
    .eq('id', post.value.id).select().single();
  if (err) return (error.value = dbErrorText(err));
  post.value = data;
  editing.value = false;
};

const remove = async () => {
  if (!confirm('이 글을 삭제할까요? 댓글과 좋아요도 함께 삭제됩니다.')) return;
  error.value = '';
  const { error: err } = await supabase.from('posts').delete().eq('id', post.value.id);
  if (err) return (error.value = dbErrorText(err));
  router.replace(listHref);
};
</script>

<template>
  <main class="app bbs">
    <header>
      <RouterLink class="back" :to="listHref">← 목록</RouterLink>
      <h1>자유게시판</h1>
    </header>

    <p v-if="!supabaseReady" class="notice error">Supabase 설정이 없습니다. .env 파일에 URL과 키를 입력해주세요.</p>
    <p v-else-if="loading" class="empty">불러오는 중…</p>
    <div v-else-if="notFound" class="not-found">
      <p class="empty">글을 찾을 수 없습니다. 삭제되었거나 잘못된 주소예요.</p>
      <RouterLink to="/bbs">자유게시판 목록으로</RouterLink>
    </div>
    <template v-else>
      <p v-if="error" class="notice error" role="alert">{{ error }}</p>
      <template v-if="post">
        <article class="post">
          <PostEditor v-if="editing" :post="post" :on-save="update" @cancel="editing = false" />
          <template v-else>
            <h2 class="post-title">{{ post.title }}</h2>
            <div class="post-meta">{{ `${post.author || '익명'} · ${formatDate(post.created_at)}${post.updated_at ? ' · 수정됨' : ''}` }}</div>
            <div class="post-content">{{ post.content }}</div>
            <div class="post-actions">
              <button :class="'like' + (liked ? ' on' : '')" :aria-pressed="liked"
                :title="auth.user ? '' : '로그인이 필요합니다'" @click="toggleLike">
                {{ liked ? '♥' : '♡' }} 좋아요 {{ likes }}
              </button>
              <span v-if="userId === post.user_id" class="owner-actions">
                <button class="edit-btn" @click="editing = true">수정</button>
                <button class="del" @click="remove">삭제</button>
              </span>
            </div>
          </template>
        </article>
        <Comments :post-id="post.id" />
      </template>
    </template>
  </main>
</template>
