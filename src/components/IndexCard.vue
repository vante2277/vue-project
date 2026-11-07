<script setup>
import { computed } from 'vue';

const props = defineProps({ item: { type: Object, required: true } });

const num = (v, digits = 2) =>
  v.toLocaleString('ko-KR', { minimumFractionDigits: digits, maximumFractionDigits: digits });

const timeText = ms => new Date(ms).toLocaleString('ko-KR', {
  month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
});

const dir = computed(() => (props.item.change > 0 ? 'up' : props.item.change < 0 ? 'down' : 'flat'));
const sign = computed(() => (props.item.change > 0 ? '▲' : props.item.change < 0 ? '▼' : ''));

// 작은 추세선(스파크라인) 좌표
const spark = computed(() => {
  const { spark: points, prevClose: base } = props.item;
  if (!points || points.length < 2) return null;
  const values = [...points, base];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const x = i => (i / (points.length - 1)) * 100;
  const y = v => 36 - ((v - min) / range) * 32 - 2;
  return { baseY: y(base), points: points.map((v, i) => `${x(i)},${y(v)}`).join(' ') };
});
</script>

<template>
  <li v-if="item.error" class="card">
    <div class="name">{{ item.name }}</div>
    <div class="fail">불러오지 못했습니다</div>
  </li>
  <li v-else :class="'card ' + dir">
    <div class="top">
      <span class="name">{{ item.name }}</span>
      <span :class="'state' + (item.open ? ' open' : '')">{{ item.open ? '장중' : '마감' }}</span>
    </div>
    <div class="price">{{ num(item.price) }}</div>
    <div class="change">
      {{ `${sign} ${num(Math.abs(item.change))} (${item.changePct > 0 ? '+' : ''}${num(item.changePct)}%)` }}
    </div>
    <svg v-if="spark" :class="'spark ' + dir" viewBox="0 0 100 36" preserveAspectRatio="none" aria-hidden="true">
      <line x1="0" x2="100" :y1="spark.baseY" :y2="spark.baseY" class="base" />
      <polyline :points="spark.points" />
    </svg>
    <div v-else class="spark" />
    <div class="meta">
      <span>고 {{ num(item.high) }} · 저 {{ num(item.low) }}</span>
      <span>{{ timeText(item.time) }}</span>
    </div>
  </li>
</template>
