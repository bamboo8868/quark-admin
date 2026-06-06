<template>
  <!-- Mobile overlay -->
  <Teleport to="body">
    <div v-if="mobileOpen" class="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden" @click="$emit('close')"></div>
  </Teleport>

  <!-- Sidebar -->
  <aside
    :class="[
      'z-50 shrink-0 border-r border-gray-800/50 bg-gray-950/95 transition-transform duration-300',
      // Mobile: fixed drawer
      'fixed top-14 md:top-16 bottom-0 w-64 md:sticky md:top-16 md:h-[calc(100vh-4rem)] md:w-60 md:translate-x-0 md:bg-gray-950/50 md:transition-none',
      mobileOpen ? 'translate-x-0' : '-translate-x-full'
    ]"
  >
    <div class="flex h-full flex-col">
      <!-- Category header -->
      <div class="shrink-0 px-4 pt-4 pb-2">
        <div class="px-3 text-xs font-semibold uppercase tracking-wider text-gray-600">
          游戏分类
        </div>
      </div>

      <!-- Scrollable category list -->
      <nav class="flex-1 overflow-y-auto px-2 pb-2">
        <button
          v-for="cat in categories"
          :key="cat.id"
          @click="$emit('select', cat.id)"
          :class="[
            'group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium',
            activeCategory === cat.id
              ? 'bg-violet-600/15 text-violet-400 shadow-sm shadow-violet-500/5'
              : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
          ]"
        >
          <span
            :class="[
              'flex h-7 w-7 items-center justify-center rounded-lg text-sm',
              activeCategory === cat.id
                ? 'bg-violet-600/20'
                : 'bg-gray-800/50 group-hover:bg-gray-800'
            ]"
          >
            {{ cat.icon }}
          </span>
          <span>{{ cat.name }}</span>
          <span
            v-if="activeCategory === cat.id"
            class="ml-auto h-1.5 w-1.5 rounded-full bg-violet-400"
          ></span>
        </button>
      </nav>

      <!-- Bottom Stats (sticky at bottom) -->
      <div class="shrink-0 border-t border-gray-800/50 p-4">
        <div class="rounded-xl bg-gray-900/50 p-3">
          <div class="text-xs font-medium text-gray-500">社区数据</div>
          <div class="mt-2 space-y-1.5">
            <div class="flex items-center justify-between">
              <span class="text-xs text-gray-500">游戏总数</span>
              <span class="text-sm font-semibold text-gray-300">{{ totalGames }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-xs text-gray-500">活跃玩家</span>
              <span class="text-sm font-semibold text-gray-300">10.8M</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-xs text-gray-500">今日新增</span>
              <span class="text-sm font-semibold text-emerald-400">+3</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup>
defineProps({
  categories: { type: Array, required: true },
  activeCategory: { type: [String, Number], default: 'all' },
  mobileOpen: { type: Boolean, default: false },
  totalGames: { type: Number, default: 0 }
})

defineEmits(['select', 'close'])
</script>
