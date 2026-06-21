<script setup lang="ts">
import { ref } from "vue";
import { useRentLog } from "./hook";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

import Refresh from "~icons/ep/refresh";
import Delete from "~icons/ep/delete";

defineOptions({
  name: "RentLog"
});

const formRef = ref();

const {
  loading,
  form,
  dataList,
  columns,
  pagination,
  gameOptions,
  onSearch,
  resetForm,
  handleSizeChange,
  handleCurrentChange,
  handleDelete
} = useRentLog();
</script>

<template>
  <div class="main">
    <el-form ref="formRef" :inline="true" :model="form" class="search-form bg-bg_color w-full pl-8 pt-3 overflow-auto">
      <el-form-item label="所属游戏" prop="game_id">
        <el-select v-model="form.game_id" placeholder="请选择游戏" clearable class="w-40!">
          <el-option v-for="opt in gameOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="CDK码" prop="cdk_code">
        <el-input v-model="form.cdk_code" placeholder="搜索CDK码" clearable class="w-40!" />
      </el-form-item>
      <el-form-item label="使用账号" prop="account">
        <el-input v-model="form.account" placeholder="搜索使用账号" clearable class="w-35!" />
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

    <PureTableBar title="CDK使用记录" :columns="columns" @refresh="onSearch">
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
