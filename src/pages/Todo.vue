<script setup>
import { supabaseReady } from '../supabase.js';
import { useAuth } from '../auth/auth.js';
import TodoList from '../components/TodoList.vue';
import '../styles/todo.css';

const auth = useAuth();
</script>

<template>
  <main class="app todo">
    <header>
      <RouterLink class="back" to="/">← 홈</RouterLink>
      <h1>To do list</h1>
      <p class="storage">저장 위치: Supabase (내 계정)</p>
    </header>

    <p v-if="!supabaseReady" class="notice error">Supabase 설정이 없습니다. .env 파일에 URL과 키를 입력해주세요.</p>
    <template v-else-if="!auth.loading">
      <TodoList v-if="auth.user" :key="auth.user.id" :user-id="auth.user.id" />
      <p v-else class="notice">할 일을 관리하려면 <RouterLink to="/login">로그인</RouterLink>이 필요합니다.</p>
    </template>
  </main>
</template>
