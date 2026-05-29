<template>
  <div class="group overflow-hidden rounded-2xl border border-gray-800/40 bg-gray-900/30 hover:border-violet-500/30 hover:bg-gray-900/60 hover:shadow-lg hover:shadow-violet-500/5 transition">
    <!-- Cover Image -->
    <div class="relative aspect-[16/9] overflow-hidden">
      <img
        :src="game.cover"
        :alt="game.title"
        class="h-full w-full object-cover duration-300 group-hover:scale-105"
        loading="lazy"
        @error="handleImgError"
      />
      <!-- Account available badge -->
      <div v-if="game.accounts && game.accounts.length" class="absolute right-2 top-2 flex items-center gap-1 rounded-lg bg-violet-600/80 px-2 py-1 text-[10px] font-bold backdrop-blur-sm">
        <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
        {{ game.accounts.length }} 个账号
      </div>
    </div>

    <!-- Info -->
    <div class="p-4">
      <div class="flex items-start justify-between gap-2">
        <h3 class="truncate text-sm font-bold text-gray-100 group-hover:text-violet-300">
          {{ game.title }}
        </h3>
        <a
          v-if="game.storeUrl"
          :href="game.storeUrl"
          target="_blank"
          rel="noopener noreferrer"
          @click.stop
          class="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg bg-gray-800/60 text-gray-500 hover:bg-violet-600/20 hover:text-violet-400 transition"
          title="前往商店页面"
        >
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
        </a>
      </div>
      <p class="mt-1 line-clamp-1 text-xs text-gray-500">
        {{ game.description }}
      </p>
      <div class="mt-3 flex flex-wrap gap-1.5">
        <span
          v-for="tag in game.tags"
          :key="tag"
          class="rounded-md bg-gray-800/60 px-2 py-0.5 text-[10px] font-medium text-gray-400"
        >
          {{ tag }}
        </span>
      </div>

      <!-- Account section -->
      <div v-if="game.accounts && game.accounts.length" class="mt-3 border-t border-gray-800/50 pt-3">
        <!-- Has access -->
        <template v-if="canView">
          <div class="flex items-center justify-between mb-2">
            <span class="text-[10px] font-semibold uppercase tracking-wider text-gray-500">账号信息</span>
            <button
              @click.stop="toggleAccounts"
              class="text-[10px] font-medium text-violet-400 hover:text-violet-300 transition"
            >
              {{ showAccounts ? '隐藏' : '查看' }}
            </button>
          </div>
          <div v-if="showAccounts" class="space-y-2">
            <div
              v-for="(acc, idx) in game.accounts"
              :key="idx"
              class="rounded-lg bg-gray-800/40 px-3 py-2"
            >
              <div class="flex items-center gap-2 text-xs">
                <span class="text-gray-500">账号：</span>
                <span class="font-mono text-gray-300">{{ acc.username }}</span>
                <button
                  @click.stop="copyText(acc.username)"
                  class="text-gray-600 hover:text-violet-400 transition"
                  title="复制账号"
                >
                  <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                </button>
              </div>
              <div class="flex items-center gap-2 text-xs mt-1">
                <span class="text-gray-500">密码：</span>
                <span class="font-mono text-gray-300">{{ showPasswords[idx] ? acc.password : '••••••••' }}</span>
                <button
                  @click.stop="togglePassword(idx)"
                  class="text-gray-600 hover:text-violet-400 transition"
                  :title="showPasswords[idx] ? '隐藏密码' : '显示密码'"
                >
                  <svg v-if="!showPasswords[idx]" class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                  <svg v-else class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                </button>
                <button
                  @click.stop="copyText(acc.password)"
                  class="text-gray-600 hover:text-violet-400 transition"
                  title="复制密码"
                >
                  <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                </button>
              </div>
            </div>
          </div>
        </template>
        <!-- No access -->
        <template v-else>
          <div class="flex items-center justify-between">
            <span class="text-[10px] text-gray-500">
              <svg class="inline h-3 w-3 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
              会员可查看账号
            </span>
            <router-link to="/membership" class="text-[10px] font-medium text-violet-400 hover:text-violet-300 transition" @click.stop>
              升级会员 &rarr;
            </router-link>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { currentUser, canViewAccount, markAccountViewed, getTier, viewedCount } from '../config/membership.js'

const props = defineProps({
  game: { type: Object, required: true }
})

const showAccounts = ref(false)
const showPasswords = reactive({})

const canView = computed(() => canViewAccount(props.game.id))

function toggleAccounts() {
  showAccounts.value = !showAccounts.value
  if (showAccounts.value) {
    markAccountViewed(props.game.id)
  }
}

function togglePassword(idx) {
  showPasswords[idx] = !showPasswords[idx]
}

function copyText(text) {
  navigator.clipboard.writeText(text).catch(() => {})
}

function handleImgError(e) {
  e.target.src = 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="460" height="215" fill="%231e1b2e"><rect width="460" height="215"/><text x="50%" y="50%" fill="%236b7280" font-size="24" text-anchor="middle" dy=".3em">🎮</text></svg>'
  )
}
</script>
