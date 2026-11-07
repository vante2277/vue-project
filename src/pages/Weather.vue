<script setup>
import { computed, ref } from 'vue';
import { MAP_WIDTH, MAP_HEIGHT, PROVINCES, project } from '../koreaMap.js';
import '../styles/weather.css';

// label: 다른 도시와 겹치지 않도록 이름표를 옮길 위치 (지도 좌표). 없으면 도시 위치에 표시
const CITIES = [
  { name: '서울', lat: 37.5665, lon: 126.978, label: [190, 60] },
  { name: '인천', lat: 37.4563, lon: 126.7052, label: [110, 120] },
  { name: '수원', lat: 37.2636, lon: 127.0286, label: [115, 172] },
  { name: '춘천', lat: 37.8813, lon: 127.7298, label: [275, 50] },
  { name: '강릉', lat: 37.7519, lon: 128.8761, label: [385, 80] },
  { name: '청주', lat: 36.6424, lon: 127.489, label: [290, 168] },
  { name: '대전', lat: 36.3504, lon: 127.3845, label: [160, 238] },
  { name: '안동', lat: 36.5684, lon: 128.7294, label: [405, 205] },
  { name: '전주', lat: 35.8242, lon: 127.148, label: [148, 296] },
  { name: '대구', lat: 35.8714, lon: 128.6014 },
  { name: '울산', lat: 35.5384, lon: 129.3114, label: [435, 300] },
  { name: '광주', lat: 35.1595, lon: 126.8526 },
  { name: '부산', lat: 35.1796, lon: 129.0756, label: [395, 382] },
  { name: '목포', lat: 34.8118, lon: 126.3922, label: [105, 412] },
  { name: '여수', lat: 34.7604, lon: 127.6622 },
  { name: '제주', lat: 33.4996, lon: 126.5312, label: [255, 515] },
  { name: '울릉도', lat: 37.4845, lon: 130.9057, label: [488, 165] },
];

// WMO 날씨 코드 → [아이콘, 설명]
const WEATHER = {
  0: ['☀️', '맑음'], 1: ['🌤️', '대체로 맑음'], 2: ['⛅', '구름 조금'], 3: ['☁️', '흐림'],
  45: ['🌫️', '안개'], 48: ['🌫️', '안개'],
  51: ['🌦️', '이슬비'], 53: ['🌦️', '이슬비'], 55: ['🌦️', '이슬비'], 56: ['🌧️', '어는 비'], 57: ['🌧️', '어는 비'],
  61: ['🌧️', '비'], 63: ['🌧️', '비'], 65: ['🌧️', '강한 비'], 66: ['🌧️', '어는 비'], 67: ['🌧️', '어는 비'],
  71: ['🌨️', '눈'], 73: ['🌨️', '눈'], 75: ['❄️', '많은 눈'], 77: ['🌨️', '싸락눈'],
  80: ['🌦️', '소나기'], 81: ['🌦️', '소나기'], 82: ['🌧️', '강한 소나기'], 85: ['🌨️', '소낙눈'], 86: ['🌨️', '소낙눈'],
  95: ['⛈️', '뇌우'], 96: ['⛈️', '뇌우·우박'], 99: ['⛈️', '뇌우·우박'],
};
const weatherOf = code => WEATHER[code] || ['❔', '알 수 없음'];

const CACHE_KEY = 'weather_forecast';
const STALE_MS = 30 * 60 * 1000;

const API_URL = 'https://api.open-meteo.com/v1/forecast?' + new URLSearchParams({
  latitude: CITIES.map(c => c.lat).join(','),
  longitude: CITIES.map(c => c.lon).join(','),
  daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
  timezone: 'Asia/Seoul',
  forecast_days: '7',
});

const readCache = () => {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY)); } catch { return null; }
};

const dayLabel = (iso, i) => {
  if (i === 0) return '오늘';
  if (i === 1) return '내일';
  const d = new Date(iso + 'T00:00:00+09:00');
  return `${d.getMonth() + 1}/${d.getDate()} (${'일월화수목금토'[d.getDay()]})`;
};

const t = v => `${Math.round(v)}°`;

// 마지막으로 받은 예보를 먼저 보여주고, 30분이 지났으면 새로 받아옵니다.
const snapshot = ref(readCache());
const loading = ref(false);
const error = ref('');
const day = ref(0);
const cityIndex = ref(0);

const load = async () => {
  loading.value = true;
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error();
    const json = await res.json();
    const next = { updatedAt: Date.now(), daily: json.map(r => r.daily) };
    snapshot.value = next;
    error.value = '';
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(next)); } catch {}
  } catch {
    error.value = '날씨를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.';
  }
  loading.value = false;
};

{
  const cached = snapshot.value;
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
  // 캐시가 오래됐거나 날짜가 바뀌었으면 새로 받기
  if (!cached || Date.now() - cached.updatedAt > STALE_MS || cached.daily?.[0]?.time?.[0] !== today) load();
}

