<template>
  <div class="admin-root">
  <!-- ═══ BOOT / LOGIN ═══ -->
  <div class="admin-login" v-if="!loggedIn">
    <div class="login-glow" aria-hidden="true"></div>
    <div class="login-card">
      <div class="login-icon">
        <Icon name="lock" :size="24" />
      </div>
      <h1>Chen's Blog</h1>
      <p class="login-sub">管理后台</p>

      <template v-if="checking">
        <p class="login-checking">
          <Icon name="loader" :size="15" />
          正在验证登录状态…
        </p>
      </template>

      <template v-else>
        <div class="login-field">
          <Icon name="lock" :size="15" class="field-icon" />
          <input
            v-model="tokenInput"
            type="password"
            placeholder="管理密码"
            autocomplete="current-password"
            @keyup.enter="login"
          />
        </div>

        <!-- 人机验证：服务端签发题目，答案在服务端校验 -->
        <div class="captcha-wrap">
          <span class="captcha-hint">人机验证</span>
          <div class="captcha-inner">
            <div class="captcha-box" aria-label="验证码">
              <span v-if="captcha.question" class="captcha-text">{{ captcha.question }}</span>
              <span v-else-if="captchaErr" class="captcha-text captcha-text--err">{{ captchaErr }}</span>
              <span v-else class="captcha-text">加载中…</span>
              <span class="captcha-noise" aria-hidden="true"></span>
            </div>
            <button
              type="button"
              class="captcha-refresh"
              title="换一题"
              aria-label="换一题"
              @click="loadCaptcha"
            >
              <Icon name="refresh" :size="15" />
            </button>
            <input
              v-model="captchaInput"
              type="number"
              inputmode="numeric"
              placeholder="?"
              class="captcha-input"
              @keyup.enter="login"
            />
          </div>
        </div>

        <button class="mui-btn raised primary login-btn" :disabled="logging" @click="login">
          <Icon v-if="logging" name="loader" :size="15" />
          <span>{{ logging ? '登录中' : '登 录' }}</span>
        </button>

        <Transition name="err-slide">
          <div v-if="errMsg" class="err-msg">
            <Icon name="alert-circle" :size="14" />
            <span>{{ errMsg }}</span>
          </div>
        </Transition>
      </template>
    </div>
  </div>

  <!-- ═══ DASHBOARD ═══ -->
  <div class="admin-shell" v-else>
    <!-- SIDEBAR -->
    <aside class="admin-sidebar">
      <div class="sb-brand" @click="nav = 'dashboard'">
        <span class="sb-logo">C</span>
        <span class="sb-name">控制台</span>
      </div>

      <nav class="sb-nav">
        <button :class="{ active: nav === 'dashboard' }" @click="nav = 'dashboard'">
          <Icon name="grid" :size="16" />
          <span class="sb-label">概览</span>
        </button>
        <button :class="{ active: nav === 'posts' }" @click="nav = 'posts'">
          <Icon name="file-text" :size="16" />
          <span class="sb-label">文章</span>
        </button>
        <button :class="{ active: nav === 'moments' }" @click="nav = 'moments'">
          <Icon name="camera" :size="16" />
          <span class="sb-label">动态</span>
        </button>
        <button :class="{ active: nav === 'pages' }" @click="nav = 'pages'">
          <Icon name="layout" :size="16" />
          <span class="sb-label">页面</span>
        </button>
        <button :class="{ active: nav === 'media' }" @click="nav = 'media'">
          <Icon name="image" :size="16" />
          <span class="sb-label">媒体库</span>
        </button>
        <button :class="{ active: nav === 'settings' }" @click="nav = 'settings'">
          <Icon name="sliders" :size="16" />
          <span class="sb-label">设置</span>
        </button>
      </nav>

      <div class="sb-footer">
        <a href="/" class="sb-site-link">
          <Icon name="arrow-left" :size="14" />
          <span class="sb-label">返回网站</span>
        </a>
        <button class="sb-theme-btn" :title="themeRef === 'light' ? '切换到深色' : '切换到浅色'" @click="toggleAdminTheme">
          <Icon :name="themeRef === 'light' ? 'moon' : 'sun'" :size="15" />
          <span class="sb-label">{{ themeRef === 'light' ? '深色' : '浅色' }}</span>
        </button>
        <button @click="logout" class="sb-logout">
          <Icon name="logout" :size="15" />
          <span class="sb-label">退出登录</span>
        </button>
      </div>
    </aside>

    <!-- MAIN CONTENT -->
    <main class="content">
      <Transition name="tab" mode="out-in">
      <!-- ═══ 概览 ═══ -->
      <div v-if="nav === 'dashboard'" key="dashboard">
        <h2 class="page-heading">概览</h2>

        <div class="stat-grid">
          <div class="stat-card">
            <div class="stat-icon"><Icon name="file-text" :size="20" /></div>
            <div class="stat-num">
              <span v-if="!dataReady" class="stat-sk" aria-hidden="true" />
              <template v-else>{{ posts.length }}</template>
            </div>
            <div class="stat-label">文章总数</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon"><Icon name="camera" :size="20" /></div>
            <div class="stat-num">
              <span v-if="!dataReady" class="stat-sk" aria-hidden="true" />
              <template v-else>{{ moments.length }}</template>
            </div>
            <div class="stat-label">动态总数</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon"><Icon name="calendar" :size="20" /></div>
            <div class="stat-num">
              <span v-if="!dataReady" class="stat-sk" aria-hidden="true" />
              <template v-else>{{ todayCount }}</template>
            </div>
            <div class="stat-label">今日动态</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon"><Icon name="box" :size="20" /></div>
            <div class="stat-num">v1.0</div>
            <div class="stat-label">版本</div>
          </div>
        </div>

        <div class="recent-section">
          <h3>最近文章</h3>
          <div class="mui-table">
            <template v-if="!dataReady">
              <div v-for="n in 3" :key="`rsk-${n}`" class="mui-tr recent-row sk-loading" aria-hidden="true">
                <span class="sk-line" />
                <span class="sk-line" />
              </div>
            </template>
            <template v-else>
              <div v-for="p in posts.slice(0,5)" :key="p.id" class="mui-tr recent-row">
                <span class="mui-td title">
                  <Icon v-if="p.pinned" name="bookmark" :size="13" fill="currentColor" class="pin-mark" />
                  {{ p.title }}
                </span>
                <span class="mui-td date">{{ p.date }}</span>
              </div>
              <p v-if="!posts.length" class="table-empty">暂无文章</p>
            </template>
          </div>
        </div>
      </div>

      <!-- ═══ 文章管理 ═══ -->
      <div v-else-if="nav === 'posts'" key="posts">
        <div class="page-heading-row">
          <h2 class="page-heading">文章管理</h2>
          <div class="heading-actions">
            <router-link
              to="/desk/write"
              class="mui-btn raised primary"
              @mouseenter="preloadWrite"
              @focus="preloadWrite"
            >
              <Icon name="edit" :size="14" />
              写文章
            </router-link>
            <button
              class="mui-btn outlined"
              @click="openPostForm()"
              @mouseenter="preloadWrite"
              @focus="preloadWrite"
            >
              <Icon name="plus" :size="14" />
              快速编辑
            </button>
          </div>
        </div>

        <div v-if="loadingData && !posts.length" class="sk-list sk-loading" aria-hidden="true">
          <div v-for="n in 4" :key="`psk-${n}`" class="sk-card">
            <div class="sk-line w30" />
            <div class="sk-line w90" />
            <div class="sk-line w45" />
          </div>
        </div>

        <div class="mui-table" v-else-if="posts.length">
          <div class="bulk-bar">
            <label class="bulk-all">
              <input
                type="checkbox"
                :checked="allPostsSelected"
                :indeterminate.prop="selPosts.size > 0 && !allPostsSelected"
                @change="selectAllPosts"
              />
              <span>全选（{{ posts.length }}）</span>
            </label>
            <Transition name="bulk">
              <div v-if="selPosts.size" class="bulk-actions">
                <span class="bulk-count">已选 {{ selPosts.size }} 篇</span>
                <button class="mui-btn text" :disabled="isBusy('bulk-posts')" @click="runBulkPosts('pin')">
                  <Icon name="bookmark" :size="13" fill="currentColor" />
                  置顶
                </button>
                <button class="mui-btn text" :disabled="isBusy('bulk-posts')" @click="runBulkPosts('unpin')">
                  <Icon name="bookmark" :size="13" />
                  取消置顶
                </button>
                <button class="mui-btn text danger" :disabled="isBusy('bulk-posts')" @click="runBulkPosts('delete')">
                  <Icon v-if="isBusy('bulk-posts')" name="loader" :size="13" class="spin" />
                  <Icon v-else name="trash" :size="13" />
                  删除
                </button>
                <button class="mui-btn text" @click="selPosts.clear()">取消选择</button>
              </div>
            </Transition>
          </div>

          <div class="mui-tr header">
            <span></span><span>标题</span><span>日期</span><span>摘要</span><span></span>
          </div>
          <div
            v-for="p in posts"
            :key="p.id"
            class="mui-tr"
            :class="{ 'is-selected': selPosts.has(p.id) }"
          >
            <span class="row-check">
              <input
                type="checkbox"
                :checked="selPosts.has(p.id)"
                :aria-label="`选择《${p.title}》`"
                @change="toggleSel(selPosts, p.id)"
              />
            </span>
            <span class="title">
              <Icon v-if="p.pinned" name="bookmark" :size="13" fill="currentColor" class="pin-mark" />
              {{ p.title }}
            </span>
            <span class="date">{{ p.date }}</span>
            <span class="summary">{{ p.summary || '—' }}</span>
            <span class="actions">
              <button
                class="mui-btn text"
                :class="{ 'is-pinned': p.pinned }"
                :title="p.pinned ? '取消置顶' : '置顶'"
                :disabled="isBusy(`pin-${p.id}`)"
                @click="togglePin(p.id)"
              >
                <Icon v-if="isBusy(`pin-${p.id}`)" name="loader" :size="13" class="spin" />
                <Icon v-else name="bookmark" :size="13" :fill="p.pinned ? 'currentColor' : 'none'" />
                {{ p.pinned ? '已置顶' : '置顶' }}
              </button>
              <router-link :to="`/desk/write?id=${p.id}`" class="mui-btn text">
                <Icon name="edit" :size="13" />
                编辑
              </router-link>
              <button class="mui-btn text danger" @click="confirmDel('post', p.id)">
                <Icon name="trash" :size="13" />
                删除
              </button>
            </span>
          </div>
        </div>

        <div v-else-if="!loadingData" class="empty-state">
          <Icon name="file-text" :size="26" />
          <span>还没有文章，点击「写文章」开始</span>
        </div>
        <!-- Post Editor Modal -->
        <Transition name="dialog">
        <div v-if="showPostForm" class="mui-overlay" @click.self="closePostForm">
          <div class="mui-dialog wide">
            <div class="mui-dialog-header">
              <h3>{{ editingPost?.id ? '编辑文章' : '新建文章' }}</h3>
              <button class="mui-close" aria-label="关闭" @click="closePostForm">
                <Icon name="x" :size="16" />
              </button>
            </div>
            <div class="mui-dialog-body">
              <div v-if="postFormLoading || editorLoading" class="dialog-loading">
                <Icon name="loader" :size="18" class="spin" />
                <span>{{ postFormLoading ? '正在读取文章内容…' : '正在加载编辑器…' }}</span>
              </div>
              <div class="form-row">
                <input v-model="postForm.title" placeholder="文章标题..." class="mui-input" />
                <input type="date" v-model="postForm.date" class="mui-input short" />
              </div>
              <input v-model="postForm.summary" placeholder="摘要..." class="mui-input" />
              <div class="form-row">
                <input
                  v-model="postForm.category"
                  list="post-category-options"
                  class="mui-input"
                  placeholder="分类（支持 父/子 层级，如 技术/前端）"
                />
                <datalist id="post-category-options">
                  <option v-for="c in categoryOptions" :key="c.path" :value="c.path"></option>
                </datalist>
              </div>
              <div class="tag-input-inline">
                <input v-model="postTagInput" placeholder="标签（回车或逗号添加）" class="mui-input" @keyup.enter="addPostTag" @keyup.","="addPostTag" />
                <div class="tag-pills" v-if="postForm.tags?.length">
                  <button type="button" class="tag-pill removable" v-for="(t,i) in postForm.tags" :key="t" @click="postForm.tags.splice(i,1)">
                    {{ t }}
                    <Icon name="x" :size="10" />
                  </button>
                </div>
              </div>
              <label class="form-label">内容 <span class="hint">— 支持 Markdown</span></label>
              <div ref="editorContainer" class="editor-wrap"></div>
            </div>
            <div class="mui-dialog-footer">
              <button class="mui-btn outlined" @click="closePostForm">取消</button>
              <button
                class="mui-btn raised primary"
                :disabled="postFormLoading || editorLoading || isBusy('save-post')"
                @click="savePost"
              >
                <Icon v-if="isBusy('save-post')" name="loader" :size="14" class="spin" />
                {{ isBusy('save-post') ? '发布中…' : '发布' }}
              </button>
            </div>
          </div>
        </div>
        </Transition>
      </div>

      <!-- ═══ 动态管理 ═══ -->
      <div v-else-if="nav === 'moments'" key="moments">
        <div class="page-heading-row">
          <h2 class="page-heading">动态管理</h2>
          <button class="mui-btn raised primary" @click="openMomentForm()">
            <Icon name="plus" :size="14" />
            新建动态
          </button>
        </div>

        <div v-if="loadingData && !moments.length" class="sk-list sk-loading" aria-hidden="true">
          <div v-for="n in 4" :key="`msk-${n}`" class="sk-card">
            <div class="sk-line w30" />
            <div class="sk-line w90" />
            <div class="sk-line w45" />
          </div>
        </div>

        <div class="moment-grid" v-else-if="moments.length">
          <div class="bulk-bar">
            <label class="bulk-all">
              <input
                type="checkbox"
                :checked="allMomentsSelected"
                :indeterminate.prop="selMoments.size > 0 && !allMomentsSelected"
                @change="selectAllMoments"
              />
              <span>全选（{{ moments.length }}）</span>
            </label>
            <Transition name="bulk">
              <div v-if="selMoments.size" class="bulk-actions">
                <span class="bulk-count">已选 {{ selMoments.size }} 条</span>
                <button class="mui-btn text" :disabled="isBusy('bulk-moments')" @click="runBulkMoments('hide')">
                  <Icon name="lock" :size="13" />
                  隐藏
                </button>
                <button class="mui-btn text" :disabled="isBusy('bulk-moments')" @click="runBulkMoments('show')">
                  <Icon name="unlock" :size="13" />
                  显示
                </button>
                <button class="mui-btn text danger" :disabled="isBusy('bulk-moments')" @click="runBulkMoments('delete')">
                  <Icon v-if="isBusy('bulk-moments')" name="loader" :size="13" class="spin" />
                  <Icon v-else name="trash" :size="13" />
                  删除
                </button>
                <button class="mui-btn text" @click="selMoments.clear()">取消选择</button>
              </div>
            </Transition>
          </div>

          <div
            v-for="m in moments"
            :key="m.id"
            class="moment-item"
            :class="{ 'is-hidden': m.hidden, 'is-selected': selMoments.has(m.id) }"
          >
            <label class="row-check">
              <input
                type="checkbox"
                :checked="selMoments.has(m.id)"
                :aria-label="`选择 ${m.date} 的动态`"
                @change="toggleSel(selMoments, m.id)"
              />
            </label>
            <div class="moment-thumbs">
              <img
                v-if="firstImage(m)"
                :src="firstImage(m)"
                class="moment-pic"
                alt=""
              />
              <div v-else class="moment-pic placeholder"><Icon name="image" :size="18" /></div>
              <span v-if="imageCount(m) > 1" class="thumb-count">+{{ imageCount(m) - 1 }}</span>
            </div>
            <div class="moment-body">
              <span class="moment-meta">
                {{ m.date }} · {{ m.time }}
                <span v-if="m.hidden" class="hidden-flag"><Icon name="lock" :size="10" /> 已隐藏</span>
              </span>
              <p>{{ m.content || '（无文字）' }}</p>
            </div>
            <div class="moment-actions">
              <button
                class="mui-btn text"
                :class="{ 'is-pinned': m.hidden }"
                :title="m.hidden ? '取消隐藏（公开可见）' : '隐藏（需密码查看）'"
                :disabled="isBusy(`hide-${m.id}`)"
                @click="toggleHidden(m)"
              >
                <Icon v-if="isBusy(`hide-${m.id}`)" name="loader" :size="13" class="spin" />
                <Icon v-else :name="m.hidden ? 'unlock' : 'lock'" :size="13" />
                {{ m.hidden ? '显示' : '隐藏' }}
              </button>
              <button class="mui-btn text" @click="openMomentForm(m)">
                <Icon name="edit" :size="13" />
                编辑
              </button>
              <button class="mui-btn text danger" @click="confirmDel('moment', m.id)">
                <Icon name="trash" :size="13" />
                删除
              </button>
            </div>
          </div>
        </div>

        <div v-else-if="!loadingData" class="empty-state">
          <Icon name="camera" :size="26" />
          <span>还没有动态</span>
        </div>

        <!-- Moment Editor Modal -->
        <Transition name="dialog">
        <div v-if="showMomentForm" class="mui-overlay" @click.self="showMomentForm = false">
          <div class="mui-dialog">
            <div class="mui-dialog-header">
              <h3>{{ editingMoment?.id ? '编辑动态' : '新建动态' }}</h3>
              <button class="mui-close" aria-label="关闭" @click="showMomentForm = false">
                <Icon name="x" :size="16" />
              </button>
            </div>
            <div class="mui-dialog-body">
              <div class="form-row">
                <input type="date" v-model="momentForm.date" class="mui-input short" />
                <input type="time" v-model="momentForm.time" class="mui-input short" />
              </div>
              <textarea v-model="momentForm.content" placeholder="此刻的想法..." class="mui-input" rows="3"></textarea>
              <div class="tag-input-inline">
                <input v-model="momentTagInput" placeholder="标签（回车或逗号添加）" class="mui-input" @keyup.enter="addMomentTag" @keyup.","="addMomentTag" />
                <div class="tag-pills" v-if="momentForm.tags?.length">
                  <button type="button" class="tag-pill removable" v-for="(t,i) in momentForm.tags" :key="t" @click="momentForm.tags.splice(i,1)">
                    {{ t }}
                    <Icon name="x" :size="10" />
                  </button>
                </div>
              </div>

              <label class="form-label">
                图片 <span class="hint">— 支持多张，可拖拽</span>
              </label>
              <div
                class="upload-area"
                :class="{ busy: uploading }"
                @click="pickFiles"
                @dragover.prevent
                @drop.prevent="onDrop"
              >
                <Icon v-if="uploading" name="loader" :size="18" />
                <Icon v-else name="upload" :size="18" />
                <span v-if="uploading">上传中…</span>
                <span v-else-if="momentForm.images.length">已选 {{ momentForm.images.length }} 张 · 点击继续添加</span>
                <span v-else>点击或拖拽上传图片（可多选）</span>
              </div>
              <input ref="fileInput" type="file" accept="image/*" multiple @change="onFileChange" hidden />

              <div v-if="momentForm.images.length" class="upload-grid">
                <div v-for="(src, i) in momentForm.images" :key="src + i" class="upload-thumb">
                  <img :src="src" alt="" />
                  <button type="button" class="thumb-remove" aria-label="移除" @click="removeImage(i)">
                    <Icon name="x" :size="12" />
                  </button>
                </div>
              </div>

              <label class="switch-row">
                <input type="checkbox" v-model="momentForm.hidden" />
                <span class="switch-box"><Icon name="check" :size="12" /></span>
                <span class="switch-text">
                  <Icon name="lock" :size="13" />
                  隐藏这条动态
                  <em>隐藏后仅在输入访问密码后可见</em>
                </span>
              </label>
            </div>
            <div class="mui-dialog-footer">
              <button class="mui-btn outlined" @click="showMomentForm = false">取消</button>
              <button class="mui-btn raised primary" @click="saveMoment" :disabled="uploading || isBusy('save-moment')">
                <Icon v-if="isBusy('save-moment')" name="loader" :size="14" class="spin" />
                {{ isBusy('save-moment') ? '保存中…' : '保存' }}
              </button>
            </div>
          </div>
        </div>
        </Transition>
      </div>

      <!-- ═══ 页面管理（关于我 / 友情链接等独立页面） ═══ -->
      <div v-else-if="nav === 'pages'" key="pages">
        <div class="page-heading-row">
          <h2 class="page-heading">页面管理</h2>
          <button class="mui-btn raised primary" @click="openPageForm()">
            <Icon name="plus" :size="14" />
            新建页面
          </button>
        </div>

        <div class="mui-table" v-if="pages.length">
          <div class="mui-tr header">
            <span></span><span>标题</span><span>地址</span><span>更新时间</span><span></span>
          </div>
          <div v-for="pg in pages" :key="pg.slug" class="mui-tr">
            <span class="page-icon"><Icon name="layout" :size="15" /></span>
            <span class="title">{{ pg.title }}</span>
            <span class="slug">/page/{{ pg.slug }}</span>
            <span class="date">{{ pg.updated_at || '—' }}</span>
            <span class="actions">
              <router-link :to="`/page/${pg.slug}`" class="mui-btn text" target="_blank">
                <Icon name="arrow-up-right" :size="13" />
                查看
              </router-link>
              <button class="mui-btn text" @click="openPageForm(pg)">
                <Icon name="edit" :size="13" />
                编辑
              </button>
              <button class="mui-btn text danger" @click="confirmDel('page', pg.slug)">
                <Icon name="trash" :size="13" />
                删除
              </button>
            </span>
          </div>
        </div>

        <div v-else-if="!loadingData" class="empty-state">
          <Icon name="file-text" :size="26" />
          <span>还没有独立页面</span>
        </div>

        <!-- Page Editor Modal -->
        <Transition name="dialog">
        <div v-if="showPageForm" class="mui-overlay" @click.self="closePageForm">
          <div class="mui-dialog wide">
            <div class="mui-dialog-header">
              <h3>{{ editingPage?.slug ? '编辑页面' : '新建页面' }}</h3>
              <button class="mui-close" aria-label="关闭" @click="closePageForm">
                <Icon name="x" :size="16" />
              </button>
            </div>
            <div class="mui-dialog-body">
              <div class="form-row">
                <input v-model="pageForm.title" placeholder="页面标题，如「关于我」" class="mui-input" />
              </div>
              <div class="form-row">
                <input
                  v-model="pageForm.slug"
                  class="mui-input"
                  placeholder="页面地址（英文小写 + 连字符，如 about）"
                  :disabled="!!editingPage?.slug"
                />
              </div>
              <p class="form-hint">地址即前台链接 /page/&lt;地址&gt;，创建后不可修改。</p>
              <label class="form-label">内容 <span class="hint">— 支持 Markdown</span></label>
              <textarea
                v-model="pageForm.content"
                class="mui-input page-editor"
                rows="14"
                placeholder="页面内容，支持 Markdown 与 LaTeX 公式…"
              ></textarea>
            </div>
            <div class="mui-dialog-footer">
              <button class="mui-btn outlined" @click="closePageForm">取消</button>
              <button
                class="mui-btn raised primary"
                :disabled="!pageForm.title.trim() || !pageForm.slug.trim() || isBusy('save-page')"
                @click="savePage"
              >
                <Icon v-if="isBusy('save-page')" name="loader" :size="14" class="spin" />
                {{ isBusy('save-page') ? '保存中…' : '保存' }}
              </button>
            </div>
          </div>
        </div>
        </Transition>
      </div>

      <!-- ═══ 媒体库 ═══ -->
      <div v-else-if="nav === 'media'" key="media">
        <div class="page-heading-row">
          <h2 class="page-heading">媒体库</h2>
          <button class="mui-btn outlined" :disabled="isBusy('media-load')" @click="loadMedia(true)">
            <Icon v-if="isBusy('media-load')" name="loader" :size="14" class="spin" />
            <Icon v-else name="refresh" :size="14" />
            刷新
          </button>
        </div>
        <p class="media-hint">文章与动态里上传过的全部图片。删除前先看「使用中」标注——删掉后引用它的位置会显示裂图。</p>

        <div v-if="mediaLoading && !media.length" class="media-grid" aria-hidden="true">
          <div v-for="n in 6" :key="`msk-${n}`" class="media-card media-sk">
            <div class="sk-line w70" />
            <div class="sk-line w40" />
          </div>
        </div>

        <div v-else-if="media.length" class="media-grid">
          <div v-for="item in media" :key="item.url" class="media-card">
            <a class="media-thumb" :href="item.url" target="_blank" rel="noopener" :title="mediaName(item)">
              <img :src="item.url" :alt="mediaName(item)" loading="lazy" />
            </a>
            <div class="media-body">
              <p class="media-name" :title="item.pathname || item.url">{{ mediaName(item) }}</p>
              <p class="media-meta">{{ mediaSize(item.size) }} · {{ mediaDate(item.uploadedAt) }}</p>
              <div v-if="item.usedIn?.length" class="media-usage">
                <span class="media-usage-label">使用中</span>
                <a
                  v-for="u in item.usedIn"
                  :key="`${u.type}-${u.id}`"
                  class="media-usage-item"
                  :href="usageLink(u)"
                  target="_blank"
                  rel="noopener"
                  :title="u.title"
                >
                  <Icon :name="u.type === 'post' ? 'file-text' : u.type === 'moment' ? 'camera' : 'layout'" :size="11" />
                  {{ u.title }}
                </a>
              </div>
              <p v-else class="media-unused">未使用</p>
            </div>
            <button
              class="mui-btn text danger media-del"
              :disabled="isBusy(mediaBusyKey(item))"
              @click="confirmDelMedia(item)"
            >
              <Icon v-if="isBusy(mediaBusyKey(item))" name="loader" :size="13" class="spin" />
              <Icon v-else name="trash" :size="13" />
              删除
            </button>
          </div>
        </div>

        <div v-else-if="!mediaLoading" class="empty-state">
          <Icon name="image" :size="26" />
          <span>还没有上传过图片</span>
        </div>

        <div v-if="mediaHasMore" class="load-more-wrap">
          <button class="load-more-btn" :disabled="mediaLoading" @click="loadMedia(false)">
            <Icon v-if="mediaLoading" name="loader" :size="14" class="spin" />
            <Icon v-else name="chevron-down" :size="14" />
            <span>{{ mediaLoading ? '加载中…' : '加载更多' }}</span>
          </button>
        </div>
      </div>

      <!-- ═══ 设置 ═══ -->
      <div v-else-if="nav === 'settings'" key="settings">
        <h2 class="page-heading">设置</h2>

        <section class="settings-card">
          <div class="settings-card-head">
            <div class="settings-icon"><Icon name="lock" :size="18" /></div>
            <div class="settings-card-title">
              <h3>动态访问密码</h3>
              <p class="settings-desc">前台解锁「隐藏动态」时使用的密码。</p>
            </div>
            <span class="settings-badge" :class="{ custom: pwdState.custom }">
              <Icon :name="pwdState.custom ? 'check-circle' : 'unlock'" :size="12" />
              {{ pwdState.custom ? '已自定义' : '默认 · ADMIN_TOKEN' }}
            </span>
          </div>

          <div v-if="pwdState.loading" class="settings-skeleton" aria-hidden="true">
            <div class="sk-line w45" />
            <div class="sk-line w90" />
          </div>

          <div v-else class="settings-body">
            <div class="settings-grid">
              <div class="settings-field">
                <label for="pwd-new">新密码</label>
                <input
                  id="pwd-new" v-model="pwdForm.value" type="password" class="mui-input"
                  :placeholder="`至少 ${pwdState.minLength} 位`"
                  autocomplete="new-password" @input="pwdErr = ''"
                />
              </div>
              <div class="settings-field">
                <label for="pwd-confirm">确认密码</label>
                <input
                  id="pwd-confirm" v-model="pwdForm.confirm" type="password" class="mui-input"
                  placeholder="再输入一次"
                  autocomplete="new-password" @input="pwdErr = ''" @keyup.enter="savePassword"
                />
              </div>
            </div>

            <p v-if="pwdErr" class="settings-err">
              <Icon name="x" :size="13" />{{ pwdErr }}
            </p>

            <div class="settings-actions">
              <button class="mui-btn raised primary" :disabled="isBusy('save-pwd')" @click="savePassword">
                <Icon v-if="isBusy('save-pwd')" name="loader" :size="14" class="spin" />
                <Icon v-else name="check" :size="14" />
                {{ isBusy('save-pwd') ? '保存中…' : '保存密码' }}
              </button>
              <button
                v-if="pwdState.custom" class="mui-btn outlined"
                :disabled="isBusy('clear-pwd')" @click="clearPassword"
              >
                <Icon v-if="isBusy('clear-pwd')" name="loader" :size="14" class="spin" />
                <Icon v-else name="trash" :size="14" />
                恢复默认
              </button>
            </div>

            <p class="settings-hint">
              <Icon name="check-circle" :size="13" />
              <span>密码以 scrypt 加盐哈希存储，不会明文保存。前台解锁后只会拿到一个 12 小时有效的只读令牌，拿不到管理密码。</span>
            </p>
          </div>
        </section>
      </div>
      </Transition>

      <!-- 删除确认 -->
      <Transition name="dialog">
      <div v-if="confirmState.show" class="mui-overlay" @click.self="confirmState.show = false">
        <div class="mui-dialog small">
          <div class="mui-dialog-header">
            <h3>确认删除</h3>
          </div>
          <div class="mui-dialog-body">
            <p>{{ confirmState.msg }}</p>
          </div>
          <div class="mui-dialog-footer">
            <button class="mui-btn outlined" :disabled="isBusy(confirmState.key)" @click="confirmState.show = false">取消</button>
            <button class="mui-btn raised danger" :disabled="isBusy(confirmState.key)" @click="confirmState.onOk">
              <Icon v-if="isBusy(confirmState.key)" name="loader" :size="14" class="spin" />
              {{ isBusy(confirmState.key) ? '处理中…' : confirmState.okLabel }}
            </button>
          </div>
        </div>
      </div>
      </Transition>

      <!-- 提示 -->
      <transition name="toast">
        <div v-if="toast.show" class="toast" :class="toast.type">{{ toast.msg }}</div>
      </transition>
    </main>
  </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import Icon from '../components/Icon.vue'
