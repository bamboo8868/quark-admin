<template>
  <div class="min-h-screen bg-gray-950">
    <!-- Top Navigation Bar -->
    <header class="sticky top-0 z-50 border-b border-gray-800/50 bg-gray-950/80 backdrop-blur-xl">
      <div class="mx-auto flex h-14 md:h-16 max-w-[1920px] items-center justify-between px-4 md:px-6">
        <div class="flex items-center gap-3">
          <!-- Mobile menu toggle -->
          <button @click="sidebarOpen = !sidebarOpen" class="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-700/50 text-gray-400 hover:bg-gray-800 hover:text-white transition md:hidden">
            <svg v-if="!sidebarOpen" class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
            <svg v-else class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
          <router-link to="/" class="flex items-center gap-2 md:gap-3">
            <div class="flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-base md:text-lg font-bold shadow-lg shadow-violet-600/20">
              {{ siteConfig.siteLogo }}
            </div>
            <h1 class="text-lg md:text-xl font-bold tracking-tight">
              <span class="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">{{ siteConfig.siteNameHighlight }}</span>
              <span class="text-gray-300">{{ siteConfig.siteNameNormal }}</span>
            </h1>
          </router-link>
        </div>
        <div class="flex items-center gap-2 md:gap-3">
          <div class="relative hidden md:block">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索游戏..."
              class="w-80 rounded-xl border border-gray-700/50 bg-gray-900/50 px-4 py-2 pl-10 text-sm text-gray-200 placeholder-gray-500 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20"
            />
            <svg class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
          <!-- Mobile search icon -->
          <button @click="mobileSearchOpen = !mobileSearchOpen" class="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:text-white transition md:hidden">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </button>
          <router-link v-if="!currentUser.isLoggedIn" to="/login" class="text-sm text-gray-400 hover:text-violet-400 transition hidden sm:block">登录</router-link>
          <router-link v-if="!currentUser.isLoggedIn" to="/register" class="rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium shadow-lg shadow-violet-600/25 hover:shadow-violet-600/40 transition">注册</router-link>
          <!-- Logged in: membership badge + username -->
          <template v-if="currentUser.isLoggedIn">
            <router-link to="/membership" :class="['flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold', currentTier.bgColor, currentTier.color]" :title="currentTier.name">
              <span>{{ currentTier.icon }}</span>
              <span class="hidden sm:inline">{{ currentTier.name }}</span>
            </router-link>
            <span class="text-sm text-gray-400 hidden md:block">{{ currentUser.username }}</span>
            <button @click="handleLogout" class="text-xs text-gray-500 hover:text-red-400 transition">退出</button>
          </template>
        </div>
      </div>
      <!-- Mobile search bar -->
      <div v-if="mobileSearchOpen" class="border-t border-gray-800/50 px-4 pb-3 pt-2 md:hidden">
        <div class="relative">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索游戏..."
            class="w-full rounded-xl border border-gray-700/50 bg-gray-900/50 px-4 py-2.5 pl-10 text-sm text-gray-200 placeholder-gray-500 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20"
          />
          <svg class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        </div>
      </div>
    </header>

    <div class="mx-auto flex max-w-[1920px]">
      <!-- Left Sidebar - Categories -->
      <Sidebar
        :categories="categories"
        :active-category="activeCategory"
        :mobile-open="sidebarOpen"
        :total-games="totalGames"
        @select="handleCategorySelect"
        @close="sidebarOpen = false"
      />

      <!-- Right Content - Game List -->
      <main class="flex-1 p-4 md:p-6">
        <!-- Category Title -->
        <div class="mb-4 md:mb-6 flex items-start md:items-center justify-between gap-2">
          <div>
            <h2 class="text-xl md:text-2xl font-bold text-white">
              {{ currentCategoryName }}
            </h2>
            <p class="mt-1 text-xs md:text-sm text-gray-500">
              共 {{ totalGames }} 款游戏
            </p>
          </div>
          <div class="flex gap-1.5 md:gap-2 shrink-0">
            <button
              v-for="sort in sortOptions"
              :key="sort.value"
              @click="currentSort = sort.value"
              :class="[
                'rounded-lg px-2.5 md:px-3 py-1 md:py-1.5 text-xs font-medium',
                currentSort === sort.value
                  ? 'bg-violet-600/20 text-violet-400 ring-1 ring-violet-500/30'
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-gray-300'
              ]"
            >
              {{ sort.label }}
            </button>
          </div>
        </div>

        <!-- Game Grid -->
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          <GameCard
            v-for="game in sortedGames"
            :key="game.id"
            :game="game"
          />
        </div>

        <!-- Empty State -->
        <div v-if="sortedGames.length === 0" class="flex flex-col items-center justify-center py-32">
          <div class="text-6xl">🎮</div>
          <p class="mt-4 text-lg text-gray-500">暂无该分类的游戏</p>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import Sidebar from '../components/Sidebar.vue'
