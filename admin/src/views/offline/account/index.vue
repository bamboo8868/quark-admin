<script setup lang="ts">
import { ref } from "vue";
import { useOfflineAccount } from "./hook";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

import AddFill from "~icons/ri/add-circle-line";
import Refresh from "~icons/ep/refresh";
import Delete from "~icons/ep/delete";
import EditPen from "~icons/ep/edit-pen";
import Upload from "~icons/ri/upload-2-line";

defineOptions({
  name: "OfflineAccount"
});

const formRef = ref();

const {
  loading,
  form,
  dataList,
  columns,
  pagination,
  gameOptions,
  searchVersionOptions,
  selectedRows,
  onSearch,
  resetForm,
  handleSizeChange,
  handleCurrentChange,
  handleSelectionChange,
  handleBatchDelete,
  handleGameChange,
  openDialog,
  handleDelete,
  importLoading,
  handleImport
} = useOfflineAccount();
</script>

<template>
  <div class="main">
    <el-form ref="formRef" :inline="true" :model="form" class="search-form bg-bg_color w-full pl-8 pt-3 overflow-auto">
      <el-form-item label="所属游戏" prop="game_id">
        <el-select v-model="form.game_id" placeholder="全部游戏" clearable filterable class="w-45!" @change="handleGameChange">
          <el-option v-for="g in gameOptions" :key="g.value" :label="g.label" :value="g.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="所属版本" prop="version_id">
        <el-select v-model="form.version_id" placeholder="全部版本" clearable filterable class="w-45!">
          <el-option v-for="v in searchVersionOptions" :key="v.value" :label="v.label" :value="v.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="账号" prop="account">
        <el-input v-model="form.account" placeholder="搜索账号" clearable class="w-45!" />
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="form.status" placeholder="全部状态" clearable class="w-30!">
          <el-option label="可用" :value="1" />
          <el-option label="禁用" :value="0" />
          <el-option label="已兑换" :value="2" />
        </el-select>
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

    <PureTableBar title="账号管理" :columns="columns" @refresh="onSearch">
      <template #buttons>
        <el-button type="primary" :icon="useRenderIcon(AddFill)" @click="openDialog()">
          新增账号
        </el-button>
        <el-button type="success" :icon="useRenderIcon(Upload)" :loading="importLoading" @click="handleImport">
          导入SDA
        </el-button>
        <el-button
          type="danger"
          :icon="useRenderIcon(Delete)"
          :disabled="selectedRows.length === 0"
          @click="handleBatchDelete"
        >
          批量删除
        </el-button>
      </template>
      <template v-slot="{ size, dynamicColumns }">
        <pure-table align-whole="center" showOverflowTooltip table-layout="auto" :loading="loading" :size="size"
          adaptive :adaptiveConfig="{ offsetBottom: 108 }" :data="dataList" :columns="dynamicColumns"
          :pagination="{ ...pagination, size }" :header-cell-style="{
            background: 'var(--el-fill-color-light)',
            color: 'var(--el-text-color-primary)'
          }" @page-size-change="handleSizeChange" @page-current-change="handleCurrentChange"
          @selection-change="handleSelectionChange">
          <template #operation="{ row, size }">
            <el-button
              class="reset-margin"
              link
              type="primary"
              :size="size"
              :icon="useRenderIcon(EditPen)"
              @click="openDialog('修改', row)"
            >
              修改
            </el-button>
            <el-popconfirm :title="`是否确认删除账号 ${row.account}`" @confirm="handleDelete(row)">
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
