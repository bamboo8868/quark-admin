<script setup lang="ts">
import { useConfigPurchase } from "./hook";

defineOptions({
  name: "ConfigPurchase"
});

const { loading, saving, formRef, form, rules, loadSetting, handleSave } =
  useConfigPurchase();
</script>

<template>
  <div class="main">
    <el-card v-loading="loading" shadow="never" class="w-full max-w-3xl m-4">
      <template #header>
        <span class="font-medium">购买链接配置</span>
      </template>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="购买链接" prop="purchase_link">
          <el-input
            v-model="form.purchase_link"
            placeholder="请输入购买链接，例如 https://example.com/buy"
            clearable
          />
          <div class="text-xs text-gray-400 mt-1 leading-5">
            会员页「购买会员」按钮将跳转到此链接；留空则提示联系客服购买。
          </div>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="saving" @click="handleSave">
            保存
          </el-button>
          <el-button @click="loadSetting">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>
