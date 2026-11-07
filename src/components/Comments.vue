<script setup>
import { ref, watch } from 'vue';
import { supabase, dbErrorText } from '../supabase.js';
import { useAuth, displayName } from '../auth/auth.js';

const props = defineProps({ postId: { type: [Number, String], required: true } });

const formatDate = iso => new Date(iso).toLocaleString('ko-KR');

const auth = useAuth();
const comments = ref([]);
const loading = ref(true);
const error = ref('');
const text = ref('');
const busy = ref(false);

watch(() => props.postId, (postId, _old, onCleanup) => {
  let cancelled = false;
  onCleanup(() => { cancelled = true; });
  supabase.from('comments').select('*').eq('post_id', postId).order('created_at')
    .then(({ data, error: err }) => {
      if (cancelled) return;
      if (err) error.value = dbErrorText(err);
      else comments.value = data;
      loading.value = false;
    });
}, { immediate: true });

const submit = async () => {
  const c = text.value.trim();
  if (!c) return;
  busy.value = true;
  error.value = '';
  const { data, error: err } = await supabase.from('comments')
    .insert({ post_id: props.postId, content: c, author: displayName(auth.user) })
    .select().single();
  busy.value = false;
  if (err) return (error.value = dbErrorText(err));
  comments.value = [...comments.value, data];
  text.value = '';
};

const remove = async id => {
  if (!confirm('이 댓글을 삭제할까요?')) return;
  error.value = '';
  const { error: err } = await supabase.from('comments').delete().eq('id', id);
  if (err) return (error.value = dbErrorText(err));
  comments.value = comments.value.filter(c => c.id !== id);
};
</script>

<template>
  <section class="comments">
    <h2>댓글 <span class="total">{{ comments.length }}</span></h2>
    <p v-if="error" class="notice error" role="alert">{{ error }}</p>
    <ul class="comment-list">
      <li v-if="loading" class="empty">불러오는 중…</li>
      <li v-else-if="!comments.length" class="empty">첫 댓글을 남겨보세요</li>
      <li v-for="c in comments" :key="c.id" class="comment">
        <div class="meta">
          <span class="author">{{ c.author || '익명' }}</span>
          <span class="date">{{ formatDate(c.created_at) }}</span>
          <button v-if="auth.user?.id === c.user_id" class="del" @click="remove(c.id)">삭제</button>
        </div>
        <p class="content">{{ c.content }}</p>
      </li>
    </ul>
    <form v-if="auth.user" class="comment-form" @submit.prevent="submit">
      <textarea v-model="text" placeholder="댓글을 입력하세요" maxlength="500" required />
      <button type="submit" :disabled="busy">{{ busy ? '등록 중…' : '등록' }}</button>
    </form>
    <p v-else class="notice">댓글을 쓰려면 <RouterLink to="/login">로그인</RouterLink>이 필요합니다.</p>
  </section>
</template>
