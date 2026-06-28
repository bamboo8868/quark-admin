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
      <div v-if="accountCount > 0" class="absolute right-2 top-2 flex items-center gap-1 rounded-lg bg-violet-600/80 px-2 py-1 text-[10px] font-bold backdrop-blur-sm text-white">
        <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
        {{ accountCount }} 个账号
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

      <!-- Account section (only show when accounts exist) -->
      <div v-if="accountCount > 0" class="mt-3 border-t border-gray-800/50 pt-3">
        <!-- Has member access -->
        <template v-if="canView">
          <div class="flex items-center justify-between mb-2">
            <span class="text-[10px] font-semibold uppercase tracking-wider text-gray-500">账号信息</span>
            <button
              @click.stop="openAccountModal"
              class="text-[10px] font-medium text-violet-400 hover:text-violet-300 transition"
            >
              查看
            </button>
          </div>
        </template>
        <!-- No access - guest/non-member -->
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

    <!-- Account Modal -->
    <Teleport to="body">
      <div
        v-if="showAccountModal"
        class="fixed inset-0 z-[60] flex items-center justify-center p-4"
        @click.self="closeAccountModal"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" @click="closeAccountModal"></div>
        
        <!-- Modal Content -->
        <div class="relative w-full max-w-lg rounded-2xl border border-gray-800/40 bg-gray-900 shadow-2xl">
          <!-- Header -->
          <div class="flex items-center justify-between border-b border-gray-800/40 px-6 py-4">
            <div class="flex items-center gap-3">
              <img v-if="game.cover" :src="game.cover" :alt="game.title" class="h-10 w-14 rounded-lg object-cover" @error="(e) => e.target.style.display='none'" />
              <div>
                <h3 class="text-lg font-bold text-white">{{ game.title }}</h3>
                <p class="text-xs text-gray-500">可用账号 {{ gameAccounts.length }} 个</p>
              </div>
            </div>
            <button @click="closeAccountModal" class="rounded-lg p-2 text-gray-500 hover:bg-gray-800 hover:text-gray-300 transition">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <!-- Body -->
          <div class="max-h-[400px] overflow-y-auto p-6">
            <!-- Loading -->
            <div v-if="loadingAccounts" class="flex items-center justify-center py-10">
              <svg class="h-6 w-6 animate-spin text-violet-400" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
            </div>

            <!-- Empty -->
            <div v-else-if="gameAccounts.length === 0" class="py-10 text-center">
              <p class="text-gray-500 text-sm">暂无可用账号</p>
            </div>

            <!-- Account List -->
            <div v-else class="space-y-3">
              <div
                v-for="(account, index) in gameAccounts"
                :key="account.id"
                class="flex items-center justify-between rounded-xl border border-gray-800/40 bg-gray-800/20 px-4 py-3 hover:border-violet-500/30 transition"
              >
                <div class="flex items-center gap-3">
                  <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600/20 text-xs font-bold text-violet-400">{{ index + 1 }}</span>
                  <div>
                    <p class="font-mono text-sm text-gray-200">{{ account.account }}</p>
                    <p class="text-xs text-gray-500">{{ account.platform || 'Steam' }}</p>
                  </div>
                </div>
                <button
                  @click.stop="copyText(account.account)"
                  class="rounded-lg bg-gray-700/50 p-2 text-gray-400 hover:bg-violet-600/20 hover:text-violet-400 transition"
                  title="复制账号"
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                </button>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="border-t border-gray-800/40 px-6 py-4">
            <p class="text-xs text-gray-500 text-center">输入 CDK 码即可兑换账号，立即体验游戏！</p>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { canViewAccount, markAccountViewed } from '../config/membership.js'
import { fetchGameAccounts } from '../api/index.js'

const props = defineProps({
  game: { type: Object, required: true },
  accountCount: { type: Number, default: 0 }
})

const canView = computed(() => canViewAccount(props.game.id))

// Account modal state
const showAccountModal = ref(false)
const gameAccounts = ref([])
const loadingAccounts = ref(false)

async function openAccountModal() {
  showAccountModal.value = true
  loadingAccounts.value = true
  gameAccounts.value = []
  markAccountViewed(props.game.id)
  try {
    gameAccounts.value = await fetchGameAccounts(props.game.id)
  } catch (e) {
    console.error('Failed to load game accounts:', e)
  } finally {
    loadingAccounts.value = false
  }
}

function closeAccountModal() {
  showAccountModal.value = false
  gameAccounts.value = []
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