import GameCard from '../components/GameCard.vue'
import siteConfig from '../config/site.js'
import { currentUser, getTier } from '../config/membership.js'
import { fetchCategories, fetchTags, fetchGames } from '../api/index.js'

const route = useRoute()
const searchQuery = ref('')
const activeCategory = ref(
  route.params.id
    ? (isNaN(route.params.id) ? route.params.id : Number(route.params.id))
    : 'all'
)
const currentSort = ref('popular')
const sidebarOpen = ref(false)
const mobileSearchOpen = ref(false)

// API data
const rawCategories = ref([])
const rawTags = ref([])
const games = ref([])
const totalGames = ref(0)
const loading = ref(false)

// Prepend 'all' to API categories
const categories = computed(() => [
  { id: 'all', name: '全部游戏', icon: '🎮' },
  ...rawCategories.value.map(c => ({
    id: c.id,
    name: c.name,
    icon: c.icon || '🎮'
  }))
])

// Build tag map: id -> name
const tagMap = computed(() => {
  const map = {}
  rawTags.value.forEach(t => { map[t.id] = t.name })
  return map
})

// Watch route changes to update category
watch(() => route.params.id, (newId) => {
  if (newId) activeCategory.value = isNaN(newId) ? newId : Number(newId)
  else activeCategory.value = 'all'
})

const sortOptions = [
  { label: '最热门', value: 'popular' },
  { label: '最新', value: 'newest' }
]

const currentCategoryName = computed(() => {
  const cat = categories.value.find(c => c.id === activeCategory.value)
  return cat ? cat.name : '全部游戏'
})

// Map API game objects to GameCard-compatible format
function mapGame(g) {
  return {
    id: g.id,
    title: g.name,
    category: g.category_id,
    category_name: g.category_name,
    cover: g.img_url || '',
    description: g.desc || '',
    tags: Array.isArray(g.tag_ids)
      ? g.tag_ids.map(id => tagMap.value[id] || '').filter(Boolean)
      : [],
    member_level: g.member_level || 0,
    storeUrl: g.detail_url || ''
  }
}

const filteredGames = computed(() => {
  let result = games.value.map(mapGame)

  // Filter by search
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    result = result.filter(g =>
      g.title.toLowerCase().includes(q) ||
      g.tags.some(t => t.toLowerCase().includes(q))
    )
  }

  return result
})

const sortedGames = computed(() => {
  const list = [...filteredGames.value]
  switch (currentSort.value) {
    case 'newest':
      return list.sort((a, b) => b.id - a.id)
    default:
      return list
  }
})

const currentTier = computed(() => getTier(currentUser.membership))

async function loadData() {
  loading.value = true
  try {
    const params = {}
    if (activeCategory.value !== 'all') {
      params.category_id = activeCategory.value
    }
    if (searchQuery.value.trim()) {
      params.name = searchQuery.value.trim()
    }
    params.limit = 100
    const data = await fetchGames(params)
    games.value = data.list || []
    totalGames.value = data.total || 0
  } catch (e) {
    console.error('Failed to load games:', e)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  // Load categories and tags in parallel
  try {
    const [cats, tags] = await Promise.all([fetchCategories(), fetchTags()])
    rawCategories.value = cats
    rawTags.value = tags
  } catch (e) {
    console.error('Failed to load categories/tags:', e)
  }
  // Load games
  await loadData()
})

// Reload games when category changes
watch(activeCategory, () => {
  loadData()
})

function handleLogout() {
  currentUser.isLoggedIn = false
  currentUser.username = ''
  currentUser.membership = 'guest'
}

function handleCategorySelect(id) {
  activeCategory.value = id
  sidebarOpen.value = false
}
</script>
