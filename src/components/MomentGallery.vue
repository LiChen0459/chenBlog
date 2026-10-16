<template>
  <div v-if="images.length" class="moment-gallery" :class="`count-${Math.min(images.length, 4)}`">
    <button
      v-for="(src, i) in visible"
      :key="src + i"
      type="button"
      class="gallery-item"
      :aria-label="`查看第 ${i + 1} 张图片`"
      @click.stop="$emit('open', i)"
    >
      <img :src="src" :alt="alt" loading="lazy" decoding="async" />
      <span v-if="i === visible.length - 1 && rest > 0" class="gallery-more">+{{ rest }}</span>
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  images: { type: Array, default: () => [] },
  alt: { type: String, default: '' },
  max: { type: Number, default: 4 },
})

defineEmits(['open'])

const visible = computed(() => props.images.slice(0, props.max))
const rest = computed(() => Math.max(0, props.images.length - props.max))
</script>
