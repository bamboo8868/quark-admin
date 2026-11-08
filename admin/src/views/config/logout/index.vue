<script setup lang="ts">
import { useConfigLogout } from "./hook";

defineOptions({
  name: "ConfigLogout"
});

const { loading, saving, formRef, form, rules, loadSetting, handleSave } =
  useConfigLogout();
</script>

<template>
  <div class="main">
    <el-card v-loading="loading" shadow="never" class="w-full max-w-3xl m-4">
      <template #header>
        <span class="font-medium">注销页配置</span>
      </template>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="160px">
        <el-form-item label="注销功能" prop="enabled">
          <el-switch
            v-model="form.enabled"
            active-text="开启"
            inactive-text="关闭"
          />
          <div class="text-xs text-gray-400 mt-1 leading-5">
            关闭后前台注销页将无法发起注销，接口直接返回「注销功能暂未开启」。
          </div>
        </el-form-item>
        <el-form-item label="每日注销次数" prop="daily_limit">
          <el-input-number
            v-model="form.daily_limit"
            :min="1"
            :max="9999"
            controls-position="right"
          />
          <div class="text-xs text-gray-400 mt-1 leading-5">
            每个兑换码（CDK）每天最多成功注销的次数，仅注销成功才计数，次日自动重置。
          </div>
        </el-form-item>
        <el-form-item label="注销间隔时间（秒）" prop="cooldown_seconds">
          <el-input-number
            v-model="form.cooldown_seconds"
            :min="0"
            :max="86400"
            controls-position="right"
          />
          <div class="text-xs text-gray-400 mt-1 leading-5">
            同一兑换码两次注销之间的最小间隔秒数，防止频繁启动浏览器；设为 0 表示不限制间隔。
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