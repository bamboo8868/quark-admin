import { message } from "@/utils/message";
import { getLogoutSetting, updateLogoutSetting } from "@/api/config";
import { ref, reactive, onMounted } from "vue";

export function useConfigLogout() {
  const loading = ref(false);
  const saving = ref(false);
  const formRef = ref();

  /** Setting form */
  const form = reactive({
    enabled: true,
    daily_limit: 3,
    cooldown_seconds: 60
  });

  const rules = {
    daily_limit: [
      {
        required: true,
        message: "请输入每日注销次数",
        trigger: "blur"
      }
    ],
    cooldown_seconds: [
      {
        required: true,
        message: "请输入注销间隔时间",
        trigger: "blur"
      }
    ]
  };

  async function loadSetting() {
    loading.value = true;
    try {
      const { code, data } = await getLogoutSetting();
      if (code === 0) {
        form.enabled = data?.enabled !== false;
        form.daily_limit = Number(data?.daily_limit) || 3;
        form.cooldown_seconds =
          data?.cooldown_seconds === 0 ? 0 : Number(data?.cooldown_seconds) || 60;
      }
    } finally {
      loading.value = false;
    }
  }

  async function handleSave() {
    if (!formRef.value) return;
    formRef.value.validate(async (valid: boolean) => {
      if (!valid) return;
      saving.value = true;
      try {
        const { code } = await updateLogoutSetting({
          enabled: form.enabled,
          daily_limit: form.daily_limit,
          cooldown_seconds: form.cooldown_seconds
        });
        if (code === 0) {
          message("保存成功", { type: "success" });
        }
      } finally {
        saving.value = false;
      }
    });
  }

  onMounted(() => {
    loadSetting();
  });

  return {
    loading,
    saving,
    formRef,
    form,
    rules,
    loadSetting,
    handleSave
  };
}