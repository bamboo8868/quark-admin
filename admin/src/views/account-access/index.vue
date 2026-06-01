<script setup lang="ts">
import { ref } from "vue";
import { useAccountAccess } from "./hook";
import { recordView } from "@/api/accountAccess";
import { message } from "@/utils/message";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

import AddFill from "~icons/ri/add-circle-line";
import Refresh from "~icons/ep/refresh";
import Delete from "~icons/ep/delete";
import EditPen from "~icons/ep/edit-pen";
import View from "~icons/ep/view";
import CopyDocument from "~icons/ep/copy-document";
import BackOneIcon from '~icons/icon-park-outline/back-one?width=1em&height=1em';

defineOptions({
  name: "AccountAccessRecords"
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
  handleBack
} = useAccountAccess();

async function handleView(row: any) {
  const { code, data } = await recordView(row.id);
  if (code === 0) {
    message("查看记录已更新", { type: "success" });
    onSearch();
  }
}

function handleCopy(row: any) {
  const text = `账号:${row.account} 密码:${row.password}`;
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
      <el-form-item label="游戏名称" prop="game_name">
        <el-input v-model="form.game_name" placeholder="搜索游戏名称" clearable class="w-45!" />
      </el-form-item>
      <el-form-item label="账号" prop="account">
        <el-input v-model="form.account" placeholder="搜索账号" clearable class="w-45!" />
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

    <PureTableBar title="D加密账号" :columns="columns" @refresh="onSearch">
      <template #buttons>
        <el-button type="primary" :icon="useRenderIcon(AddFill)" @click="openDialog()">
          新增
        </el-button>
      </template>
      <template v-slot="{ size, dynamicColumns }">
        <pure-table align-whole="center" table-layout="auto" :loading="loading" :size="size"
          adaptive :adaptiveConfig="{ offsetBottom: 108 }" :data="dataList" :columns="dynamicColumns"
          :pagination="{ ...pagination, size }" :header-cell-style="{
            background: 'var(--el-fill-color-light)',
            color: 'var(--el-text-color-primary)'
          }" @page-size-change="handleSizeChange" @page-current-change="handleCurrentChange">
          <template #operation="{ row, size }">
            <el-button
              class="reset-margin"
              link
              type="primary"
              :size="size"
              :icon="useRenderIcon(View)"
              @click="handleView(row)"
            >
              查看
            </el-button>
            <el-button
              class="reset-margin"
              link
              type="primary"
              :size="size"
              :icon="useRenderIcon(CopyDocument)"
              @click="handleCopy(row)"
            >
              复制
            </el-button>
            <el-popconfirm :title="`是否回退一条记录`" @confirm="handleBack(row)">
              <template #reference>
                <el-button class="reset-margin" link type="primary" :size="size" :icon="useRenderIcon(BackOneIcon)">
                  回退
                </el-button>
              </template>
            </el-popconfirm>
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