import { admin, saveCaptcha, clearCaptcha } from '../api/admin.js'
import { momentImages } from '../utils/moment.js'
import { getMedia, deleteMedia } from '../api/media.js'

/* ── Lazy editor ──
   Toast UI editor is ~573 kB JS + 183 kB CSS. Importing it at module scope meant
   that merely opening /desk downloaded the entire editor bundle, even though it
   is only needed once a post dialog is actually opened. Load it on first use. */
let editorCtorPromise = null
function loadEditor() {
  if (!editorCtorPromise) {
    editorCtorPromise = Promise.all([
      import('@toast-ui/editor'),
      import('@toast-ui/editor/dist/toastui-editor.css'),
      import('@toast-ui/editor/dist/theme/toastui-editor-dark.css'),
    ]).then(([mod]) => mod.default)
  }
  return editorCtorPromise
}

/* Preload the full-page writer on intent (hover / focus) rather than eagerly, so
   the first paint of /desk no longer pays for it. */
let writePreloaded = false
function preloadWrite() {
  if (writePreloaded) return
  writePreloaded = true
  import('./admin/Write.vue')
}

/* ── Theme ── */
function getTheme() { return document.documentElement.getAttribute('data-theme') || 'dark' }
const themeRef = ref(getTheme())
function onTheme(e) { themeRef.value = e.detail }
window.addEventListener('theme-change', onTheme)
function toggleAdminTheme() {
  const next = themeRef.value === 'light' ? 'dark' : 'light'
  themeRef.value = next
  localStorage.setItem('blog-theme', next)
  document.documentElement.setAttribute('data-theme', next)
  window.dispatchEvent(new CustomEvent('theme-change', { detail: next }))
}

