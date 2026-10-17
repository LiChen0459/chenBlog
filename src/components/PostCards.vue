<template>
  <div class="card-grid">
    <article
      v-for="post in posts"
      :key="post.id"
      class="post-card animate-card"
      :class="{ pinned: post.pinned }"
    >
      <span v-if="post.pinned" class="card-bookmark" title="置顶">
        <Icon name="bookmark" :size="12" fill="currentColor" />
      </span>
      <router-link :to="`/blog/${post.id}`">
        <div class="card-meta">
          <time>{{ post.date }}</time>
          <router-link
            v-if="post.category"
            class="card-category"
            :to="`/category/${post.category.split('/').map(encodeURIComponent).join('/')}`"
            @click.stop
          >{{ post.category }}</router-link>
        </div>
        <h3>{{ post.title }}</h3>
        <p>{{ post.summary }}</p>
        <div class="tag-pills" v-if="post.tags?.length">
          <span
            v-for="t in post.tags"
            :key="t"
            class="tag-pill tag-pill--link"
            @click.stop.prevent="$router.push(`/tag/${encodeURIComponent(t)}`)"
          >{{ t }}</span>
        </div>
        <span class="card-arrow">阅读 <Icon name="arrow-up-right" :size="13" /></span>
      </router-link>
    </article>
  </div>
</template>

<script setup>
import Icon from './Icon.vue'

defineProps({
  posts: { type: Array, required: true },
})
</script>
