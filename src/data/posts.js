export const blogPosts = [
  {
    id: 1,
    title: '开始写作',
    date: '2026-06-20',
    summary: '为什么决定开始写博客，以及这个博客的初衷。',
    tags: ['生活'],
    content: `一直想有一个属于自己的角落，用来记录生活、沉淀思考。

这个博客的初衷很简单——写给自己看。技术的积累、读书的感悟、生活的琐碎，都值得被认真对待。

不求日更，不追热点。只希望能保持写作的习惯，让每一个平凡的日子都有迹可循。

> 写作是对抗遗忘最好的方式。

希望多年后回看，这些文字能让我想起当时的自己。`,
  },
  {
    id: 2,
    title: 'Vue 3 组合式 API 入门',
    date: '2026-06-18',
    summary: '快速了解 Vue 3 Composition API 的核心概念与最佳实践。',
    tags: ['技术', '前端'],
    content: `Vue 3 的 Composition API 提供了一种更灵活的组织组件逻辑的方式。

## 为什么需要 Composition API？

在 Options API 中，同一个功能的逻辑被分散在 \`data\`、\`methods\`、\`computed\` 等不同选项中。随着组件变大，维护起来越来越困难。Composition API 让我们可以把相关的逻辑放在一起，更容易理解和复用。

## 核心 API

- **\`ref\`** 和 **\`reactive\`** 是最基础的响应式 API。\`ref\` 适用于基本类型，\`reactive\` 适用于对象。
- **\`computed\`** 和 **\`watch\`** 分别用于派生状态和副作用。
- **\`onMounted\`**、**\`onUnmounted\`** 等生命周期钩子可以直接在 setup 中使用。

## 自定义组合函数

把可复用的逻辑抽成 \`useXxx\` 函数，是 Composition API 最强大的用法之一。

\`\`\`js
// useMouse.js
import { ref, onMounted, onUnmounted } from 'vue'

export function useMouse() {
  const x = ref(0)
  const y = ref(0)

  function update(e) {
    x.value = e.pageX
    y.value = e.pageY
  }

  onMounted(() => window.addEventListener('mousemove', update))
  onUnmounted(() => window.removeEventListener('mousemove', update))

  return { x, y }
}
\`\`\``,
  },
  {
    id: 3,
    title: '读书笔记：《黑客与画家》',
    date: '2026-06-15',
    summary: 'Paul Graham 的经典文集，关于编程、创业与独立思考。',
    tags: ['读书', '技术'],
    content: `重读 Paul Graham 的《黑客与画家》，仍然有不少触动。

## 书呆子为什么不受欢迎

Graham 提出了一个很有意思的观点：美国高中的社交生态类似于监狱——你需要装作不在乎学习才能融入。而聪明的孩子往往不愿意放弃自己的兴趣，于是成了"书呆子"。

## 黑客与画家的类比

编程更像绘画而不是工程。优秀的代码是"画"出来的，需要反复修改、打磨。这种创作的自由和美感，是编程最吸引人的地方。

## 不能说的话

每个时代都有自己的禁忌。保持独立思考，敢于质疑"理所当然"的事，是创新的前提。

---

*推荐指数：★★★★★*`,
  },
]

export const moments = [
  { id: 1, date: '2026-06-24', time: '18:30', content: '傍晚的咖啡店，阳光正好洒在桌角。翻完了《月亮与六便士》的最后一页。', tags: ['日常'], image: null },
  { id: 2, date: '2026-06-23', time: '21:15', content: '今天跑步突破了5公里！虽然配速很慢，但坚持下来的感觉真好 🏃', tags: ['运动'], image: null },
  { id: 3, date: '2026-06-22', time: '12:00', content: '午餐尝试了新的拉面店，汤底浓郁，溏心蛋恰到好处。', tags: ['美食'], image: null },
  { id: 4, date: '2026-06-21', time: '09:00', content: '周一晨会，新的一周开始了。这周的目标：把博客上线。', tags: ['工作'], image: null },
  { id: 5, date: '2026-06-19', time: '22:45', content: '深夜写代码，突然理解了之前一直困惑的闭包概念。这种豁然开朗的感觉，可能就是编程的乐趣吧。', tags: ['技术'], image: null },
  { id: 6, date: '2026-06-17', time: '15:20', content: '周末去爬山，山顶的风很大，但视野无敌。大自然总能让人平静下来。⛰️', tags: ['生活'], image: null },
]
