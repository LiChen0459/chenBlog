<template>
  <Teleport to="body">
    <Transition name="lb">
      <div v-if="open && images.length" class="lightbox" @click.self="close">
        <button type="button" class="lb-btn lb-close" aria-label="关闭" @click="close">
          <Icon name="x" :size="20" />
        </button>

        <button
          v-if="images.length > 1"
          type="button"
          class="lb-btn lb-nav lb-prev"
          aria-label="上一张"
          @click.stop="step(-1)"
        >
          <Icon name="chevron-left" :size="22" />
        </button>

        <img class="lb-img" :src="images[index]" alt="" @click.stop />

        <button
          v-if="images.length > 1"
          type="button"
          class="lb-btn lb-nav lb-next"
          aria-label="下一张"
          @click.stop="step(1)"
        >
          <Icon name="chevron-right" :size="22" />
        </button>

        <div v-if="images.length > 1" class="lb-counter">{{ index + 1 }} / {{ images.length }}</div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch, onBeforeUnmount } from 'vue'
import Icon from './Icon.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  images: { type: Array, default: () => [] },
  start: { type: Number, default: 0 },
})

const emit = defineEmits(['close'])

const index = ref(0)

function step(delta) {
  const n = props.images.length
  if (!n) return
  index.value = (index.value + delta + n) % n
}

function close() {
  emit('close')
}

function onKey(e) {
  if (e.key === 'Escape') close()
  else if (e.key === 'ArrowLeft') step(-1)
  else if (e.key === 'ArrowRight') step(1)
}

watch(
  () => props.open,
  (v) => {
    if (v) {
      index.value = Math.min(Math.max(0, props.start), Math.max(0, props.images.length - 1))
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', onKey)
    } else {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  document.body.style.overflow = ''
  window.removeEventListener('keydown', onKey)
})
</script>
