<script setup>
import { ref } from 'vue';

const props = defineProps({ text: { type: String, required: true } });
const copied = ref(false);

const copy = async () => {
  try {
    await navigator.clipboard.writeText(props.text);
    copied.value = true;
    setTimeout(() => { copied.value = false; }, 1500);
  } catch {}
};
</script>

<template>
  <button class="copy" @click="copy">{{ copied ? '복사됨 ✓' : '복사' }}</button>
</template>
