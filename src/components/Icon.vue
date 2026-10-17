<template>
  <svg
    class="icon"
    :class="{ 'icon-spin': name === 'loader' }"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    :fill="fill"
    stroke="currentColor"
    :stroke-width="stroke"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
    v-html="ICONS[name] || ''"
  />
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 18 },
  stroke: { type: [Number, String], default: 1.7 },
  fill: { type: String, default: 'none' },
})

const ICONS = {
  home: '<path d="M3 10.5 12 3.5l9 7"/><path d="M5.5 9.2V20a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9.2"/><path d="M9.6 21v-5.8h4.8V21"/>',
  'file-text': '<path d="M13.5 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5z"/><path d="M13.5 3v5.5H19"/><path d="M8.6 13h6.8M8.6 16.8h4.4"/>',
  camera: '<path d="M21.5 18.4a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2v-8.8a2 2 0 0 1 2-2h3.1l1.5-2.6h5.8l1.5 2.6h3.1a2 2 0 0 1 2 2z"/><circle cx="12" cy="13.4" r="3.5"/>',
  grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M8 3v4M16 3v4M3.5 10h17"/>',
  box: '<path d="M20.5 8.2 12 3.5 3.5 8.2v7.6L12 20.5l8.5-4.7z"/><path d="M3.5 8.2 12 12.9l8.5-4.7M12 12.9v7.6"/>',
  lock: '<rect x="4" y="10.4" width="16" height="10.6" rx="2.6"/><path d="M8 10.4V7.2a4 4 0 0 1 8 0v3.2"/>',
  unlock: '<rect x="4" y="10.6" width="16" height="10.4" rx="2.6"/><path d="M8 10.6V7.2a4 4 0 0 1 7.9-.8"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3.2"/>',
  'eye-off': '<path d="M3 3l18 18"/><path d="M10.6 6.1A9.7 9.7 0 0 1 12 6c6 0 9.5 6 9.5 6a17.2 17.2 0 0 1-3.3 4"/><path d="M6.6 6.9A16.6 16.6 0 0 0 2.5 12s3.5 6 9.5 6a9.4 9.4 0 0 0 4-.9"/><path d="M9.9 9.9a3.2 3.2 0 0 0 4.2 4.2"/>',
  sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.2M12 19.8V22M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2 12h2.2M19.8 12H22M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6"/>',
  moon: '<path d="M20.8 13.3A8.6 8.6 0 1 1 10.7 3.2a6.9 6.9 0 0 0 10.1 10.1z"/>',
  bookmark: '<path d="M6.6 3.8h10.8a1 1 0 0 1 1 1V21l-6.4-3.9L5.6 21V4.8a1 1 0 0 1 1-1z"/>',
  edit: '<path d="M12 20h8.5"/><path d="M16.4 3.6a2.1 2.1 0 0 1 3 3L7.6 18.4 3.6 19.6l1.2-4z"/>',
  trash: '<path d="M3.5 6.5h17"/><path d="M8.6 6.5V4.8a1.3 1.3 0 0 1 1.3-1.3h4.2a1.3 1.3 0 0 1 1.3 1.3v1.7"/><path d="M6 6.5 7 20a1.4 1.4 0 0 0 1.4 1.3h7.2A1.4 1.4 0 0 0 17 20l1-13.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  image: '<rect x="3.5" y="3.5" width="17" height="17" rx="2.6"/><circle cx="8.8" cy="8.8" r="1.6"/><path d="m20.5 15.4-4.6-4.6L5.2 20.5"/>',
  upload: '<path d="M12 16.5V4M7.6 8.4 12 4l4.4 4.4"/><path d="M4.5 15.5v3a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3"/>',
  'arrow-left': '<path d="M19 12H5M11.5 18.5 5 12l6.5-6.5"/>',
  'arrow-right': '<path d="M5 12h14M12.5 5.5 19 12l-6.5 6.5"/>',
  'arrow-up-right': '<path d="M7 17 17 7M8.6 7H17v8.4"/>',
  check: '<path d="M20 6.5 9.5 17 4 11.5"/>',
  'check-circle': '<circle cx="12" cy="12" r="8.6"/><path d="m8.4 12.2 2.4 2.4 4.8-5"/>',
  loader: '<path d="M12 3.2a8.8 8.8 0 1 0 8.8 8.8"/>',
  sliders: '<path d="M4 21v-6.4M4 10.6V3M12 21v-9M12 8V3M20 21v-4.4M20 12.6V3M1.6 14.6h4.8M9.6 8h4.8M17.6 16.6h4.8"/>',
  menu: '<path d="M3.5 7h17M3.5 12h17M3.5 17h17"/>',
  'chevron-down': '<path d="m6.5 9.5 5.5 5.5 5.5-5.5"/>',
  'chevron-left': '<path d="m14.5 6.5-5.5 5.5 5.5 5.5"/>',
  'chevron-right': '<path d="m9.5 6.5 5.5 5.5-5.5 5.5"/>',
  clock: '<circle cx="12" cy="12" r="8.6"/><path d="M12 7.2V12l3.2 2"/>',
  tag: '<path d="M20.5 13.2 13.2 20.5a1.8 1.8 0 0 1-2.6 0L3.5 13.3V3.5h9.8l7.2 7.2a1.8 1.8 0 0 1 0 2.5z"/><circle cx="8" cy="8" r="1.4"/>',
  logout: '<path d="M15 4.5h3.5a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H15"/><path d="M10 16.5 5.5 12 10 7.5M5.5 12h9"/>',
  link: '<path d="M10 13.5a4 4 0 0 0 5.7 0l2.6-2.6a4 4 0 0 0-5.7-5.7l-1.3 1.3"/><path d="M14 10.5a4 4 0 0 0-5.7 0L5.7 13.1a4 4 0 0 0 5.7 5.7l1.3-1.3"/>',
  list: '<circle cx="4.5" cy="6" r="1.2"/><circle cx="4.5" cy="12" r="1.2"/><circle cx="4.5" cy="18" r="1.2"/><path d="M9 6h11M9 12h11M9 18h11"/>',
  'panel-left': '<rect x="3.5" y="4" width="17" height="16" rx="2.4"/><path d="M9.5 4v16"/>',
  refresh: '<path d="M21.5 2v6h-6M2.5 22v-6h6"/><path d="M21 11A9 9 0 0 0 6.2 5.2L2.5 9M3 13a9 9 0 0 0 14.8 5.8l3.7-3.8"/>',
  'alert-circle': '<circle cx="12" cy="12" r="8.6"/><path d="M12 7.5v5M12 16.5h0"/>',
  search: '<circle cx="10.8" cy="10.8" r="6.4"/><path d="m15.8 15.8 4.7 4.7"/>',
  rss: '<circle cx="5.6" cy="18.4" r="1.4" fill="currentColor"/><path d="M4.2 4.2A16 16 0 0 1 19.8 19.8"/><path d="M4.2 10.2a9.6 9.6 0 0 1 9.6 9.6"/>',
  folder: '<path d="M3.5 8.2A2 2 0 0 1 5.5 6.2h3.9l2 2.4h7.1a2 2 0 0 1 2 2v7.2a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
  archive: '<rect x="3.5" y="4" width="17" height="4.6" rx="1.6"/><path d="M5 8.6v9.9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.6"/><path d="M10 12.4h4"/>',
  /* Layout page — standalone pages, kept distinct from file-text (posts). */
  layout: '<rect x="3.5" y="4" width="17" height="16.5" rx="2.2"/><path d="M3.5 9.4h17"/><path d="M9.2 9.4V20"/>',
}

const ICONS_KEYS = Object.keys(ICONS)
const isValid = computed(() => ICONS_KEYS.includes(props.name))
if (!isValid.value && import.meta.env.DEV) {
  console.warn(`[Icon] unknown icon name: "${props.name}"`)
}
</script>
