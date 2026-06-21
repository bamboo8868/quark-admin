<script setup lang="ts">
import { ref } from "vue";
import { useRentGame } from "./hook";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

import AddFill from "~icons/ri/add-circle-line";
import Refresh from "~icons/ep/refresh";
import Delete from "~icons/ep/delete";
import EditPen from "~icons/ep/edit-pen";

defineOptions({
  name: "RentGame"
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
  handleDelete
} = useRentGame();
</script>

<template>
  <div class="main">
    <el-form ref="formRef" :inline="true" :model="form" class="search-form bg-bg_color w-full pl-8 pt-3 overflow-auto">
      <el-form-item label="游戏名称" prop="name">
        <el-input v-model="form.name" placeholder="搜索游戏名称" clearable class="w-45!" />
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

    <PureTableBar title="租号游戏管理" :columns="columns" @refresh="onSearch">
      <template #buttons>
        <el-button type="primary" :icon="useRenderIcon(AddFill)" @click="openDialog()">
          新增游戏
        </el-button>
      </template>
      <template v-slot="{ size, dynamicColumns }">
        <pure-table align-whole="center" showOverflowTooltip table-layout="auto" :loading="loading" :size="size"
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
              :icon="useRenderIcon(EditPen)"
              @click="openDialog('修改', row)"
            >
              修改
            </el-button>
            <el-popconfirm :title="`是否确认删除游戏 ${row.name}`" @confirm="handleDelete(row)">
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
