<script setup lang="ts">
import { ref } from "vue";
import { useMemberCdkList } from "./hook";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

import Refresh from "~icons/ep/refresh";
import Delete from "~icons/ep/delete";
import EditPen from "~icons/ep/edit-pen";
import Plus from "~icons/ep/plus";

defineOptions({
  name: "MemberCdk"
});

const formRef = ref();

const {
  loading,
  form,
  dataList,
  columns,
  pagination,
  selectedRows,
  onSearch,
  resetForm,
  handleSizeChange,
  handleCurrentChange,
  handleSelectionChange,
  handleBatchDelete,
  openDialog,
  openBatchDialog,
  handleDelete,
  statusMap,
  durationOptions
} = useMemberCdkList();
</script>

<template>
  <div class="main">
    <el-form ref="formRef" :inline="true" :model="form" class="search-form bg-bg_color w-full pl-8 pt-3 overflow-auto">
      <el-form-item label="CDK码" prop="cdk_code">
        <el-input v-model="form.cdk_code" placeholder="搜索CDK码" clearable class="w-45!" />
      </el-form-item>
      <el-form-item label="会员等级" prop="member_level">
        <el-select v-model="form.member_level" placeholder="全部等级" clearable class="w-30!">
          <el-option label="青铜" :value="1" />
          <el-option label="黄金" :value="2" />
        </el-select>
      </el-form-item>
      <el-form-item label="时长" prop="duration_months">
        <el-select v-model="form.duration_months" placeholder="全部时长" clearable class="w-30!">
          <el-option v-for="opt in durationOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="form.status" placeholder="全部状态" clearable class="w-25!">
          <el-option v-for="(info, key) in statusMap" :key="key" :label="info.label" :value="Number(key)" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="onSearch">
          查询
        </el-button>
        <el-button @click="resetForm(formRef)">
          <el-icon class="mr-1"><Refresh /></el-icon>
          重置
        </el-button>
      </el-form-item>
    </el-form>

    <PureTableBar
      :columns="columns"
      :dataSource="dataList"
      :loading="loading"
      :pagination="pagination"
      @selection-change="handleSelectionChange"
      @page-size-change="handleSizeChange"
      @page-current-change="handleCurrentChange"
    >
      <template #buttons>
        <el-button type="primary" @click="openBatchDialog">
          <el-icon class="mr-1"><Plus /></el-icon>
          批量生成
        </el-button>
        <el-button type="success" @click="openDialog('新建')">
          <el-icon class="mr-1"><Plus /></el-icon>
          新建CDK
        </el-button>
        <el-button
          type="danger"
          :disabled="selectedRows?.length === 0"
          @click="handleBatchDelete"
        >
          <el-icon class="mr-1"><Delete /></el-icon>
          批量删除
        </el-button>
      </template>

      <template #operation="{ row }">
        <el-button
          v-if="row.status !== 2"
          class="reset-margin"
          link
          type="primary"
          @click="openDialog('编辑', row)"
        >
          <el-icon class="mr-1"><EditPen /></el-icon>
          编辑
        </el-button>
        <el-popconfirm
          v-if="row.status !== 2"
          :title="`确认删除该CDK?`"
          @confirm="handleDelete(row)"
        >
          <template #reference>
            <el-button class="reset-margin" link type="danger">
              <el-icon class="mr-1"><Delete /></el-icon>
              删除
            </el-button>
          </template>
        </el-popconfirm>
        <span v-if="row.status === 2" class="text-gray-400 text-xs">已使用，不可操作</span>
      </template>
    </PureTableBar>
  </div>
</template>

<style scoped>
.search-form {
  border-bottom: 1px solid var(--el-border-color-lighter);
}
</style>
