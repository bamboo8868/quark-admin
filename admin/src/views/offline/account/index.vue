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
import ShieldLock from "~icons/ri/shield-keyhole-line";
import SwitchButton from "~icons/ep/switch-button";

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
  handleLogout,
  loggingOutId,
  importLoading,
  handleImport,
  parentalDialogVisible,
  parentalTitle,
  parentalLogs,
  parentalStatus,
  parentalRunningId,
  handleParental,
  closeParentalDialog
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
      <el-form-item label="昵称" prop="nickname">
        <el-input v-model="form.nickname" placeholder="搜索昵称" clearable class="w-45!" />
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
            <el-popconfirm
              :title="`登录成人账号 ${row.account}，为其家庭组下的儿童账号启用家长控制？`"
              width="280"
              @confirm="handleParental(row, 'enable')"
            >
              <template #reference>
                <el-button
                  class="reset-margin"
                  link
                  type="success"
                  :size="size"
                  :loading="parentalRunningId === row.id"
                  :icon="useRenderIcon(ShieldLock)"
                >
                  启用家长控制
                </el-button>
              </template>
            </el-popconfirm>
            <el-popconfirm
              :title="`登录成人账号 ${row.account}，为其家庭组下的儿童账号关闭家长控制？`"
              width="280"
              @confirm="handleParental(row, 'disable')"
            >
              <template #reference>
                <el-button
                  class="reset-margin"
                  link
                  type="warning"
                  :size="size"
                  :loading="parentalRunningId === row.id"
                  :icon="useRenderIcon(ShieldLock)"
                >
                  关闭家长控制
                </el-button>
              </template>
            </el-popconfirm>
            <el-popconfirm
              :title="`是否确认注销账号 ${row.account}`"
              @confirm="handleLogout(row)"
            >
              <template #reference>
                <el-button
                  class="reset-margin"
                  link
                  type="danger"
                  :size="size"
                  :loading="loggingOutId === row.id"
                  :icon="useRenderIcon(SwitchButton)"
                >
                  注销
                </el-button>
              </template>
            </el-popconfirm>
          </template>
        </pure-table>
      </template>
    </PureTableBar>

    <el-dialog
      v-model="parentalDialogVisible"
      :title="parentalTitle"
      width="560px"
      :close-on-click-modal="false"
      @close="closeParentalDialog"
    >
      <div class="mb-2">
        <el-tag v-if="parentalStatus === 'running'" type="primary">执行中...</el-tag>
        <el-tag v-else-if="parentalStatus === 'success'" type="success">已完成</el-tag>
        <el-tag v-else-if="parentalStatus === 'failed'" type="danger">失败</el-tag>
      </div>
      <div class="parental-log">
        <div v-for="(item, idx) in parentalLogs" :key="idx" :class="['log-line', `log-${item.type}`]">
          <span class="log-time">{{ item.time ? new Date(item.time).toLocaleTimeString('zh-CN') : '' }}</span>
          <span class="log-msg">{{ item.msg }}</span>
        </div>
        <div v-if="parentalLogs.length === 0" class="log-empty">暂无日志</div>
      </div>
      <template #footer>
        <el-button @click="closeParentalDialog">关闭</el-button>
      </template>
    </el-dialog>
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

.parental-log {
  max-height: 320px;
  padding: 8px 12px;
  overflow-y: auto;
  font-family: var(--el-font-family-mono, monospace);
  font-size: 12px;
  line-height: 1.8;
  background: var(--el-fill-color-light);
  border-radius: 4px;

  .log-line {
    display: flex;
    gap: 8px;
  }

  .log-time {
    flex-shrink: 0;
    color: var(--el-text-color-secondary);
  }

  .log-success .log-msg {
    color: var(--el-color-success);
  }

  .log-error .log-msg {
    color: var(--el-color-danger);
  }

  .log-warn .log-msg {
    color: var(--el-color-warning);
  }

  .log-empty {
    color: var(--el-text-color-secondary);
  }
}
</style>
