<template>
  <div class="moments-page">
    <span class="section-tag">&lt;moments&gt;</span>
    <div class="section-head">
      <h2>动态</h2>
    </div>
    <div class="section-line">
      <div class="section-line-inner"></div>
    </div>

    <!-- Tag filter -->
    <div class="tag-bar" v-if="allTags.length">
      <span class="tag-pill" :class="{ active: !activeTag }" @click="activeTag = null">All</span>
      <span v-for="t in allTags" :key="t" class="tag-pill" :class="{ active: activeTag === t }" @click="activeTag = activeTag === t ? null : t">{{ t }}</span>
    </div>

    <div class="timeline">
      <div
        v-for="(group, date) in grouped"
        :key="date"
        class="timeline-group animate-card"
      >
        <div class="timeline-date">{{ date }}</div>
        <div
          v-for="m in group"
          :key="m.id"
          class="moment-card"
        >
          <span class="moment-time">{{ m.time }}</span>
          <p>{{ m.content }}</p>
          <div class="tag-pills" v-if="m.tags?.length">
            <span class="tag-pill" v-for="t in m.tags" :key="t">{{ t }}</span>
          </div>
          <img v-if="m.image" :src="m.image" alt="" class="moment-img" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { getMoments } from '../api/moments.js'
import { moments as staticMoments } from '../data/posts.js'

const moments = ref([])
const activeTag = ref(null)
const allTags = computed(() => [...new Set(moments.value.flatMap(m => m.tags || []))].sort())
const filteredMoments = computed(() =>
  activeTag.value ? moments.value.filter(m => (m.tags || []).includes(activeTag.value)) : moments.value
)
const grouped = computed(() => {
  const map = {}
  for (const m of filteredMoments.value) {
    if (!map[m.date]) map[m.date] = []
    map[m.date].push(m)
  }
  return map
})

onMounted(async () => {
  try { moments.value = await getMoments() } catch { moments.value = staticMoments }
})
</script>
