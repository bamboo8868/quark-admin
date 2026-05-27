<script setup lang="ts">
import { ref, reactive } from "vue";
import { message } from "@/utils/message";
import { changePassword } from "@/api/user";
import { deviceDetection } from "@pureadmin/utils";
import type { FormInstance, FormRules } from "element-plus";

defineOptions({
  name: "AccountManagement"
});

const list = ref([
  {
    title: "账户密码",
    illustrate: "修改当前账户的登录密码",
    button: "修改"
  }
]);

// Password dialog
const dialogVisible = ref(false);
const passwordFormRef = ref<FormInstance>();
const passwordForm = reactive({
  oldPassword: "",
  newPassword: "",
  confirmPassword: ""
});
const passwordLoading = ref(false);

const passwordRules = reactive<FormRules>({
  oldPassword: [
    { required: true, message: "请输入原密码", trigger: "blur" }
  ],
  newPassword: [
    { required: true, message: "请输入新密码", trigger: "blur" },
    { min: 6, message: "密码长度不能少于6位", trigger: "blur" }
  ],
  confirmPassword: [
    { required: true, message: "请确认新密码", trigger: "blur" },
    {
      validator: (_rule, value, callback) => {
        if (value !== passwordForm.newPassword) {
          callback(new Error("两次输入的密码不一致"));
        } else {
          callback();
        }
      },
      trigger: "blur"
    }
  ]
});

function onClick(item) {
  if (item.title === "账户密码") {
    dialogVisible.value = true;
  } else {
    message("请根据具体业务自行实现", { type: "success" });
  }
}

const handlePasswordSubmit = async (formEl: FormInstance) => {
  await formEl.validate(async (valid) => {
    if (!valid) return;
    passwordLoading.value = true;
    try {
      const { code, message: msg } = await changePassword({
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword
      });
      if (code === 0) {
        message("密码修改成功", { type: "success" });
        dialogVisible.value = false;
        resetPasswordForm();
      } else {
        message(msg || "密码修改失败", { type: "error" });
      }
    } catch (error) {
      message(`修改异常 ${error}`, { type: "error" });
    } finally {
      passwordLoading.value = false;
    }
  });
};

const resetPasswordForm = () => {
  passwordForm.oldPassword = "";
  passwordForm.newPassword = "";
  passwordForm.confirmPassword = "";
  passwordFormRef.value?.resetFields();
};
</script>

<template>
  <div :class="['min-w-45', deviceDetection() ? 'max-w-full' : 'max-w-[70%]']">
    <h3 class="my-8!">账户管理</h3>
    <div v-for="(item, index) in list" :key="index">
      <div class="flex items-center">
        <div class="flex-1">
          <p>{{ item.title }}</p>
          <el-text class="mx-1" type="info">{{ item.illustrate }}</el-text>
        </div>
        <el-button type="primary" text @click="onClick(item)">
          {{ item.button }}
        </el-button>
      </div>
      <el-divider />
    </div>

    <!-- Change password dialog -->
    <el-dialog
      v-model="dialogVisible"
      title="修改密码"
      width="400px"
      destroy-on-close
      :close-on-click-modal="false"
      @closed="resetPasswordForm"
    >
      <el-form
        ref="passwordFormRef"
        :model="passwordForm"
        :rules="passwordRules"
        label-width="80px"
      >
        <el-form-item label="原密码" prop="oldPassword">
          <el-input
            v-model="passwordForm.oldPassword"
            type="password"
            show-password
            placeholder="请输入原密码"
          />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input
            v-model="passwordForm.newPassword"
            type="password"
            show-password
            placeholder="请输入新密码"
          />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
            v-model="passwordForm.confirmPassword"
            type="password"
            show-password
            placeholder="请再次输入新密码"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="passwordLoading"
          @click="handlePasswordSubmit(passwordFormRef)"
        >
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.el-divider--horizontal {
  border-top: 0.1px var(--el-border-color) var(--el-border-style);
}
</style>