/* ── Auth ── */
const loggedIn = ref(false)
const checking = ref(true)
const logging = ref(false)
const tokenInput = ref('')
const errMsg = ref('')

/* ── Captcha (人机验证) ──
   The question comes from GET /api/auth/challenge and is signed by the
   server; the answer is verified server-side, so a script that skips this
   screen gets nowhere. The solved challenge is kept for 12h so a refresh
   does not force another solve. */
const captcha = ref({ question: '', token: '' })
const captchaInput = ref('')
const captchaErr = ref('')

async function loadCaptcha() {
  captchaErr.value = ''
  try {
    const cap = await admin.getChallenge()
    captcha.value = { question: cap.question, token: cap.token }
    captchaInput.value = ''
  } catch (e) {
    captcha.value = { question: '', token: '' }
    captchaErr.value = e.message || '验证码加载失败'
  }
}

async function login() {
  if (!tokenInput.value) { errMsg.value = '请输入管理密码'; return }
  if (!captchaInput.value) { errMsg.value = '请输入验证码答案'; return }

  logging.value = true
  errMsg.value = ''
  try {
    await admin.login(tokenInput.value, {
      token: captcha.value.token,
      answer: captchaInput.value,
    })

    localStorage.setItem('admin_token', tokenInput.value)
    saveCaptcha({ token: captcha.value.token, answer: captchaInput.value })
    tokenInput.value = ''
    await loadCaptcha()
    loggedIn.value = true
    await loadAll()
  } catch (e) {
    errMsg.value = e.message || '登录失败'
    await loadCaptcha()
  } finally {
    logging.value = false
  }
}

