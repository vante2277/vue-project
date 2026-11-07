<script setup>
import { ref } from 'vue';

const props = defineProps({ todo: { type: Object, required: true } });
const emit = defineEmits(['toggle', 'edit', 'remove']);

const editing = ref(false);
const draft = ref(props.todo.text);
const vFocus = { mounted: el => el.focus() };
// Enter 로 끝낸 뒤 입력창이 사라지며 blur 가 한 번 더 오는 것을 막습니다.
let finished = false;

const start = () => {
  finished = false;
  draft.value = props.todo.text;
  editing.value = true;
};

const finish = ok => {
  if (finished) return;
  finished = true;
  const v = draft.value.trim();
  if (ok && v && v !== props.todo.text) emit('edit', v);
  else draft.value = props.todo.text;
  editing.value = false;
};
</script>

<template>
  <li :class="'item' + (todo.done ? ' done' : '')">
    <input type="checkbox" :checked="todo.done" @change="emit('toggle', $event.target.checked)">
    <input v-if="editing" v-model="draft" v-focus class="edit" maxlength="100"
      @blur="finish(true)" @keydown.enter="finish(true)" @keydown.esc="finish(false)">
    <span v-else class="text" title="더블클릭하여 수정" @dblclick="start">{{ todo.text }}</span>
    <button class="del" aria-label="삭제" @click="emit('remove')">✕</button>
  </li>
</template>
