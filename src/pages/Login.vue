<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { supabase, supabaseReady } from '../supabase.js';
import { authErrorText, useRedirectIfLoggedIn } from '../auth/auth.js';
import GoogleButton from '../auth/GoogleButton.vue';
import '../styles/auth.css';

useRedirectIfLoggedIn();
const router = useRouter();
const email = ref('');
const password = ref('');
const error = ref('');
const busy = ref(false);

const submit = async () => {
  error.value = '';
  busy.value = true;
  const { error: err } = await supabase.auth.signInWithPassword({ email: email.value.trim(), password: password.value });
  busy.value = false;
  if (err) return (error.value = authErrorText(err));
  router.replace('/');
};
</script>

<template>
  <main class="app auth">
    <header>
      <RouterLink class="back" to="/">← 홈</RouterLink>
      <h1>로그인</h1>
    </header>

    <p v-if="!supabaseReady" class="notice error">Supabase 설정이 없습니다. .env 파일에 URL과 키를 입력해주세요.</p>
    <template v-else>
      <form class="auth-form" @submit.prevent="submit">
        <label>
          이메일
          <input v-model="email" type="email" autocomplete="email" required>
        </label>
        <label>
          비밀번호
          <input v-model="password" type="password" autocomplete="current-password" required>
        </label>
        <p v-if="error" class="notice error" role="alert">{{ error }}</p>
        <button type="submit" :disabled="busy">{{ busy ? '로그인 중…' : '로그인' }}</button>
        <p class="switch">계정이 없나요? <RouterLink to="/signup">회원가입</RouterLink></p>
      </form>
      <GoogleButton />
    </template>
  </main>
</template>
