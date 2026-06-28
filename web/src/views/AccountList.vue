<template>
  <div class="min-h-screen bg-gray-950">
    <!-- Top Navigation Bar -->
    <header class="sticky top-0 z-50 border-b border-gray-800/50 bg-gray-950/80 backdrop-blur-xl">
      <div class="mx-auto flex h-14 md:h-16 max-w-[1920px] items-center justify-between px-4 md:px-6">
        <div class="flex items-center gap-3">
          <router-link to="/" class="flex items-center gap-2 md:gap-3">
            <div class="flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-base md:text-lg font-bold shadow-lg shadow-violet-600/20">
              {{ siteConfig.siteLogo }}
            </div>
            <h1 class="text-lg md:text-xl font-bold tracking-tight">
              <span class="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">{{ siteConfig.siteNameHighlight }}</span>
              <span class="text-gray-300">{{ siteConfig.siteNameNormal }}</span>
            </h1>
          </router-link>
          <span class="text-gray-600">|</span>
          <span class="text-sm font-semibold text-violet-400">游戏账号导航</span>
        </div>
        <div class="flex items-center gap-2 md:gap-3">
          <router-link to="/" class="text-sm text-gray-400 hover:text-violet-400 transition">首页</router-link>
          <router-link to="/rent" class="text-sm text-gray-400 hover:text-violet-400 transition">兑换会员</router-link>
        </div>
      </div>
    </header>

    <div class="mx-auto max-w-[1400px] px-4 md:px-6 py-6 md:py-8">
      <!-- Header -->
      <div class="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 class="text-xl md:text-2xl font-bold text-white">游戏账号列表</h2>
          <p class="mt-1 text-sm text-gray-500">共 {{ total }} 个可用账号</p>
        </div>
        <!-- Search -->
        <div class="relative w-full md:w-80">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索游戏名称或账号..."
            class="w-full rounded-xl border border-gray-700/50 bg-gray-900/50 px-4 py-2.5 pl-10 text-sm text-gray-200 placeholder-gray-500 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20"
            @keyup.enter="handleSearch"
          />
          <svg class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <button
            v-if="searchQuery"
            @click="clearSearch"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex items-center justify-center py-20">
        <svg class="h-8 w-8 animate-spin text-violet-400" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
        </svg>
      </div>

      <!-- Table -->
      <div v-else class="overflow-hidden rounded-xl border border-gray-800/40 bg-gray-900/30">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-900/60 border-b border-gray-800/40">
              <tr class="text-left text-xs text-gray-500 uppercase tracking-wider">
                <th class="px-4 md:px-6 py-4 font-medium w-16">#</th>
                <th class="px-4 md:px-6 py-4 font-medium">游戏名称</th>
                <th class="px-4 md:px-6 py-4 font-medium">游戏账号</th>
                <th class="px-4 md:px-6 py-4 font-medium">游戏密码</th>
                <th class="px-4 md:px-6 py-4 font-medium w-24">操作</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-800/40">
              <tr
                v-for="(item, index) in accounts"
                :key="item.id"
                class="hover:bg-gray-900/50 transition"
              >
                <td class="px-4 md:px-6 py-3 text-gray-500 text-xs">
                  {{ (currentPage - 1) * 50 + index + 1 }}
                </td>
                <td class="px-4 md:px-6 py-3">
                  <div class="flex items-center gap-3">
                    <img
                      v-if="item.game_cover"
                      :src="item.game_cover"
                      :alt="item.game_name"
                      class="h-8 w-12 rounded object-cover hidden sm:block"
                      @error="(e) => e.target.style.display='none'"
                    />
                    <span class="font-medium text-gray-200">{{ item.game_name }}</span>
                  </div>
                </td>
                <td class="px-4 md:px-6 py-3">
                  <span class="font-mono text-gray-300">{{ item.account }}</span>
                </td>
                <td class="px-4 md:px-6 py-3">
                  <div class="flex items-center gap-2">
                    <span class="font-mono text-gray-300">
                      {{ showPasswords[item.id] ? item.password : '••••••••' }}
                    </span>
                    <button
                      @click="togglePassword(item.id)"
                      class="text-gray-500 hover:text-violet-400 transition"
                      :title="showPasswords[item.id] ? '隐藏密码' : '显示密码'"
                    >
                      <svg v-if="!showPasswords[item.id]" class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                      </svg>
                      <svg v-else class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                      </svg>
                    </button>
                  </div>
                </td>
                <td class="px-4 md:px-6 py-3">
                  <div class="flex items-center gap-2">
                    <button
                      @click="copyAccount(item)"
                      class="text-gray-500 hover:text-violet-400 transition"
                      title="复制账号密码"
                    >
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Empty State -->
        <div v-if="accounts.length === 0" class="py-16 text-center">
          <div class="text-5xl mb-4">🎮</div>
          <p class="text-gray-500">暂无可用账号</p>
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="flex items-center justify-between border-t border-gray-800/40 px-4 md:px-6 py-4">
          <p class="text-sm text-gray-500">
            第 {{ currentPage }} / {{ totalPages }} 页
          </p>
          <div class="flex items-center gap-2">
            <button
              @click="goToPage(currentPage - 1)"
              :disabled="currentPage <= 1"
              class="rounded-lg border border-gray-700/50 px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              上一页
            </button>
            <button
              @click="goToPage(currentPage + 1)"
              :disabled="currentPage >= totalPages"
              class="rounded-lg border border-gray-700/50 px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              下一页
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <div
      v-if="toastMsg"
      class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-violet-600/90 px-5 py-2.5 text-sm text-white shadow-xl backdrop-blur-sm animate-bounce-in"
    >
      {{ toastMsg }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import siteConfig from '../config/site.js'
import { fetchAccountList } from '../api/index.js'

const accounts = ref([])
const loading = ref(false)
const searchQuery = ref('')
const currentPage = ref(1)
const total = ref(0)
const showPasswords = ref({})
const toastMsg = ref('')

const totalPages = computed(() => Math.ceil(total.value / 50))

async function loadData() {
  loading.value = true
  try {
    const data = await fetchAccountList({
      page: currentPage.value,
      search: searchQuery.value.trim()
    })
    accounts.value = data.list || []
    total.value = data.total || 0
  } catch (e) {
    console.error('Failed to load accounts:', e)
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  currentPage.value = 1
  loadData()
}

function clearSearch() {
  searchQuery.value = ''
  currentPage.value = 1
  loadData()
}

function goToPage(page) {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
  loadData()
}

function togglePassword(id) {
  showPasswords.value[id] = !showPasswords.value[id]
}

function copyAccount(item) {
  const text = `游戏: ${item.game_name}\n账号: ${item.account}\n密码: ${item.password}`
  navigator.clipboard.writeText(text).then(() => {
    showToast('已复制账号密码')
  }).catch(() => {})
}

function showToast(msg) {
  toastMsg.value = msg
  setTimeout(() => { toastMsg.value = '' }, 2000)
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
@keyframes bounce-in {
  0% { opacity: 0; transform: translateX(-50%) translateY(20px); }
  50% { opacity: 1; transform: translateX(-50%) translateY(-5px); }
  100% { opacity: 1; transform: translateX(-50%) translateY(0); }
}
.animate-bounce-in {
  animation: bounce-in 0.3s ease-out;
}
</style>
