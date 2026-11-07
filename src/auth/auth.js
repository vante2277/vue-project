import { reactive, watch } from 'vue';
import { useRouter } from 'vue-router';
import { supabase } from '../supabase.js';

// 앱 전체에서 함께 쓰는 로그인 상태 (React 의 AuthContext 역할)
const state = reactive({ user: null, loading: Boolean(supabase) });

if (supabase) {
  supabase.auth.getSession().then(({ data }) => {
    state.user = data.session?.user ?? null;
    state.loading = false;
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    state.user = session?.user ?? null;
  });
}

export const useAuth = () => state;

// 이미 로그인한 사용자가 로그인·회원가입 화면에 오면 홈으로 보냅니다.
export function useRedirectIfLoggedIn() {
  const router = useRouter();
  watch(() => state.user, user => { if (user) router.replace('/'); }, { immediate: true });
}

export const displayName = user =>
  user?.user_metadata?.nickname || user?.user_metadata?.full_name || user?.email || '';

// Supabase 에러 메시지를 한국어로 바꿔 보여줍니다.
const MESSAGES = {
  'User already registered': '이미 가입된 이메일입니다.',
  'Invalid login credentials': '이메일 또는 비밀번호가 올바르지 않습니다.',
  'Email not confirmed': '이메일 인증이 아직 완료되지 않았습니다. 메일함을 확인해주세요.',
};

export const authErrorText = error => {
  if (MESSAGES[error.message]) return MESSAGES[error.message];
  if (/password should be/i.test(error.message)) return '비밀번호는 6자 이상이어야 합니다.';
  if (/invalid format|is invalid/i.test(error.message)) return '이메일 형식이 올바르지 않습니다.';
  if (/rate limit/i.test(error.message)) return '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
  if (/provider is not enabled/i.test(error.message)) return 'Supabase 에서 Google 로그인이 아직 켜져 있지 않습니다.';
  return error.message;
};
