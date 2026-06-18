<script setup lang="ts">
import { ref } from "vue";
import { useGameAccount } from "./hook";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

import AddFill from "~icons/ri/add-circle-line";
import Refresh from "~icons/ep/refresh";
import Delete from "~icons/ep/delete";
import EditPen from "~icons/ep/edit-pen";
import SwitchButton from "~icons/ep/switch-button";
import { message } from "@/utils/message";
import CopyDocument from "~icons/ep/copy-document";

defineOptions({
  name: "GameAccount"
});

const formRef = ref();

const {
  loading,
  form,
  dataList,
  columns,
  pagination,
  onSearch,
  resetForm,
  handleSizeChange,
  handleCurrentChange,
  openDialog,
  handleDelete,
  handleImport,
  handleLogout
} = useGameAccount();

function handleCopy(row: any) {
  const text = `${row.code}`;
  if (navigator.clipboard) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        message("已复制到剪贴板", { type: "success" });
      })
      .catch(() => {
        message("复制失败", { type: "error" });
      });
  } else {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }
}
</script>

<template>
  <div class="main">
    <el-form ref="formRef" :inline="true" :model="form" class="search-form bg-bg_color w-full pl-8 pt-3 overflow-auto">
      <el-form-item label="账号" prop="account">
        <el-input v-model="form.account" placeholder="搜索账号" clearable class="w-45!" />
      </el-form-item>
      <el-form-item label="查询" prop="visible">
        <el-select v-model="form.visible" placeholder="请选择状态" clearable class="w-45!">
          <el-option label="是" :value="1" />
          <el-option label="否" :value="0" />
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

    <PureTableBar title="游戏账号" :columns="columns" @refresh="onSearch">
      <template v-slot="{ size, dynamicColumns }">
        <pure-table align-whole="center" showOverflowTooltip table-layout="auto" :loading="loading" :size="size"
          adaptive :adaptiveConfig="{ offsetBottom: 108 }" :data="dataList" :columns="dynamicColumns"
          :pagination="{ ...pagination, size }" :header-cell-style="{
            background: 'var(--el-fill-color-light)',
            color: 'var(--el-text-color-primary)'
          }" @page-size-change="handleSizeChange" @page-current-change="handleCurrentChange">
          <template #operation="{ row, size }">
            <el-button class="reset-margin" link type="primary" :size="size" :icon="useRenderIcon(EditPen)"
              @click="openDialog('修改', row)">
              修改密码
            </el-button>
            <el-button @click="handleCopy(row)" class="reset-margin" link type="primary" :size="size"
              :icon="useRenderIcon(CopyDocument)">
              复制
            </el-button>
            <el-popconfirm :title="`是否确认注销账号 ${row.account}`" @confirm="handleLogout(row)">
              <template #reference>
                <el-button class="reset-margin" link type="danger" :size="size"
                  :icon="useRenderIcon(SwitchButton)">
                  注销
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
