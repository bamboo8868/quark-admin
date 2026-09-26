<script setup lang="ts">
import { ref, onMounted } from "vue";
import { message } from "@/utils/message";
import { getOpenSearch, setOpenSearch } from "@/api/system";

defineOptions({
  name: "Welcome"
});

const isOpenSearch = ref(false);
const switchLoading = ref(false);

async function loadConfig() {
  try {
    const { code, data } = await getOpenSearch();
    if (code === 0) {
      isOpenSearch.value = (data as any)?.is_open_search === '1';
    }
  } catch (err: any) {
    console.error(err);
  }
}

async function handleOpenSearchChange(val: boolean) {
  switchLoading.value = true;
  try {
    const { code } = await setOpenSearch(val ? 1 : 0);
    if (code === 0) {
      message("修改成功", { type: "success" });
    } else {
      // 回滚
      isOpenSearch.value = !val;
    }
  } catch (err: any) {
    message(err?.message || "设置失败", { type: "error" });
    isOpenSearch.value = !val;
  } finally {
    switchLoading.value = false;
  }
}

onMounted(() => {
  loadConfig();
});
</script>

<template>
  <div class="config-page">
    <div class="config-card">
      <div class="config-item">
        <div class="config-info">
          <div class="config-title">开放查询功能</div>
        </div>
        <div class="config-action">
          <el-switch
            v-model="isOpenSearch"
            :loading="switchLoading"
            size="large"
            inline-prompt
            active-text="ON"
            inactive-text="OFF"
            @change="handleOpenSearchChange"
          />
          <span class="config-status" :class="{ on: isOpenSearch }">
            {{ isOpenSearch ? '已开启' : '已关闭' }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.config-page {
  padding: 24px 32px;
  max-width: 720px;
}

.config-card {
  background: #fff;
  border-radius: 10px;
  border: 1px solid #e8e8e8;
  overflow: hidden;
}

.config-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 24px;
  transition: background 0.15s;

  &:hover {
    background: #fafafa;
  }

  & + & {
    border-top: 1px solid #f0f0f0;
  }
}

.config-info {
  flex: 1;
  min-width: 0;
}

.config-title {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 3px;
}

.config-desc {
  font-size: 12px;
  color: #999;
}

.config-action {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  margin-left: 24px;
}

.config-status {
  font-size: 12px;
  color: #999;
  min-width: 48px;

  &.on {
    color: #67c23a;
  }
}
</style>
