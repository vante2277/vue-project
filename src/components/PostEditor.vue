<script setup>
import { ref } from 'vue';

const props = defineProps({ post: { type: Object, required: true }, onSave: { type: Function, required: true } });
const emit = defineEmits(['cancel']);

const title = ref(props.post.title);
const content = ref(props.post.content);
const busy = ref(false);
const vFocus = { mounted: el => el.focus() };

const save = async () => {
  const t = title.value.trim();
  const c = content.value.trim();
  if (!t || !c) return;
  busy.value = true;
  await props.onSave(t, c);
  busy.value = false;
};
</script>

<template>
  <div class="item editing">
    <input v-model="title" v-focus class="edit-title" maxlength="100">
    <textarea v-model="content" class="edit-content" maxlength="2000" />
    <div class="actions">
      <button class="save-btn" :disabled="busy" @click="save">{{ busy ? '저장 중…' : '저장' }}</button>
      <button class="cancel-btn" @click="emit('cancel')">취소</button>
    </div>
  </div>
</template>
