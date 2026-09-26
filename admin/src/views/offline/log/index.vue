<script setup lang="ts">
import { ref } from "vue";
import { useOfflineLog } from "./hook";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

import Refresh from "~icons/ep/refresh";
import Delete from "~icons/ep/delete";
import Lock from "~icons/ep/lock";
import Unlock from "~icons/ep/unlock";

defineOptions({
  name: "OfflineLog"
});

const formRef = ref();

const {
  loading,
  form,
  dataList,
  columns,
  pagination,
  gameOptions,
  versionOptions,
  onGameChange,
  onSearch,
  resetForm,
  handleSizeChange,
  handleCurrentChange,
  handleDelete,
  handleToggleCdkStatus
} = useOfflineLog();
</script>

<template>
  <div class="main">
    <el-form ref="formRef" :inline="true" :model="form" class="search-form bg-bg_color w-full pl-8 pt-3 overflow-auto">
      <el-form-item label="所属游戏" prop="game_id">
        <el-select v-model="form.game_id" placeholder="请选择游戏" clearable class="w-40!" @change="onGameChange">
          <el-option v-for="opt in gameOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="所属版本" prop="version_id">
        <el-select v-model="form.version_id" placeholder="请选择版本" clearable class="w-40!">
          <el-option v-for="opt in versionOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="CDK码" prop="cdk_code">
        <el-input v-model="form.cdk_code" placeholder="搜索CDK码" clearable class="w-40!" />
      </el-form-item>
      <el-form-item label="操作人" prop="username">
        <el-input v-model="form.username" placeholder="搜索操作人" clearable class="w-35!" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :icon="useRenderIcon('ri/search-line')" :loading="loading" @click="onSearch">
          搜索
        </el-button>
        <el-button :icon="useRenderIcon(Refresh)" @click="resetForm(formRef)">
          重置
        </el-button>
      </el-form-item>
    </el-form>

    <PureTableBar title="使用记录" :columns="columns" @refresh="onSearch">
      <template v-slot="{ size, dynamicColumns }">
        <pure-table
          align-whole="center"
          showOverflowTooltip
          table-layout="auto"
          :loading="loading"
          :size="size"
          adaptive
          :adaptiveConfig="{ offsetBottom: 108 }"
          :data="dataList"
          :columns="dynamicColumns"
          :pagination="{ ...pagination, size }"
          :header-cell-style="{
            background: 'var(--el-fill-color-light)',
            color: 'var(--el-text-color-primary)'
          }"
          @page-size-change="handleSizeChange"
          @page-current-change="handleCurrentChange"
        >
          <template #operation="{ row, size }">
            <el-button
              v-if="row.cdk_status !== 3 && row.cdk_status !== 2"
              class="reset-margin"
              link
              type="danger"
              :size="size"
              :icon="useRenderIcon(Lock)"
              @click="handleToggleCdkStatus(row)"
            >
              禁用
            </el-button>
            <el-button
              v-if="row.cdk_status === 3"
              class="reset-margin"
              link
              type="success"
              :size="size"
              :icon="useRenderIcon(Unlock)"
              @click="handleToggleCdkStatus(row)"
            >
              启用
            </el-button>
            <el-popconfirm
              :title="`确认删除此记录？`"
              @confirm="handleDelete(row)"
            >
              <template #reference>
                <el-button class="reset-margin" link type="primary" :size="size" :icon="useRenderIcon(Delete)">
                  删除
                </el-button>
              </template>
            </el-popconfirm>
          </template>
        </pure-table>
      </template>
    </PureTableBar>
  </div>
</template>

<style lang="scss" scoped>
:deep(.el-dropdown-menu__item i) {
  margin: 0;
}

.search-form {
  :deep(.el-form-item) {
    margin-bottom: 12px;
  }
}
</style>
