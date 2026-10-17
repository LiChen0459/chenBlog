<template>
  <div class="share-bar" aria-label="分享这篇文章">
    <span class="share-label">
      <Icon name="share-2" :size="14" />
      分享
    </span>
    <div class="share-actions">
      <button class="share-btn" type="button" @click="copyLink">
        <Icon name="link" :size="14" />
        <span>{{ copied ? '已复制' : '复制链接' }}</span>
      </button>
      <button class="share-btn" type="button" @click="shareWeibo">
        <Icon name="weibo" :size="14" />
        <span>微博</span>
      </button>
      <button class="share-btn" type="button" @click="openQr">
        <Icon name="wechat" :size="14" />
        <span>微信</span>
      </button>
      <button v-if="canNative" class="share-btn" type="button" @click="nativeShare">
        <Icon name="share-2" :size="14" />
        <span>更多</span>
      </button>
    </div>

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="qrOpen" class="share-qr-mask" @click.self="qrOpen = false">
          <div class="share-qr-card" role="dialog" aria-label="微信扫码分享">
            <p class="share-qr-title">微信扫码分享</p>
            <img
              v-if="!qrFailed"
              class="share-qr-img"
              :src="qrSrc"
              alt="分享二维码"
              @error="qrFailed = true"
            />
            <div v-else class="share-qr-fallback">
              <p>二维码服务加载失败，可以直接复制链接发给好友：</p>
              <code>{{ url }}</code>
            </div>
            <button class="share-qr-close" type="button" @click="qrOpen = false">关闭</button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import Icon from './Icon.vue'

const props = defineProps({
  title: { type: String, default: '' },
})

const url = computed(() => (typeof location !== 'undefined' ? location.href : ''))
const copied = ref(false)
const qrOpen = ref(false)
const qrFailed = ref(false)
const canNative = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

// QR is rendered by a public service (no dependency, no key). If it is
// unreachable the modal falls back to showing the raw link.
const qrSrc = computed(
  () => `https://quickchart.io/qr?size=220&margin=1&text=${encodeURIComponent(url.value)}`
)

let copyTimer = null

async function copyLink() {
  const text = url.value
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    // Older browsers / non-secure contexts: the textarea trick still works.
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    ta.remove()
  }
  copied.value = true
  clearTimeout(copyTimer)
  copyTimer = setTimeout(() => { copied.value = false }, 2000)
}

function shareWeibo() {
  const target =
    'https://service.weibo.com/share/share.php' +
    `?url=${encodeURIComponent(url.value)}&title=${encodeURIComponent(props.title || document.title)}`
  window.open(target, '_blank', 'noopener')
}

function openQr() {
  qrFailed.value = false
  qrOpen.value = true
}

async function nativeShare() {
  try {
    await navigator.share({ title: props.title, url: url.value })
  } catch {
    /* user dismissed the sheet — nothing to do */
  }
}
</script>