function logout() {
  localStorage.removeItem('admin_token')
  clearCaptcha()
  loggedIn.value = false
  posts.value = []
  moments.value = []
  tokenInput.value = ''
}

/* ── Nav ── */
const nav = ref('dashboard')

/* ── Data ── */
const posts = ref([])
const moments = ref([])
const pages = ref([])
const todayCount = ref(0)
const loadingData = ref(false)
/** Existing category paths, offered as suggestions in the post editor. */
const categoryOptions = ref([])
/**
 * False until the first load resolves. The stat cards render `0` while the
 * arrays are still empty, which reads as real data ("文章总数 0") even though
 * nothing has arrived yet — so they show a placeholder until this flips.
 */
const dataReady = ref(false)

async function loadAll() {
  loadingData.value = true
  try {
    const [p, m] = await Promise.all([admin.getPosts(), admin.getMoments()])
    posts.value = p || []
    moments.value = m || []
    const today = new Date().toISOString().slice(0, 10)
    todayCount.value = moments.value.filter(x => x.date === today).length
  } catch (e) {
    toastMsg(e.message, 'error')
  }
  // Pages / taxonomy load independently: a failure in one must not
  // blank the whole dashboard.
  try { pages.value = await admin.getPages() || [] } catch (e) { toastMsg(`页面加载失败：${e.message}`, 'error') }
  try {
    const tax = await admin.getTaxonomy()
    categoryOptions.value = tax?.categories || []
  } catch { /* taxonomy is advisory only */ }

  loadingData.value = false
  // Flip even on failure so a broken request does not shimmer forever.
  dataReady.value = true
  // A reload may have removed rows that were still ticked.
  pruneSelection()
}

/** Verify a stored token before showing the dashboard. */
async function bootstrap() {
  if (!localStorage.getItem('admin_token')) { checking.value = false; loadCaptcha(); return }
  try {
    await admin.verify()
    loggedIn.value = true
    await loadAll()
  } catch {
    localStorage.removeItem('admin_token')
    clearCaptcha()
  } finally {
    checking.value = false
    if (!loggedIn.value) loadCaptcha()
  }
}
onMounted(bootstrap)

/* ── Media library ── */
const MEDIA_PAGE = 60

const media = ref([])
const mediaCursor = ref(null)
const mediaHasMore = ref(false)
const mediaLoading = ref(false)
const mediaLoaded = ref(false)

/** Load a page; `reset` restarts from the newest item. */
async function loadMedia(reset) {
  if (mediaLoading.value) return
  mediaLoading.value = true
  try {
    const page = await getMedia({
      cursor: reset ? undefined : mediaCursor.value || undefined,
      limit: MEDIA_PAGE,
    })
    const items = page.items || []
    media.value = reset ? items : [...media.value, ...items]
    mediaCursor.value = page.cursor ?? null
    mediaHasMore.value = !!page.hasMore
  } catch (e) {
    toastMsg(`媒体库加载失败：${e.message}`, 'error')
  } finally {
    mediaLoading.value = false
  }
}

// Fetch on first visit only — the tab is not part of loadAll so the
// dashboard never pays for the image scan.
watch(nav, (v) => {
  if (v === 'media' && !mediaLoaded.value) {
    mediaLoaded.value = true
    loadMedia(true)
  }
})

const mediaBusyKey = (item) => `del-media-${item.url}`

function confirmDelMedia(item) {
  const used = item.usedIn || []
  const names = used
    .map((u) => `${u.type === 'post' ? '文章' : u.type === 'moment' ? '动态' : '页面'}《${u.title}》`)
    .join('、')
  confirmState.msg = used.length
    ? `这张图片正被${names}使用，删除后这些位置将显示裂图。确定删除吗？`
    : '确定要删除这张未使用的图片吗？此操作不可撤销。'
  confirmState.key = mediaBusyKey(item)
  confirmState.okLabel = '确认删除'
  confirmState.show = true
  confirmState.onOk = () => withBusy(confirmState.key, async () => {
    try {
      await deleteMedia(item.url)
      media.value = media.value.filter((m) => m.url !== item.url)
      toastMsg('图片已删除')
    } catch (e) {
      toastMsg(`删除失败：${e.message}`, 'error')
    } finally {
      confirmState.show = false
    }
  })
}

/** Last path segment, decoded — "moments/1712-ab.jpg" → "1712-ab.jpg". */
function mediaName(item) {
  const p = String(item.pathname || item.url || '')
  try { return decodeURIComponent(p.split('/').pop() || p) } catch { return p.split('/').pop() || p }
}

