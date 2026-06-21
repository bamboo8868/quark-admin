<script setup lang="ts">
import { ref } from "vue";
import { useMemberList } from "./hook";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

import Refresh from "~icons/ep/refresh";
import Delete from "~icons/ep/delete";
import EditPen from "~icons/ep/edit-pen";
import ArrowDown from "~icons/ep/arrow-down";

defineOptions({
  name: "MemberList"
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
  handleSelectionChange,
  handleBatchDelete,
  openDialog,
  handleLevelChange,
  handleDelete,
  levelMap
} = useMemberList();
</script>

<template>
  <div class="main">
    <el-form ref="formRef" :inline="true" :model="form" class="search-form bg-bg_color w-full pl-8 pt-3 overflow-auto">
      <el-form-item label="用户名" prop="username">
        <el-input v-model="form.username" placeholder="搜索用户名" clearable class="w-40!" />
      </el-form-item>
      <el-form-item label="邮箱" prop="email">
        <el-input v-model="form.email" placeholder="搜索邮箱" clearable class="w-45!" />
      </el-form-item>
      <el-form-item label="会员等级" prop="member_level">
        <el-select v-model="form.member_level" placeholder="全部等级" clearable class="w-30!">
          <el-option label="游客" :value="0" />
          <el-option label="青铜" :value="1" />
          <el-option label="黄金" :value="2" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="form.status" placeholder="全部状态" clearable class="w-28!">
          <el-option label="正常" :value="1" />
          <el-option label="禁用" :value="0" />
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

    <PureTableBar title="会员列表" :columns="columns" @refresh="onSearch">
      <template #buttons>
        <el-popconfirm title="是否确认批量删除所选会员？" @confirm="handleBatchDelete">
          <template #reference>
            <el-button type="danger" plain :icon="useRenderIcon(Delete)" :disabled="!dataList.length">
              批量删除
            </el-button>
          </template>
        </el-popconfirm>
      </template>
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
          @selection-change="handleSelectionChange"
        >
          <template #operation="{ row, size }">
            <!-- Level quick change dropdown -->
            <el-dropdown trigger="click" @command="(level: number) => handleLevelChange(row, level)">
              <el-button class="reset-margin" link type="warning" :size="size">
                改等级
                <el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item
                    v-for="(info, lv) in levelMap"
                    :key="lv"
                    :command="lv"
                    :disabled="row.member_level === lv"
                  >
                    {{ info.label }}
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <el-button
              class="reset-margin"
              link
              type="primary"
              :size="size"
              :icon="useRenderIcon(EditPen)"
              @click="openDialog('编辑', row)"
            >
              编辑
            </el-button>
            <el-popconfirm :title="`是否确认删除会员 ${row.username}`" @confirm="handleDelete(row)">
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
