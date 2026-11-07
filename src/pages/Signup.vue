<script setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { supabase, supabaseReady } from '../supabase.js';
import { authErrorText, useRedirectIfLoggedIn } from '../auth/auth.js';
import GoogleButton from '../auth/GoogleButton.vue';
import '../styles/auth.css';

useRedirectIfLoggedIn();
const router = useRouter();
const form = reactive({ nickname: '', email: '', password: '', confirm: '' });
const error = ref('');
const sentTo = ref('');
const busy = ref(false);

const submit = async () => {
  error.value = '';
  if (form.password.length < 6) return (error.value = '비밀번호는 6자 이상이어야 합니다.');
  if (form.password !== form.confirm) return (error.value = '비밀번호가 서로 일치하지 않습니다.');

  busy.value = true;
  const email = form.email.trim();
  const { data, error: err } = await supabase.auth.signUp({
    email,
    password: form.password,
    options: {
      data: { nickname: form.nickname.trim() },
      emailRedirectTo: window.location.origin,
    },
  });
  busy.value = false;

  if (err) return (error.value = authErrorText(err));
  // 이메일 인증을 켜둔 경우, 이미 가입된 이메일이면 에러 대신 identities 가 빈 사용자를 돌려줍니다.
  if (data.user?.identities?.length === 0) return (error.value = '이미 가입된 이메일입니다.');
  // 이메일 인증이 꺼져 있으면 바로 로그인되므로 홈으로 이동합니다.
  if (data.session) return router.replace('/');
  sentTo.value = email;
};
</script>

<template>
  <main class="app auth">
    <header>
      <RouterLink class="back" to="/">← 홈</RouterLink>
      <h1>회원가입</h1>
    </header>

    <p v-if="!supabaseReady" class="notice error">Supabase 설정이 없습니다. .env 파일에 URL과 키를 입력해주세요.</p>
    <div v-else-if="sentTo" class="notice success">
      <strong>{{ sentTo }}</strong> 으로 인증 메일을 보냈습니다.<br>
      메일의 링크를 누르면 가입이 완료됩니다.
      <RouterLink class="link" to="/login">로그인하러 가기</RouterLink>
    </div>
    <template v-else>
      <form class="auth-form" @submit.prevent="submit">
        <label>
          닉네임
          <input v-model="form.nickname" name="nickname" maxlength="20" autocomplete="nickname" required>
        </label>
        <label>
          이메일
          <input v-model="form.email" name="email" type="email" autocomplete="email" required>
        </label>
        <label>
          비밀번호
          <input v-model="form.password" name="password" type="password"
            placeholder="6자 이상" autocomplete="new-password" required>
        </label>
        <label>
          비밀번호 확인
          <input v-model="form.confirm" name="confirm" type="password" autocomplete="new-password" required>
        </label>
        <p v-if="error" class="notice error" role="alert">{{ error }}</p>
        <button type="submit" :disabled="busy">{{ busy ? '가입 중…' : '가입하기' }}</button>
        <p class="switch">이미 계정이 있나요? <RouterLink to="/login">로그인</RouterLink></p>
      </form>
      <GoogleButton />
    </template>
  </main>
</template>