function mediaSize(bytes) {
  const n = Number(bytes) || 0
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(2)} MB`
}

function mediaDate(iso) {
  return iso ? String(iso).slice(0, 10) : '—'
}

function usageLink(u) {
  if (u.type === 'post') return `/blog/${u.id}`
  if (u.type === 'page') return `/page/${u.slug || u.id}`
  return '/moments'
}

/* ── Toast ── */
const toast = reactive({ show: false, msg: '', type: 'success' })
let toastTimer = null
function toastMsg(msg, type = 'success') {
  toast.msg = msg; toast.type = type; toast.show = true
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.show = false }, 3000)
}

/* ── Per-action busy state ──
   Every row action gets its own key so only the button that was clicked shows a
   spinner, and it is disabled meanwhile — no more double-submits. */
const busy = reactive({})
const isBusy = (key) => !!busy[key]
async function withBusy(key, fn) {
  if (busy[key]) return
  busy[key] = true
  try { return await fn() } finally { delete busy[key] }
}

/* ── Confirm ── */
const confirmState = reactive({ show: false, msg: '', key: '', okLabel: '确认删除', onOk: () => {} })
function confirmDel(type, id) {
  const label = { post: '文章', moment: '动态', page: '页面' }[type] || '内容'
  confirmState.msg = `确定要删除这条${label}吗？此操作不可撤销。`
  confirmState.key = `del-${type}-${id}`
  confirmState.okLabel = '确认删除'
  confirmState.show = true
  confirmState.onOk = () => withBusy(confirmState.key, async () => {
    try {
      if (type === 'post') { await admin.deletePost(id); await loadPosts() }
      else if (type === 'moment') { await admin.deleteMoment(id); await loadMoments() }
      else if (type === 'page') { await admin.deletePage(id); await loadPages() }
      confirmState.show = false
      toastMsg('已删除')
    } catch (e) { toastMsg(e.message, 'error') }
  })
}

/* ── Batch selection ──
   Both admin lists let you tick many rows and act on them at once. Selection is
   a reactive Set per list and is cleared after every batch, so a stale id can
   never be submitted twice. A single bulk request replaces N round-trips. */
const selPosts = reactive(new Set())
const selMoments = reactive(new Set())

const selPostIds = computed(() => [...selPosts])
const selMomentIds = computed(() => [...selMoments])

const allPostsSelected = computed(() =>
  posts.value.length > 0 && selPosts.size === posts.value.length)
const allMomentsSelected = computed(() =>
  moments.value.length > 0 && selMoments.size === moments.value.length)

function toggleSel(set, id) {
  if (set.has(id)) set.delete(id)
  else set.add(id)
}

function selectAllPosts() {
  if (allPostsSelected.value) selPosts.clear()
  else posts.value.forEach(p => selPosts.add(p.id))
}

function selectAllMoments() {
  if (allMomentsSelected.value) selMoments.clear()
  else moments.value.forEach(m => selMoments.add(m.id))
}

/** Drop ids that no longer exist — a reload may have removed them. */
function pruneSelection() {
  const postIds = new Set(posts.value.map(p => p.id))
  for (const id of [...selPosts]) if (!postIds.has(id)) selPosts.delete(id)
  const momentIds = new Set(moments.value.map(m => m.id))
  for (const id of [...selMoments]) if (!momentIds.has(id)) selMoments.delete(id)
}

async function runBulkPosts(action) {
  const ids = selPostIds.value
  if (!ids.length) return
  const verb = { pin: '置顶', unpin: '取消置顶', delete: '删除' }[action]

  const run = () => withBusy('bulk-posts', async () => {
    try {
      const r = await admin.bulkPosts(ids, action)
      toastMsg(`已${verb} ${r?.updated ?? r?.deleted ?? ids.length} 篇文章`)
      confirmState.show = false
      selPosts.clear()
      await loadAll()
    } catch (e) {
      toastMsg(e.message, 'error')
    }
  })

  if (action === 'delete') {
    confirmState.msg = `确定要删除选中的 ${ids.length} 篇文章吗？此操作不可撤销。`
    confirmState.key = 'bulk-posts'
    confirmState.okLabel = `删除 ${ids.length} 篇`
    confirmState.show = true
    confirmState.onOk = run
    return
  }
  await run()
}

async function runBulkMoments(action) {
  const ids = selMomentIds.value
  if (!ids.length) return
  const verb = { hide: '隐藏', show: '显示', delete: '删除' }[action]

  const run = () => withBusy('bulk-moments', async () => {
    try {
      const r = await admin.bulkMoments(ids, action)
      toastMsg(`已${verb} ${r?.updated ?? r?.deleted ?? ids.length} 条动态`)
      confirmState.show = false
      selMoments.clear()
      await loadAll()
    } catch (e) {
      toastMsg(e.message, 'error')
    }
  })

  if (action === 'delete') {
    confirmState.msg = `确定要删除选中的 ${ids.length} 条动态吗？此操作不可撤销。`
    confirmState.key = 'bulk-moments'
    confirmState.okLabel = `删除 ${ids.length} 条`
    confirmState.show = true
    confirmState.onOk = run
    return
  }
  await run()
}

/* ── Posts ── */
const showPostForm = ref(false)
const editingPost = ref(null)
const postFormLoading = ref(false)
const editorLoading = ref(false)
const postForm = reactive({ title: '', date: '', summary: '', category: '', content: '', tags: [] })
const postTagInput = ref('')
const editorContainer = ref(null)
let editorInstance = null

const TOOLBAR = [
  ['heading', 'bold', 'italic', 'strike'],
  ['hr', 'quote'],
  ['ul', 'ol', 'task'],
  ['table', 'image', 'link'],
  ['code', 'codeblock'],
  ['scrollSync'],
]

function addPostTag() {
  const t = postTagInput.value.replace(/,/g, '').trim()
  if (t && !postForm.tags.includes(t)) postForm.tags.push(t)
  postTagInput.value = ''
}

async function buildEditor(value) {
  const Editor = await loadEditor()
  // The dialog may have been closed while the chunk was in flight.
  if (!showPostForm.value || !editorContainer.value) return null
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
  return new Editor({
    el: editorContainer.value,
    height: '420px',
    initialValue: value || '',
    initialEditType: 'markdown',
    previewStyle: 'vertical',
    theme: isDark ? 'dark' : 'default',
    placeholder: 'Markdown 写作...',
    toolbarItems: TOOLBAR,
  })
}

async function initEditor() {
  if (editorInstance) { editorInstance.destroy(); editorInstance = null }
  editorInstance = await buildEditor(postForm.content)
}

function closePostForm() {
  showPostForm.value = false
  if (editorInstance) { editorInstance.destroy(); editorInstance = null }
}

watch(themeRef, async () => {
  if (!editorInstance || !showPostForm.value) return
  const md = editorInstance.getMarkdown()
  editorInstance.destroy()
  editorInstance = null
  editorInstance = await buildEditor(md)
})

/**
 * The list endpoint returns a lean projection (no markdown body), so when
 * editing we fetch the full post first — otherwise saving the quick-edit form
 * would overwrite the article with an empty body.
 */
async function openPostForm(post = null) {
  editingPost.value = post
  postForm.title = post?.title || ''
  postForm.date = post?.date || new Date().toISOString().slice(0, 10)
  postForm.summary = post?.summary || ''
  postForm.category = post?.category || ''
  postForm.content = ''
  postForm.tags = post?.tags ? [...post.tags] : []
  showPostForm.value = true
  postFormLoading.value = !!post?.id
  editorLoading.value = true

  try {
    if (post?.id) {
      try {
        const full = await admin.getPost(post.id)
        postForm.title = full?.title ?? postForm.title
        postForm.date = full?.date ?? postForm.date
        postForm.summary = full?.summary ?? postForm.summary
        postForm.category = full?.category ?? postForm.category
        postForm.content = full?.content || ''
        postForm.tags = full?.tags ? [...full.tags] : postForm.tags
      } catch (e) {
        toastMsg(`读取文章内容失败：${e.message}`, 'error')
      } finally {
        postFormLoading.value = false
      }
    }
    await nextTick()
    await initEditor()
  } finally {
    editorLoading.value = false
  }
}

async function savePost() {
  if (!postForm.title.trim()) { toastMsg('请填写文章标题', 'error'); return }
  if (!editorInstance) { toastMsg('编辑器还在加载中，请稍候', 'error'); return }
  await withBusy('save-post', async () => {
    try {
      const data = { ...postForm, tags: [...postForm.tags], content: editorInstance?.getMarkdown() ?? postForm.content }
      const isEdit = !!editingPost.value?.id
      if (isEdit) await admin.updatePost(editingPost.value.id, data)
      else await admin.createPost(data)
      closePostForm()
      await loadPosts()
      toastMsg(isEdit ? '文章已更新' : '文章已发布')
    } catch (e) { toastMsg(e.message, 'error') }
  })
}

async function togglePin(id) {
  await withBusy(`pin-${id}`, async () => {
    try {
      await admin.togglePin(id)
      await loadPosts()
      toastMsg('置顶状态已更新')
    } catch (e) { toastMsg(e.message, 'error') }
  })
}

async function loadPosts() {
  try { posts.value = await admin.getPosts() } catch (e) { toastMsg(e.message, 'error') }
}

/* ── Moments ── */
const showMomentForm = ref(false)
const editingMoment = ref(null)
const momentForm = reactive({ date: '', time: '', content: '', images: [], tags: [], hidden: false })
const momentTagInput = ref('')
const uploading = ref(false)
const fileInput = ref(null)

function pickFiles() {
  if (!uploading.value) fileInput.value?.click()
}

function firstImage(m) { return momentImages(m)[0] || '' }
function imageCount(m) { return momentImages(m).length }

function addMomentTag() {
  const t = momentTagInput.value.replace(/,/g, '').trim()
  if (t && !momentForm.tags.includes(t)) momentForm.tags.push(t)
  momentTagInput.value = ''
}

function openMomentForm(moment = null) {
  editingMoment.value = moment
  const now = new Date()
  momentForm.date = moment?.date || now.toISOString().slice(0, 10)
  momentForm.time = moment?.time || now.toTimeString().slice(0, 5)
  momentForm.content = moment?.content || ''
  momentForm.images = momentImages(moment)
  momentForm.tags = moment?.tags ? [...moment.tags] : []
  momentForm.hidden = !!moment?.hidden
  showMomentForm.value = true
}

function onFileChange(e) {
  uploadMomentFiles(e.target.files)
  e.target.value = ''
}
function onDrop(e) { uploadMomentFiles(e.dataTransfer?.files) }

async function uploadMomentFiles(files) {
  const list = Array.from(files || []).filter(f => f && f.type.startsWith('image/'))
  if (!list.length) return
  uploading.value = true
  try {
    const urls = await admin.uploadImages(list)
    momentForm.images.push(...urls)
    toastMsg(`已上传 ${urls.length} 张图片`)
  } catch (e) {
    toastMsg(e.message, 'error')
  } finally {
    uploading.value = false
  }
}

function removeImage(i) { momentForm.images.splice(i, 1) }

async function saveMoment() {
  await withBusy('save-moment', async () => {
    try {
      const data = {
        date: momentForm.date,
        time: momentForm.time,
        content: momentForm.content,
        images: [...momentForm.images],
        tags: [...momentForm.tags],
        hidden: !!momentForm.hidden,
      }
      const isEdit = !!editingMoment.value?.id
      if (isEdit) await admin.updateMoment(editingMoment.value.id, data)
      else await admin.createMoment(data)
      showMomentForm.value = false
      await loadMoments()
      toastMsg(isEdit ? '动态已更新' : '动态已创建')
    } catch (e) { toastMsg(e.message, 'error') }
  })
}

/** Flip a single moment between hidden and public. */
async function toggleHidden(m) {
  await withBusy(`hide-${m.id}`, async () => {
    try {
      await admin.setMomentHidden(m.id, !m.hidden)
      await loadMoments()
      toastMsg(m.hidden ? '已设为公开' : '已隐藏（需密码查看）')
    } catch (e) { toastMsg(e.message, 'error') }
  })
}

async function loadMoments() {
  try { moments.value = await admin.getMoments() } catch (e) { toastMsg(e.message, 'error') }
}

/* ── Standalone pages ── */
const showPageForm = ref(false)
const editingPage = ref(null)
const pageForm = reactive({ title: '', slug: '', content: '' })

function openPageForm(page = null) {
  editingPage.value = page
  pageForm.title = page?.title || ''
  pageForm.slug = page?.slug || ''
  pageForm.content = page?.content || ''
  showPageForm.value = true
}

function closePageForm() {
  showPageForm.value = false
  editingPage.value = null
}

async function savePage() {
  if (!pageForm.title.trim()) { toastMsg('请填写页面标题', 'error'); return }
  await withBusy('save-page', async () => {
    try {
      const isEdit = !!editingPage.value?.slug
      if (isEdit) {
        // The slug is disabled while editing — keep the original key stable.
        await admin.updatePage(editingPage.value.slug, {
          title: pageForm.title.trim(),
          content: pageForm.content,
        })
      } else {
        await admin.createPage({
          title: pageForm.title.trim(),
          slug: pageForm.slug.trim(),
          content: pageForm.content,
        })
      }
      closePageForm()
      await loadPages()
      toastMsg(isEdit ? '页面已更新' : '页面已创建')
    } catch (e) { toastMsg(e.message, 'error') }
  })
}

async function loadPages() {
  try { pages.value = await admin.getPages() || [] } catch (e) { toastMsg(e.message, 'error') }
}

/* ── Settings: moments unlock password ── */
const pwdState = reactive({ loading: true, custom: false, minLength: 4 })
const pwdForm = reactive({ value: '', confirm: '' })
const pwdErr = ref('')

async function loadSettings() {
  pwdState.loading = true
  try {
    const s = await admin.getMomentsPassword()
    pwdState.custom = !!s?.custom
    if (s?.minLength) pwdState.minLength = s.minLength
  } catch (e) {
    toastMsg(e.message, 'error')
  } finally {
    pwdState.loading = false
  }
}

async function savePassword() {
  pwdErr.value = ''
  const value = pwdForm.value.trim()
  if (value.length < pwdState.minLength) {
    pwdErr.value = `密码至少 ${pwdState.minLength} 位`
    return
  }
  if (value !== pwdForm.confirm.trim()) {
    pwdErr.value = '两次输入的密码不一致'
    return
  }
  await withBusy('save-pwd', async () => {
    try {
      const s = await admin.setMomentsPassword(value)
      pwdState.custom = !!s?.custom
      pwdForm.value = ''
      pwdForm.confirm = ''
      toastMsg('访问密码已更新')
    } catch (e) {
      pwdErr.value = e.message
    }
  })
}

async function clearPassword() {
  pwdErr.value = ''
  await withBusy('clear-pwd', async () => {
    try {
      const s = await admin.setMomentsPassword('')
      pwdState.custom = !!s?.custom
      pwdForm.value = ''
      pwdForm.confirm = ''
      toastMsg('已恢复使用 ADMIN_TOKEN')
    } catch (e) {
      pwdErr.value = e.message
    }
  })
}

/* ── Cleanup ── */
onBeforeUnmount(() => {
  window.removeEventListener('theme-change', onTheme)
  clearTimeout(toastTimer)
  if (editorInstance) { editorInstance.destroy(); editorInstance = null }
})

watch(nav, (newTab, oldTab) => {
  if (oldTab === 'posts' && showPostForm.value) closePostForm()
  if (oldTab === 'moments' && showMomentForm.value) showMomentForm.value = false
  if (newTab === 'settings') loadSettings()
})

watch(showPostForm, (v) => {
  if (!v && editorInstance) { editorInstance.destroy(); editorInstance = null }
})
</script>

<style scoped>
/* ═══════════════════════════════════════════
   ADMIN
   ═══════════════════════════════════════════ */

/* ── Login ── */
.admin-login {
  position: fixed; inset: 0; z-index: 1000;
  display: flex; align-items: center; justify-content: center;
  background: var(--bg-primary);
  padding: 20px;
}
.login-glow {
  position: absolute; inset: 0;
  background: radial-gradient(ellipse 60% 50% at 50% 40%, var(--accent-dim), transparent 70%);
  opacity: 0.55; pointer-events: none;
}
.login-card {
  position: relative;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg); padding: 48px 44px; text-align: center;
  width: 420px; max-width: 100%;
  box-shadow: var(--shadow-lg);
  z-index: 1;
}
.login-icon {
  width: 52px; height: 52px; margin: 0 auto 16px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 16px;
  background: var(--accent-gradient); color: #fff;
  box-shadow: 0 6px 20px rgba(41, 151, 255, 0.25);
}
.login-card h1 {
  font-family: var(--font-display); font-size: 1.6rem; font-weight: 800;
  color: var(--text-hero);
}
.login-sub { color: var(--text-muted); font-size: 0.86rem; margin: 4px 0 28px; }
.login-checking {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  color: var(--text-muted); font-size: 0.84rem; padding: 8px 0;
}

.login-field {
  display: flex; align-items: center; gap: 10px;
  padding: 11px 14px;
  border: 1px solid var(--border); border-radius: var(--radius-sm);
  background: var(--bg-input); color: var(--text-primary);
  transition: border-color 0.2s, box-shadow 0.2s;
}
.login-field:focus-within {
  border-color: var(--accent); box-shadow: var(--glow-indigo);
}
.login-field .field-icon { color: var(--text-muted); flex-shrink: 0; }
.login-field input {
  flex: 1; background: transparent; border: none; color: inherit;
  font-size: 0.95rem; outline: none;
}
.login-field input::placeholder { color: var(--text-muted); }

.captcha-wrap { margin-top: 18px; text-align: left; }
.captcha-hint {
  display: block; font-size: 0.72rem; color: var(--text-muted);
  margin-bottom: 6px; letter-spacing: 0.3px;
}
.captcha-inner { display: flex; align-items: center; gap: 10px; }
.captcha-box {
  display: flex; align-items: center; justify-content: center;
  padding: 8px 18px; min-width: 92px; height: 42px;
  border-radius: var(--radius-sm);
  background: var(--accent-dim);
  border: 1px solid rgba(41, 151, 255, 0.12);
  position: relative; overflow: hidden;
}
.captcha-text {
  font-family: var(--font-mono); font-size: 1.15rem; font-weight: 700;
  color: var(--accent); letter-spacing: 1px;
}
/* Challenge failed to load (API down) — readable, not accent-coloured. */
.captcha-text--err {
  font-family: var(--font-sans); font-size: 0.78rem; font-weight: 500;
  color: #ff6961; letter-spacing: 0;
}
.captcha-noise {
  position: absolute; inset: 0;
  background:
    repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(41,151,255,0.04) 4px, rgba(41,151,255,0.04) 5px),
    repeating-linear-gradient(-45deg, transparent, transparent 6px, rgba(41,151,255,0.03) 6px, rgba(41,151,255,0.03) 7px);
  pointer-events: none;
}
.captcha-refresh {
  width: 34px; height: 34px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  border: 1px solid var(--border); background: var(--bg-card-hover);
  color: var(--text-secondary); cursor: pointer;
  transition: all 0.2s; flex-shrink: 0;
}
.captcha-refresh:hover { color: var(--accent); border-color: var(--accent); background: var(--accent-dim); }
.captcha-refresh:active { transform: scale(0.92); }
.captcha-input {
  width: 80px; height: 42px; padding: 0 10px;
  border: 1px solid var(--border); border-radius: var(--radius-sm);
  background: var(--bg-input); color: var(--text-primary);
  font-size: 1.05rem; text-align: center;
  transition: border-color 0.2s, box-shadow 0.2s;
  -moz-appearance: textfield;
}
.captcha-input::-webkit-outer-spin-button,
.captcha-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.captcha-input:focus { outline: none; border-color: var(--accent); box-shadow: var(--glow-indigo); }

.login-btn { width: 100%; justify-content: center; margin-top: 22px; height: 44px; }

.err-msg {
  display: flex; align-items: center; gap: 8px;
  margin-top: 14px; padding: 10px 14px;
  border-radius: var(--radius-sm);
  background: rgba(239, 68, 68, 0.08); color: #ef4444;
  font-size: 0.82rem; text-align: left;
}
[data-theme="light"] .err-msg { background: rgba(239, 68, 68, 0.06); }
.err-slide-enter-active, .err-slide-leave-active { transition: all 0.2s var(--ease); }
.err-slide-enter-from, .err-slide-leave-to { opacity: 0; transform: translateY(-4px); }

/* ── Shell ── */
.admin-shell {
  position: fixed; inset: 0; z-index: 999;
  display: flex; background: var(--bg-primary);
}

/* ── Sidebar ── */
.admin-sidebar {
  width: 220px; min-width: 220px;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border);
  display: flex; flex-direction: column;
  padding: 20px 0;
}
.sb-brand { display: flex; align-items: center; gap: 10px; padding: 0 20px 20px; cursor: pointer; }
.sb-logo {
  width: 36px; height: 36px; border-radius: 10px;
  background: var(--accent-gradient);
  color: #fff; display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 1.1rem;
  box-shadow: 0 4px 14px rgba(41, 151, 255, 0.28);
}
.sb-name { font-weight: 600; font-size: 0.95rem; color: var(--text-primary); }
.sb-nav { flex: 1; display: flex; flex-direction: column; gap: 2px; padding: 0 12px; }
.sb-nav button {
  display: flex; align-items: center; gap: 10px; padding: 10px 14px;
  border: none; border-radius: 10px; background: transparent;
  color: var(--text-secondary); font-size: 0.87rem; cursor: pointer;
  transition: all 0.2s; text-align: left;
  font-family: var(--font-sans);
}
.sb-nav button:hover { background: var(--accent-dim); color: var(--text-primary); }
.sb-nav button.active {
  background: var(--accent-gradient);
  color: #fff; font-weight: 600;
  box-shadow: 0 4px 14px rgba(41, 151, 255, 0.28);
}
.sb-footer { padding: 12px; display: flex; flex-direction: column; gap: 4px; }
.sb-site-link, .sb-theme-btn, .sb-logout {
  display: flex; align-items: center; gap: 8px;
  width: 100%; padding: 8px 12px; border-radius: 8px;
  font-size: 0.8rem; text-align: left;
  transition: all 0.2s; font-family: inherit;
}
.sb-site-link { color: var(--text-muted); border: none; background: transparent; }
.sb-site-link:hover { color: var(--accent); background: var(--accent-dim); }
.sb-theme-btn { border: 1px solid var(--border); background: transparent; color: var(--text-secondary); cursor: pointer; }
.sb-theme-btn:hover { border-color: var(--accent); color: var(--accent); }
.sb-logout { border: none; background: transparent; color: var(--text-muted); cursor: pointer; }
.sb-logout:hover { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

/* ── Content ── */
.content {
  flex: 1; min-width: 0; padding: 32px 36px;
  overflow-y: auto; overflow-x: hidden;
  max-height: 100vh;
}
.page-heading {
  font-family: var(--font-display);
  font-size: 1.5rem; font-weight: 700; color: var(--text-hero); margin-bottom: 24px;
}
.page-heading-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
.page-heading-row .page-heading { margin-bottom: 0; }
.heading-actions { display: flex; gap: 8px; flex-wrap: wrap; }
/* ── View transitions ── */
.tab-enter-active { transition: opacity 0.24s ease, transform 0.24s cubic-bezier(0.22, 1, 0.36, 1); }
.tab-leave-active { transition: opacity 0.14s ease, transform 0.14s ease; }
.tab-enter-from { opacity: 0; transform: translateY(10px); }
.tab-leave-to { opacity: 0; transform: translateY(-6px); }

/* ── Batch selection ──
   One always-visible bar above the list carries 全选 plus the batch actions, so
   the same control works on desktop and on mobile (where the table header is
   hidden entirely). */
.bulk-bar {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  padding: 9px 16px; margin-bottom: 10px;
  border: 1px solid var(--border); border-radius: var(--radius);
  background: var(--bg-card);
}
.bulk-all {
  display: flex; align-items: center; gap: 8px;
  font-size: 0.82rem; color: var(--text-secondary);
  cursor: pointer; user-select: none;
}
.bulk-actions { display: flex; align-items: center; gap: 6px; margin-left: auto; flex-wrap: wrap; }
.bulk-count { font-size: 0.78rem; font-weight: 600; color: var(--accent-ink); margin-right: 2px; }
.bulk-enter-active, .bulk-leave-active { transition: opacity 0.18s var(--ease), transform 0.18s var(--ease); }
.bulk-enter-from, .bulk-leave-to { opacity: 0; transform: translateY(-4px); }

.row-check { display: flex; align-items: center; flex-shrink: 0; }

/* Fully custom checkbox — the native 15px accent-color square looked cheap on
   both themes, especially dark where the tiny colored block was invisible against
   dark card surfaces. */
.bulk-bar input[type="checkbox"],
.row-check input[type="checkbox"] {
  -webkit-appearance: none; appearance: none;
  width: 18px; height: 18px; margin: 0; flex-shrink: 0;
  border: 1.5px solid var(--border-hover); border-radius: 5px;
  background: var(--bg-input); cursor: pointer;
  position: relative; transition: all 0.18s var(--ease);
}
.bulk-bar input[type="checkbox"]:hover,
.row-check input[type="checkbox"]:hover { border-color: var(--accent); }
.bulk-bar input[type="checkbox"]:active,
.row-check input[type="checkbox"]:active { transform: scale(0.92); }
.bulk-bar input[type="checkbox"]:checked,
.row-check input[type="checkbox"]:checked {
  background: var(--accent); border-color: var(--accent);
}
.bulk-bar input[type="checkbox"]:checked::after,
.row-check input[type="checkbox"]:checked::after {
  content: '';
  position: absolute; left: 50%; top: 46%;
  width: 4.5px; height: 8.5px;
  border: solid #fff; border-width: 0 2px 2px 0;
  transform: translate(-50%, -50%) rotate(45deg);
}
.bulk-bar input[type="checkbox"]:indeterminate,
.row-check input[type="checkbox"]:indeterminate {
  background: var(--accent); border-color: var(--accent);
}
.bulk-bar input[type="checkbox"]:indeterminate::after,
.row-check input[type="checkbox"]:indeterminate::after {
  content: '';
  position: absolute; left: 50%; top: 50%;
  width: 10px; height: 2px; border-radius: 1px;
  background: #fff;
  transform: translate(-50%, -50%);
}
.bulk-bar input[type="checkbox"]:focus-visible,
.row-check input[type="checkbox"]:focus-visible {
  outline: none; box-shadow: var(--glow-indigo);
}

.mui-tr.is-selected, .moment-item.is-selected {
  background: var(--accent-dim); border-color: var(--accent);
}

.dialog-enter-active, .dialog-leave-active { transition: opacity 0.22s ease; }
.dialog-enter-from, .dialog-leave-to { opacity: 0; }
.dialog-enter-active .mui-dialog,
.dialog-leave-active .mui-dialog {
  transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.22s ease;
}
.dialog-enter-from .mui-dialog,
.dialog-leave-to .mui-dialog { transform: translateY(14px) scale(0.97); opacity: 0; }

.sk-list { display: flex; flex-direction: column; gap: 10px; }

.dialog-loading {
  display: flex; align-items: center; justify-content: center; gap: 9px;
  padding: 60px 0; color: var(--text-muted); font-size: 0.84rem;
}

/* ── Settings panel ── */
.settings-card {
  border: 1px solid var(--border); border-radius: var(--radius);
  background: var(--bg-card); padding: 22px 24px;
  max-width: 720px;
}
.settings-card-head {
  display: flex; align-items: flex-start; gap: 12px;
  padding-bottom: 16px; border-bottom: 1px solid var(--border);
}
.settings-icon {
  flex: none; width: 36px; height: 36px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  background: var(--accent-dim); color: var(--accent);
}
.settings-card-title { flex: 1; min-width: 0; }
.settings-card-title h3 {
  margin: 0; font-size: 0.98rem; font-weight: 600; color: var(--text-hero);
}
.settings-desc { margin: 3px 0 0; font-size: 0.78rem; color: var(--text-muted); }
.settings-badge {
  flex: none; display: inline-flex; align-items: center; gap: 5px;
  padding: 4px 10px; border-radius: 999px;
  font-size: 0.68rem; font-weight: 600; white-space: nowrap;
  color: var(--text-muted); background: var(--bg-secondary);
  border: 1px solid var(--border);
}
.settings-badge.custom {
  color: var(--accent-ink); background: var(--accent-dim);
  border-color: rgba(41, 151, 255, 0.28);
}
.settings-skeleton { padding-top: 18px; }
.settings-body { padding-top: 18px; }
.settings-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 14px;
}
.settings-field { display: flex; flex-direction: column; gap: 6px; }
.settings-field label {
  font-size: 0.76rem; font-weight: 500; color: var(--text-secondary);
}
.settings-field .mui-input { width: 100%; }
.settings-err {
  display: flex; align-items: center; gap: 6px;
  margin: 12px 0 0; font-size: 0.78rem; color: #ef4444;
}
.settings-actions { display: flex; gap: 10px; margin-top: 18px; }
.settings-hint {
  display: flex; align-items: flex-start; gap: 7px;
  margin: 16px 0 0; padding: 11px 13px;
  border-radius: var(--radius-sm);
  background: var(--bg-secondary);
  font-size: 0.74rem; line-height: 1.6; color: var(--text-muted);
}
.settings-hint .icon { flex: none; margin-top: 2px; color: var(--accent-ink); }

/* ── Stat Cards ── */
.stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 36px; }
.stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius); padding: 22px;
  box-shadow: var(--shadow-sm);
  transition: all 0.3s;
}
.stat-card:hover { border-color: var(--border-hover); transform: translateY(-2px); }
.stat-icon {
  width: 44px; height: 44px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 14px;
  color: var(--accent); background: var(--accent-dim);
}
.stat-card:nth-child(2) .stat-icon { color: #f97316; background: rgba(249, 115, 22, 0.12); }
.stat-card:nth-child(3) .stat-icon { color: #10b981; background: rgba(16, 185, 129, 0.12); }
.stat-card:nth-child(4) .stat-icon { color: #8b5cf6; background: rgba(139, 92, 246, 0.12); }
.stat-num { font-family: var(--font-display); font-size: 2rem; font-weight: 700; color: var(--text-hero); }
/* Placeholder shown until the first load resolves — sized to the line box of
   .stat-num so the card does not jump when the real number arrives. */
.stat-sk {
  display: inline-block; width: 2.4rem; height: 1.5rem; border-radius: 6px;
  vertical-align: middle; background: var(--sk-base);
  animation: statPulse 1.4s ease-in-out infinite;
}
@keyframes statPulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.45 } }
.stat-label { font-size: 0.78rem; color: var(--text-muted); margin-top: 2px; }
.recent-section { margin-top: 8px; }
.recent-section h3 { font-size: 1rem; font-weight: 600; margin-bottom: 12px; color: var(--text-primary); }
.table-empty { color: var(--text-muted); font-size: 0.84rem; padding: 16px 0; }

/* ── Table ── */
.mui-table { display: flex; flex-direction: column; }
.mui-tr {
  display: grid; grid-template-columns: auto 2fr 1fr 2fr 220px; gap: 12px; align-items: center;
  padding: 12px 16px; border-bottom: 1px solid var(--border);
  font-size: 0.87rem; transition: background 0.2s;
}
.mui-tr.recent-row { grid-template-columns: 1fr auto; }
/* Recent-posts loading state — the first column absorbs the free space, the
   date column is pinned to a fixed width so the row reads as a table line. */
.mui-tr.recent-row.sk-loading .sk-line { margin-bottom: 0; }
.mui-tr.recent-row.sk-loading .sk-line:first-child { width: 100%; }
.mui-tr.recent-row.sk-loading .sk-line:last-child { width: 5rem; }
.mui-tr:hover { background: var(--bg-card-hover); }
.mui-tr.header {
  font-size: 0.72rem; color: var(--text-muted);
  text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;
}
.mui-tr .title {
  display: inline-flex; align-items: center; gap: 6px;
  font-weight: 600; color: var(--text-primary); min-width: 0;
}
.pin-mark { color: var(--accent); }
.mui-tr .date { color: var(--text-muted); font-size: 0.8rem; }
/* Pages table: leading icon cell + monospace slug so the URL reads as an URL. */
.mui-tr .page-icon { color: var(--text-muted); display: inline-flex; }
.mui-tr .slug { font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-secondary); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mui-tr .summary { color: var(--text-secondary); font-size: 0.82rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mui-tr .actions { display: flex; gap: 4px; justify-content: flex-end; flex-wrap: wrap; }

/* ── Buttons ── */
.mui-btn {
  display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px;
  border: none; border-radius: var(--radius-sm); font-size: 0.84rem; font-weight: 500;
  cursor: pointer; transition: all 0.2s; font-family: inherit;
}
.mui-btn.raised { box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
.mui-btn.raised:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.2); transform: translateY(-1px); }
.mui-btn.primary { background: var(--accent-gradient); color: #fff; }
.mui-btn.primary:hover { box-shadow: 0 0 22px rgba(41, 151, 255, 0.35); }
.mui-btn.danger { background: #ef4444; color: #fff; }
.mui-btn.outlined { background: transparent; border: 1px solid var(--border); color: var(--text-primary); }
.mui-btn.outlined:hover { border-color: var(--accent); background: var(--accent-dim); }
.mui-btn.text { background: transparent; color: var(--accent-light); padding: 6px 10px; font-size: 0.8rem; }
.mui-btn.text:hover { background: var(--accent-dim); }
.mui-btn.text.is-pinned { color: var(--accent); font-weight: 600; }
.mui-btn.text.danger { color: #ef4444; }
.mui-btn.text.danger:hover { background: rgba(239, 68, 68, 0.08); }
.mui-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

/* ── Dialog ── */
.mui-overlay {
  position: fixed; top: 0; left: 220px; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: 3000;
  display: flex; align-items: center; justify-content: center;
  padding: 16px;
}
.mui-dialog {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  width: 500px; max-width: 100%;
  max-height: 85vh; display: flex; flex-direction: column;
}
.mui-dialog.wide { width: 900px; }
.mui-dialog.small { width: 400px; }
.mui-dialog-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 20px 24px 0;
}
.mui-dialog-header h3 {
  font-family: var(--font-display);
  font-size: 1.15rem; font-weight: 700; color: var(--text-hero);
}
.mui-dialog-body { padding: 20px 24px; overflow-y: auto; flex: 1; color: var(--text-primary); }
.mui-dialog-footer {
  display: flex; justify-content: flex-end; gap: 8px;
  padding: 16px 24px; border-top: 1px solid var(--border);
}
.mui-close {
  width: 32px; height: 32px; border-radius: 50%; border: 1px solid var(--border);
  background: transparent; cursor: pointer; color: var(--text-muted);
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
}
.mui-close:hover { background: var(--accent-dim); color: var(--text-primary); border-color: var(--accent); }

/* ── Form ── */
.form-row { display: flex; gap: 10px; }
.form-label { display: block; font-size: 0.78rem; color: var(--text-muted); margin: 14px 0 6px; font-weight: 500; }
.form-label .hint { font-weight: 400; opacity: 0.7; }
.mui-input {
  width: 100%; padding: 10px 14px;
  border: 1px solid var(--border); border-radius: var(--radius-sm);
  background: var(--bg-input); color: var(--text-primary);
  font-size: 0.9rem; font-family: inherit; margin-bottom: 10px;
  transition: all 0.2s;
}
.mui-input:focus { outline: none; border-color: var(--accent); box-shadow: var(--glow-indigo); }
.mui-input.short { width: auto; flex: 1; }
.form-hint { font-size: 0.76rem; color: var(--text-muted); margin: -4px 0 10px; }
/* Standalone-page content editor: plain textarea, tall and monospaced so the
   Markdown source keeps its readable shape. The rich Toast UI editor is post-only. */
.mui-input.page-editor {
  min-height: 320px; resize: vertical; line-height: 1.65;
  font-family: var(--font-mono); font-size: 0.84rem;
  white-space: pre-wrap; overflow-wrap: break-word;
}

/* ── Editor ── */
.editor-wrap {
  border: 1px solid var(--border); border-radius: var(--radius-sm);
  overflow: hidden; margin-top: 6px;
}
.editor-wrap:focus-within { border-color: var(--accent); box-shadow: var(--glow-indigo); }

/* ── Moments list ── */
.moment-grid { display: flex; flex-direction: column; gap: 8px; }
.moment-item {
  display: flex; align-items: center; gap: 14px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius); padding: 14px 18px;
  transition: all 0.3s;
}
.moment-item:hover { border-color: var(--border-hover); }
/* Hidden moments stay visible in the admin list, but read as "not public". */
.moment-item.is-hidden { border-style: dashed; opacity: 0.78; }
.moment-item.is-hidden:hover, .moment-item.is-hidden.is-selected { opacity: 1; }
.moment-thumbs { position: relative; flex-shrink: 0; }
.moment-pic {
  width: 60px; height: 60px; border-radius: var(--radius-sm); object-fit: cover;
  display: flex; align-items: center; justify-content: center;
  background: var(--bg-secondary); flex-shrink: 0;
}
.moment-pic.placeholder { color: var(--text-muted); }
.thumb-count {
  position: absolute; right: -6px; bottom: -6px;
  min-width: 20px; height: 20px; padding: 0 5px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 999px; background: var(--accent); color: #fff;
  font-size: 0.66rem; font-weight: 600;
  border: 2px solid var(--bg-card);
}
.moment-body { flex: 1; min-width: 0; }
.moment-meta { font-size: 0.72rem; color: var(--text-muted); font-family: var(--font-mono); }
.moment-body p {
  font-size: 0.87rem; color: var(--text-primary); margin-top: 3px;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.moment-actions { display: flex; gap: 4px; flex-shrink: 0; }

/* ── Upload ── */
.upload-area {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  border: 2px dashed var(--border); border-radius: var(--radius);
  padding: 20px; text-align: center; color: var(--text-muted);
  font-size: 0.84rem; cursor: pointer;
  transition: all 0.2s;
}
.upload-area:hover { border-color: var(--accent); background: var(--accent-dim); color: var(--accent); }
.upload-area.busy { cursor: progress; opacity: 0.75; }
.upload-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
  gap: 8px; margin-top: 10px;
}
.upload-thumb { position: relative; aspect-ratio: 1 / 1; border-radius: var(--radius-sm); overflow: hidden; border: 1px solid var(--border); }
.upload-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.thumb-remove {
  position: absolute; top: 4px; right: 4px;
  width: 22px; height: 22px; border-radius: 50%; border: none;
  background: rgba(0, 0, 0, 0.6); color: #fff; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.2s;
}
.thumb-remove:hover { background: #ef4444; }

/* ── Tags ── */
.tag-input-inline { margin-bottom: 4px; }
.tag-input-inline .tag-pill { cursor: pointer; }
.tag-pill.removable {
  display: inline-flex; align-items: center; gap: 4px;
  border: none; font-family: inherit;
  background: var(--accent-dim); color: var(--accent);
  font-size: 0.7rem; padding: 4px 9px; border-radius: 999px;
  transition: all 0.15s;
}
.tag-pill.removable:hover { background: #ef4444; color: #fff; }

/* ── Toast ── */
.toast {
  position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%); z-index: 4000;
  padding: 12px 24px; border-radius: 12px; font-size: 0.85rem; font-weight: 500;
  box-shadow: var(--shadow-lg); color: #fff;
  max-width: calc(100vw - 32px);
}
.toast.success { background: var(--accent-gradient); }
.toast.error { background: #ef4444; }
.toast-enter-active { animation: slideUp 0.3s ease; }
.toast-leave-active { animation: slideUp 0.2s ease reverse; }
@keyframes slideUp { from { opacity: 0; transform: translateX(-50%) translateY(12px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }

/* ── Responsive ── */
@media (max-width: 768px) {
  .admin-shell { flex-direction: column; }
  .admin-sidebar {
    width: 100%; min-width: 100%; height: 56px;
    flex-direction: row; align-items: center;
    padding: 0 10px; flex-shrink: 0;
    border-right: none; border-bottom: 1px solid var(--border);
  }
  .sb-brand { padding: 0 8px 0 0; flex-shrink: 0; gap: 8px; }
  .sb-logo { width: 30px; height: 30px; font-size: 0.9rem; }
  .sb-name { display: none; }
  /* Five sections now share the top bar — let it scroll instead of squashing
     the labels. */
  .sb-nav { flex-direction: row; flex: 1; gap: 2px; padding: 0; justify-content: flex-start; overflow-x: auto; scrollbar-width: none; -ms-overflow-style: none; }
  .sb-nav::-webkit-scrollbar { display: none; }
  .sb-nav button { padding: 8px 10px; font-size: 0.75rem; gap: 6px; flex-shrink: 0; }
  .sb-footer { flex-direction: row; padding: 0; gap: 4px; flex-shrink: 0; align-items: center; }
  .sb-site-link, .sb-logout { width: 34px; height: 34px; padding: 0; justify-content: center; border-radius: 50%; }
  .sb-site-link .sb-label, .sb-logout .sb-label, .sb-theme-btn .sb-label { display: none; }
  .sb-theme-btn { width: 34px; height: 34px; padding: 0; justify-content: center; border-radius: 50%; }

  .content { padding: 18px 14px 40px; max-height: calc(100vh - 56px); }

  .settings-card { padding: 18px 16px; }
  .settings-card-head { flex-wrap: wrap; }
  .settings-badge { order: 3; flex-basis: 100%; justify-content: center; margin-top: 4px; }
  .settings-grid { grid-template-columns: 1fr; }
  .settings-actions { flex-wrap: wrap; }

  .stat-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 26px; }
  .stat-card { padding: 14px; }
  .stat-icon { width: 36px; height: 36px; border-radius: 10px; margin-bottom: 10px; }
  .stat-num { font-size: 1.5rem; }

  /* Table rows become stacked cards */
  .mui-table { gap: 8px; }
  .mui-tr,
  .mui-tr.recent-row {
    display: flex; flex-direction: column; align-items: stretch; gap: 6px;
    border: 1px solid var(--border); border-radius: var(--radius);
    padding: 14px 16px; background: var(--bg-card);
  }
  .mui-tr.header { display: none; }
  .mui-tr:hover { background: var(--bg-card-hover); }
  .mui-tr .summary { white-space: normal; }
  .mui-tr .actions { justify-content: flex-start; gap: 2px; }

  .mui-overlay { left: 0; top: 56px; padding: 12px; }
  .mui-dialog.wide, .mui-dialog.small { width: 100%; }
  .mui-dialog { max-height: calc(100vh - 88px); }
  .mui-dialog-body { padding: 16px; }

  .moment-item { flex-wrap: wrap; padding: 12px 14px; gap: 10px; }
  .moment-body { flex: 1 1 100%; order: 3; }
  .moment-actions { margin-left: auto; }

  /* Batch bar: the action row wraps onto its own line so the buttons stay tappable. */
  .bulk-bar { padding: 8px 12px; gap: 8px; }
  .bulk-actions { margin-left: 0; width: 100%; gap: 4px; }
  .bulk-count { flex-basis: 100%; }

  /* Login mobile */
  .login-card { padding: 36px 24px; }
  .login-card h1 { font-size: 1.4rem; }
  .captcha-inner { gap: 8px; flex-wrap: wrap; }
  .captcha-box { min-width: 84px; height: 40px; padding: 6px 14px; }
  .captcha-text { font-size: 1.05rem; }
  .captcha-input { height: 40px; width: 72px; }
}

/* ── Media library ── */
.media-hint { font-size: 0.8rem; color: var(--text-muted); margin: -6px 0 18px; line-height: 1.6; }
.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}
.media-card {
  display: flex; flex-direction: column;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  overflow: hidden;
  transition: border-color 0.2s;
}
.media-card:hover { border-color: var(--border-hover); }
.media-thumb {
  display: block; aspect-ratio: 4 / 3;
  background: var(--bg-secondary);
  overflow: hidden;
}
.media-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.media-body {
  flex: 1;
  display: flex; flex-direction: column; gap: 6px;
  padding: 12px 14px 10px;
}
.media-name {
  margin: 0; font-size: 0.78rem; color: var(--text-primary);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.media-meta { margin: 0; font-size: 0.7rem; font-family: var(--font-mono); color: var(--text-muted); }
.media-usage { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 10px; margin-top: 2px; }
.media-usage-label { font-size: 0.66rem; font-weight: 600; color: var(--accent-ink); }
.media-usage-item {
  display: inline-flex; align-items: center; gap: 4px;
  max-width: 100%; font-size: 0.68rem; color: var(--text-secondary);
  text-decoration: none;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.media-usage-item:hover { color: var(--accent-ink); }
.media-unused { margin: 2px 0 0; font-size: 0.68rem; color: var(--text-muted); }
.media-del { align-self: flex-start; margin: 0 14px 12px; }
.media-sk { height: 210px; padding: 0; }
@media (max-width: 768px) {
  .media-grid { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
}
</style>
