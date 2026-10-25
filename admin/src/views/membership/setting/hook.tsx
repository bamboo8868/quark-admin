import { message } from "@/utils/message";
import { getMemberSetting, updateMemberSetting } from "@/api/config";
import { ref, reactive, onMounted } from "vue";

export function useMembershipSetting() {
  const loading = ref(false);
  const saving = ref(false);
  const formRef = ref();

  /** Setting form */
  const form = reactive({
    daily_game_limit: 10,
    customer_service_link: ""
  });

  const rules = {
    daily_game_limit: [
      {
        required: true,
        message: "请输入每天可查看的游戏款数",
        trigger: "blur"
      }
    ],
    customer_service_link: [
      {
        validator: (_rule: any, value: string, callback: Function) => {
          if (value && !/^https?:\/\//i.test(value.trim())) {
            callback(new Error("请输入以 http:// 或 https:// 开头的链接"));
          } else {
            callback();
          }
        },
        trigger: "blur"
      }
    ]
  };

  async function loadSetting() {
    loading.value = true;
    try {
      const { code, data } = await getMemberSetting();
      if (code === 0) {
        form.daily_game_limit = Number(data?.daily_game_limit) || 10;
        form.customer_service_link = data?.customer_service_link || "";
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
        const { code } = await updateMemberSetting({
          daily_game_limit: form.daily_game_limit,
          customer_service_link: form.customer_service_link.trim()
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
