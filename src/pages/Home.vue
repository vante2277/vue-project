<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { MENUS } from '../menus.js';
import { supabase } from '../supabase.js';
import { useAuth, displayName } from '../auth/auth.js';
import '../styles/home.css';

const formatNow = () => new Date().toLocaleString('ko-KR', {
  year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  hour: '2-digit', minute: '2-digit',
});

const now = ref(formatNow());
const auth = useAuth();

let timer;
onMounted(() => { timer = setInterval(() => { now.value = formatNow(); }, 1000 * 30); });
onUnmounted(() => clearInterval(timer));

const signOut = () => supabase.auth.signOut();
</script>

<template>
  <div class="home">
    <div class="topbar">
      <span class="clock">{{ now }}</span>
      <div v-if="!auth.loading" class="account">
        <template v-if="auth.user">
          <span>{{ displayName(auth.user) }} 님</span>
          <button @click="signOut">로그아웃</button>
        </template>
        <template v-else>
          <RouterLink to="/login">로그인</RouterLink>
          <RouterLink class="primary" to="/signup">회원가입</RouterLink>
        </template>
      </div>
    </div>

    <header class="hero">
      <p class="kicker">Daily Tools · Est. 2026</p>
      <h1>현성's Daily Hub <span class="by">by Vue</span></h1>
      <p class="tagline">매일 쓰는 작은 도구들을 한 곳에서</p>
    </header>

    <nav aria-label="메인 메뉴">
      <ul class="menu">
        <li v-for="(m, i) in MENUS" :key="m.path || m.href">
          <component :is="m.href ? 'a' : RouterLink" class="card"
            v-bind="m.href ? { href: m.href, target: '_blank', rel: 'noopener noreferrer' } : { to: m.path }">
            <span class="card-top">
              <span class="num">{{ String(i + 1).padStart(2, '0') }}</span>
              <span class="icon" aria-hidden="true">{{ m.icon }}</span>
            </span>
            <h2>{{ m.title }}</h2>
            <p>{{ m.desc }}</p>
            <span class="go" :aria-label="m.href ? '새 탭에서 열림' : undefined">{{ m.href ? '↗' : '→' }}</span>
          </component>
        </li>
      </ul>
    </nav>

    <footer>© 현성's Daily Hub</footer>
  </div>
</template>