const daily = computed(() => snapshot.value?.daily);
const city = computed(() => CITIES[cityIndex.value]);
const cityDaily = computed(() => daily.value?.[cityIndex.value]);

// 지도 위 도시 표시(점·이름표)에 필요한 좌표와 그날의 날씨
const markers = computed(() => CITIES.map((c, i) => {
  const d = daily.value[i];
  const [x, y] = project(c.lat, c.lon);
  const [lx, ly] = c.label || [x, y];
  const [icon, desc] = weatherOf(d.weather_code[day.value]);
  const min = t(d.temperature_2m_min[day.value]);
  const max = t(d.temperature_2m_max[day.value]);
  return { i, name: c.name, hasLabel: Boolean(c.label), x, y, lx, ly, icon, min, max, aria: `${c.name} ${desc} 최저 ${min} 최고 ${max}` };
}));
</script>

<template>
  <main class="app weather">
    <header>
      <RouterLink class="back" to="/">← 홈</RouterLink>
      <div class="title-row">
        <h1>전국날씨</h1>
        <button class="refresh" :disabled="loading" @click="load">
          {{ loading ? '갱신 중…' : '새로고침' }}
        </button>
      </div>
      <p class="storage">
        {{ (snapshot ? `마지막 갱신 ${new Date(snapshot.updatedAt).toLocaleString('ko-KR')}` : '불러오는 중…') + ' · 출처 Open-Meteo' }}
      </p>
    </header>

    <p v-if="error" class="notice error" role="alert">{{ error }}</p>

    <template v-if="daily">
      <nav class="days" aria-label="날짜 선택">
        <button v-for="(iso, i) in daily[0].time" :key="iso" :class="'day' + (day === i ? ' active' : '')"
          @click="day = i">
          {{ dayLabel(iso, i) }}
        </button>
      </nav>

      <div class="map-wrap">
        <svg class="map" :viewBox="`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`" role="img"
          :aria-label="`${dayLabel(daily[0].time[day], day)} 전국 날씨 지도`">
          <path v-for="p in PROVINCES" :key="p.name" :d="p.d" class="province"><title>{{ p.name }}</title></path>
          <g v-for="m in markers" :key="m.name" :class="'city' + (m.i === cityIndex ? ' selected' : '')"
            role="button" tabindex="0" :aria-label="m.aria"
            @click="cityIndex = m.i"
            @keydown.enter.prevent="cityIndex = m.i" @keydown.space.prevent="cityIndex = m.i">
            <line v-if="m.hasLabel" :x1="m.x" :y1="m.y" :x2="m.lx" :y2="m.ly" class="leader" />
            <circle :cx="m.x" :cy="m.y" r="3" class="dot" />
            <rect :x="m.lx - 34" :y="m.ly - 20" width="68" height="40" rx="10" class="box" />
            <text :x="m.lx - 26" :y="m.ly - 4" class="label-name">{{ m.name }}</text>
            <text :x="m.lx + 27" :y="m.ly - 3" class="label-icon" text-anchor="end">{{ m.icon }}</text>
            <text :x="m.lx" :y="m.ly + 13" text-anchor="middle" class="label-temp"><tspan class="min">{{ m.min }}</tspan><tspan class="sep">{{ ' / ' }}</tspan><tspan class="max">{{ m.max }}</tspan></text>
          </g>
        </svg>
        <p class="legend">
          <span class="min">최저</span> / <span class="max">최고</span> 기온 · 도시를 누르면 주간 예보를 볼 수 있어요
        </p>
      </div>

      <section class="week">
        <div class="week-head">
          <h2>{{ city.name }} 주간 예보</h2>
          <select v-model.number="cityIndex" aria-label="도시 선택">
            <option v-for="(c, i) in CITIES" :key="c.name" :value="i">{{ c.name }}</option>
          </select>
        </div>
        <ul class="week-list">
          <li v-for="(iso, i) in cityDaily.time" :key="iso" :class="'week-day' + (day === i ? ' active' : '')"
            @click="day = i">
            <span class="wd">{{ dayLabel(iso, i) }}</span>
            <span class="icon" aria-hidden="true">{{ weatherOf(cityDaily.weather_code[i])[0] }}</span>
            <span class="desc">{{ weatherOf(cityDaily.weather_code[i])[1] }}</span>
            <span class="temps"><span class="min">{{ t(cityDaily.temperature_2m_min[i]) }}</span>{{ ' / ' }}<span class="max">{{ t(cityDaily.temperature_2m_max[i]) }}</span></span>
            <span class="rain">💧 {{ cityDaily.precipitation_probability_max[i] ?? '-' }}%</span>
          </li>
        </ul>
      </section>
    </template>

    <div v-if="!daily && !error" class="map-skeleton" />
  </main>
</template>
