import { message } from "@/utils/message";
import { getPurchaseLink, updatePurchaseLink } from "@/api/config";
import { ref, reactive, onMounted } from "vue";

export function useConfigPurchase() {
  const loading = ref(false);
  const saving = ref(false);
  const formRef = ref();

  /** Setting form */
  const form = reactive({
    purchase_link: ""
  });

  const rules = {
    purchase_link: [
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
      const { code, data } = await getPurchaseLink();
      if (code === 0) {
        form.purchase_link = data?.purchase_link || "";
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
        const { code } = await updatePurchaseLink({
          purchase_link: form.purchase_link.trim()
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
