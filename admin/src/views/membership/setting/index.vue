<script setup lang="ts">
import { useMembershipSetting } from "./hook";

defineOptions({
  name: "MembershipSetting"
});

const { loading, saving, formRef, form, rules, loadSetting, handleSave } =
  useMembershipSetting();
</script>

<template>
  <div class="main">
    <el-card v-loading="loading" shadow="never" class="w-full max-w-3xl m-4">
      <template #header>
        <span class="font-medium">会员中心配置</span>
      </template>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="160px">
        <el-form-item label="每天可查看游戏款数" prop="daily_game_limit">
          <el-input-number
            v-model="form.daily_game_limit"
            :min="1"
            :max="9999"
            controls-position="right"
          />
          <div class="text-xs text-gray-400 mt-1 leading-5">
            每位会员每天最多可查看（获取账号）的不同游戏款数，超出后当天将无法再获取新游戏。
          </div>
        </el-form-item>
        <el-form-item label="客服链接" prop="customer_service_link">
          <el-input
            v-model="form.customer_service_link"
            placeholder="请输入客服链接，例如 https://example.com/service"
            clearable
          />
          <div class="text-xs text-gray-400 mt-1 leading-5">
            会员页无法直接购买时将跳转到此客服链接；留空则仅提示联系客服。
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
