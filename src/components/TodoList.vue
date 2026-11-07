<script setup>
import { computed, onUnmounted, ref } from 'vue';
import { supabase, dbErrorText } from '../supabase.js';
import TodoItem from './TodoItem.vue';

// userId 가 바뀌면 부모가 :key 로 이 컴포넌트를 새로 만들어 목록을 다시 불러옵니다.
defineProps({ userId: { type: String, required: true } });

const FILTERS = [
  { key: 'all', label: '전체' },
  { key: 'active', label: '진행 중' },
  { key: 'done', label: '완료' },
];

const todos = ref([]);
const loading = ref(true);
const error = ref('');
const input = ref('');
const busy = ref(false);
const filter = ref('all');

let cancelled = false;
onUnmounted(() => { cancelled = true; });
supabase.from('todos').select('*').order('created_at', { ascending: false })
  .then(({ data, error: err }) => {
    if (cancelled) return;
    if (err) error.value = dbErrorText(err);
    else todos.value = data;
    loading.value = false;
  });

const shown = computed(() =>
  todos.value.filter(t => filter.value === 'all' || (filter.value === 'done' ? t.done : !t.done)));
const left = computed(() => todos.value.filter(t => !t.done).length);

// 화면을 먼저 바꾸고, 저장에 실패하면 되돌립니다.
const patch = async (id, changes) => {
  const before = todos.value;
  error.value = '';
  todos.value = todos.value.map(t => (t.id === id ? { ...t, ...changes } : t));
  const { error: err } = await supabase.from('todos').update(changes).eq('id', id);
  if (err) {
    todos.value = before;
    error.value = dbErrorText(err);
  }
};

const removeIds = async ids => {
  if (!ids.length) return;
  const before = todos.value;
  error.value = '';
  todos.value = todos.value.filter(t => !ids.includes(t.id));
  const { error: err } = await supabase.from('todos').delete().in('id', ids);
  if (err) {
    todos.value = before;
    error.value = dbErrorText(err);
  }
};

const submit = async () => {
  const text = input.value.trim();
  if (!text) return;
  busy.value = true;
  error.value = '';
  const { data, error: err } = await supabase.from('todos').insert({ text }).select().single();
  busy.value = false;
  if (err) return (error.value = dbErrorText(err));
  todos.value = [data, ...todos.value];
  input.value = '';
};
</script>

<template>
  <form class="add" @submit.prevent="submit">
    <input v-model="input" type="text" placeholder="할 일을 입력하세요" autocomplete="off" maxlength="100" required>
    <button type="submit" :disabled="busy">추가</button>
  </form>

  <p v-if="error" class="notice error" role="alert">{{ error }}</p>

  <nav class="filters">
    <button v-for="f in FILTERS" :key="f.key" :class="'filter' + (filter === f.key ? ' active' : '')"
      @click="filter = f.key">
      {{ f.label }}
    </button>
  </nav>

  <ul class="list">
    <li v-if="loading" class="empty">불러오는 중…</li>
    <li v-else-if="!shown.length" class="empty">할 일이 없습니다</li>
    <TodoItem v-for="t in shown" :key="t.id" :todo="t"
      @toggle="done => patch(t.id, { done })"
      @edit="text => patch(t.id, { text })"
      @remove="removeIds([t.id])" />
  </ul>

  <footer>
    <span>남은 할 일 {{ left }}개</span>
    <button class="link" @click="removeIds(todos.filter(t => t.done).map(t => t.id))">
      완료 항목 삭제
    </button>
  </footer>
</template>
