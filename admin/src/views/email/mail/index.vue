<script setup lang="ts">
import { ref } from "vue";
import { useMail } from "./hook";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

import Refresh from "~icons/ep/refresh";
import View from "~icons/ep/view";

defineOptions({
  name: "MailManage"
});

const formRef = ref();

const {
  loading,
  form,
  accountList,
  selectedAccountId,
  dataList,
  columns,
  pagination,
  onSearch,
  resetForm,
  handleSizeChange,
  handleCurrentChange,
  handleAccountChange,
  htmlDialogVisible,
  htmlDialogTitle,
  htmlContent,
  handleViewHtml,
  autoRefreshInterval
} = useMail();
</script>

<template>
  <div class="main">
    <el-form
      ref="formRef"
      :inline="true"
      :model="form"
      class="search-form bg-bg_color w-full pl-8 pt-3 overflow-auto"
    >
      <el-form-item label="邮箱账号" prop="accountId">
        <el-select
          v-model="selectedAccountId"
          placeholder="全部账号"
          clearable
          filterable
          class="w-50!"
          @change="handleAccountChange"
        >
          <el-option
            v-for="account in accountList"
            :key="account.id"
            :label="account.displayName || account.username"
            :value="account.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="游戏账号" prop="gameAccount">
        <el-input
          v-model="form.gameAccount"
          placeholder="搜索游戏账号"
          clearable
          class="w-40!"
        />
      </el-form-item>
      <el-form-item label="主题" prop="subject">
        <el-input
          v-model="form.subject"
          placeholder="搜索邮件主题"
          clearable
          class="w-45!"
        />
      </el-form-item>
      <el-form-item label="自动刷新" prop="autoRefresh">
        <el-select
          v-model="autoRefreshInterval"
          placeholder="关闭"
          clearable
          class="w-40!"
        >
          <el-option :value="0" label="关闭" />
          <el-option :value="5" label="5秒" />
          <el-option :value="10" label="10秒" />
          <el-option :value="15" label="15秒" />
          <el-option :value="30" label="30秒" />
          <el-option :value="60" label="60秒" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button
          type="primary"
          :icon="useRenderIcon('ri/search-line')"
          :loading="loading"
          @click="onSearch"
        >
          搜索
        </el-button>
        <el-button
          :icon="useRenderIcon(Refresh)"
          @click="resetForm(formRef)"
        >
          重置
        </el-button>
      </el-form-item>
    </el-form>

    <PureTableBar
      title="邮件列表"
      :columns="columns"
      @refresh="onSearch"
    >
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
              class="reset-margin"
              link
              type="primary"
              :size="size"
              :icon="useRenderIcon(View)"
              @click="handleViewHtml(row)"
            >
              查看邮件
            </el-button>
          </template>
        </pure-table>
      </template>
    </PureTableBar>

    <el-empty
      v-if="accountList.length === 0"
      description="请先在账号管理中添加邮箱账号"
      class="mt-4"
    />

    <!-- HTML Viewer Dialog -->
    <el-dialog
      v-model="htmlDialogVisible"
      :title="htmlDialogTitle"
      width="80%"
      top="5vh"
      destroy-on-close
    >
      <div class="html-viewer">
        <el-tabs>
          <el-tab-pane label="渲染预览">
            <iframe
              :srcdoc="htmlContent"
              class="html-preview-iframe"
              sandbox="allow-same-origin"
            />
          </el-tab-pane>
          <el-tab-pane label="原始HTML">
            <pre class="html-source-code">{{ htmlContent }}</pre>
          </el-tab-pane>
        </el-tabs>
      </div>
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

.html-viewer {
  max-height: 70vh;
  overflow: auto;
}

.html-preview-iframe {
  width: 100%;
  height: 60vh;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
}

.html-source-code {
  max-height: 60vh;
  overflow: auto;
  background: var(--el-fill-color-lighter);
  padding: 16px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
