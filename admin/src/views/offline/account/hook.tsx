import { message } from "@/utils/message";
import { addDialog } from "@/components/ReDialog";
import {
  getOfflineAccountList,
  createOfflineAccount,
  updateOfflineAccount,
  deleteOfflineAccount,
  batchDeleteOfflineAccounts,
  getAllOfflineGames,
  getAllOfflineVersions,
  importOfflineAccounts
} from "@/api/offline";
import { ref, reactive, onMounted, h, defineComponent } from "vue";
import type { PaginationProps } from "@pureadmin/table";

const statusMap: Record<number, { label: string; type: string }> = {
  0: { label: "禁用", type: "info" },
  1: { label: "可用", type: "success" },
  2: { label: "已兑换", type: "warning" }
};

export function useOfflineAccount() {
  const loading = ref(false);
  const formRef = ref();
  const accFormRef = ref();

  /** Selected rows for batch delete */
  const selectedRows = ref([]);

  /** Game & version options */
  const gameOptions = ref([]);
  const versionOptions = ref([]);
  const searchVersionOptions = ref([]);

  /** Search form */
  const form = reactive({
    account: "",
    game_id: null as number | null,
    version_id: null as number | null,
    status: null as number | null
  });

  /** Pagination */
  const pagination = reactive<PaginationProps>({
    total: 0,
    pageSize: 50,
    currentPage: 1,
    background: true
  });

  /** Data list */
  const dataList = ref([]);

  /** Table columns */
  const columns: TableColumnList = [
    {
      type: "selection",
      align: "left",
      width: 50
    },
    {
      label: "ID",
      prop: "id",
      minWidth: 70
    },
    {
      label: "所属游戏",
      prop: "game_name",
      minWidth: 140
    },
    {
      label: "版本",
      prop: "version_name",
      minWidth: 120
    },
    {
      label: "账号",
      prop: "account",
      minWidth: 150
    },
    {
      label: "密码",
      prop: "password",
      minWidth: 130,
      showOverflowTooltip: true
    },
    {
      label: "动态码",
      prop: "totp_code",
      minWidth: 100
    },
    {
      label: "状态",
      prop: "status",
      minWidth: 90,
      cellRenderer: ({ row }: any) => {
        const info = statusMap[row.status] || { label: "未知", type: "info" };
        return <el-tag type={info.type as any}>{info.label}</el-tag>;
      }
    },
    {
      label: "已绑定CDK",
      prop: "bound_cdk_count",
      minWidth: 110,
      cellRenderer: ({ row }: any) => (
        <el-tag
          effect="plain"
          type={(row.bound_cdk_count > 0 ? "primary" : "info") as any}
        >
          {`${row.bound_cdk_count ?? 0} 个`}
        </el-tag>
      )
    },
    {
      label: "创建时间",
      prop: "created_at",
      minWidth: 170,
      formatter: ({ created_at }) =>
        created_at ? new Date(created_at).toLocaleString("zh-CN") : ""
    },
    {
      label: "操作",
      fixed: "right",
      width: 180,
      slot: "operation"
    }
  ];

  async function loadGameOptions() {
    try {
      const { code, data } = await getAllOfflineGames();
      if (code === 0) {
        gameOptions.value = (data || []).map((g: any) => ({
          label: g.name,
          value: g.id
        }));
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function loadVersionOptions(gameId?: number) {
    try {
      const { code, data } = await getAllOfflineVersions(gameId);
      if (code === 0) {
        const opts = (data || []).map((v: any) => ({
          label: v.name,
          value: v.id
        }));
        versionOptions.value = opts;
        searchVersionOptions.value = opts;
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleGameChange(gameId: number | null) {
    form.version_id = null;
    if (gameId) {
      const { code, data } = await getAllOfflineVersions(gameId);
      if (code === 0) {
        searchVersionOptions.value = (data || []).map((v: any) => ({
          label: v.name,
          value: v.id
        }));
      }
    } else {
      searchVersionOptions.value = [];
    }
  }

  async function onSearch() {
    loading.value = true;
    try {
      const { code, data } = await getOfflineAccountList({
        ...form,
        page: pagination.currentPage,
        limit: pagination.pageSize
      });
      if (code === 0) {
        dataList.value = data?.list || [];
        pagination.total = data?.total || 0;
      }
    } finally {
      loading.value = false;
    }
  }

  const resetForm = (formEl: any) => {
    if (!formEl) return;
    formEl.resetFields();
    form.account = "";
    form.game_id = null;
    form.version_id = null;
    form.status = null;
    searchVersionOptions.value = [];
    pagination.currentPage = 1;
    onSearch();
  };

  function handleSizeChange(val: number) {
    pagination.pageSize = val;
    onSearch();
  }

  function handleCurrentChange(val: number) {
    pagination.currentPage = val;
    onSearch();
  }

  function handleSelectionChange(rows: any[]) {
    selectedRows.value = rows;
  }

  async function handleBatchDelete() {
    if (selectedRows.value.length === 0) {
      message("请选择要删除的账号", { type: "warning" });
      return;
    }
    const ids = selectedRows.value.map((r: any) => r.id);
    const { code } = await batchDeleteOfflineAccounts(ids);
    if (code === 0) {
      message("批量删除成功", { type: "success" });
      onSearch();
    }
  }

  function openDialog(title = "新增", row?: any) {
    const isEdit = title === "修改";
    addDialog({
      title: `${title}账号`,
      props: {
        formInline: {
          game_id: row?.game_id ?? null,
          version_id: row?.version_id ?? null,
          account: row?.account ?? "",
          password: row?.password ?? "",
          code: row?.code ?? "",
          status: row?.status ?? 1
        }
      },
      width: "35%",
      draggable: true,
      closeOnClickModal: false,
      contentRenderer: () =>
        h(AccountFormComponent, {
          ref: accFormRef,
          formInline: null,
          gameOptions: gameOptions.value
        }),
      beforeSure: async (done, { options }) => {
        const FormRef = accFormRef.value.getRef();
        const curData = options.props.formInline;
        FormRef.validate(async (valid: boolean) => {
          if (valid) {
            if (isEdit) {
              const { code } = await updateOfflineAccount(row.id, curData);
              if (code === 0) {
                message("修改成功", { type: "success" });
                done();
                onSearch();
              }
            } else {
              const { code } = await createOfflineAccount(curData);
              if (code === 0) {
                message("新增成功", { type: "success" });
                done();
                onSearch();
              }
            }
          }
        });
      }
    });
  }

  async function handleDelete(row: any) {
    const { code } = await deleteOfflineAccount(row.id);
    if (code === 0) {
      message("删除成功", { type: "success" });
      onSearch();
    }
  }

  /** Import accounts from JSON/maFile files (SDA format) */
  const importLoading = ref(false);
  const importSelectRef = ref();

  function handleImport() {
    addDialog({
      title: "选择所属游戏和版本",
      width: "35%",
      draggable: true,
      closeOnClickModal: false,
      contentRenderer: () =>
        h(ImportSelectComponent, {
          ref: importSelectRef,
          gameOptions: gameOptions.value
        }),
      beforeSure: async (done) => {
        const formData = importSelectRef.value?.getFormData();
        if (!formData?.game_id) {
          message("请选择游戏", { type: "warning" });
          return;
        }
        if (!formData?.version_id) {
          message("请选择版本", { type: "warning" });
          return;
        }
        done();
        openFilePicker(formData.game_id, formData.version_id);
      }
    });
  }

  function openFilePicker(gameId: number, versionId: number) {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = ".json,.mafile";
    input.onchange = async (e: Event) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files || files.length === 0) return;

      importLoading.value = true;
      try {
        const allItems: any[] = [];
        const errors: string[] = [];

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          try {
            const text = await file.text();
            const json = JSON.parse(text);
            const items = Array.isArray(json) ? json : json.accounts || [json];
            allItems.push(...items);
          } catch (err: any) {
            errors.push(`${file.name}: ${err?.message || "JSON 解析失败"}`);
          }
        }

        if (errors.length > 0) {
          message(`部分文件解析失败: ${errors.join("; ")}`, { type: "warning" });
        }

        if (allItems.length === 0) {
          message("所选文件中没有有效数据", { type: "warning" });
          return;
        }

        const { code, message: msg } = await importOfflineAccounts(gameId, versionId, allItems);
        if (code === 0) {
          message(msg || `成功导入 ${allItems.length} 条数据`, { type: "success" });
          onSearch();
        } else {
          message(msg || "导入失败", { type: "error" });
        }
      } catch (err: any) {
        message(err?.message || "文件处理失败", { type: "error" });
      } finally {
        importLoading.value = false;
      }
    };
    input.click();
  }

  onMounted(() => {
    loadGameOptions();
    onSearch();
  });

  return {
    loading,
    form,
    formRef,
    dataList,
    columns,
    pagination,
    gameOptions,
    searchVersionOptions,
    selectedRows,
    statusMap,
    onSearch,
    resetForm,
    handleSizeChange,
    handleCurrentChange,
    handleSelectionChange,
    handleBatchDelete,
    handleGameChange,
    openDialog,
    handleDelete,
    importLoading,
    handleImport
  };
}

/** Account form component with game->version cascade */
const AccountFormComponent = defineComponent({
  name: "OfflineAccountForm",
  props: {
    formInline: {
      type: Object,
      default: () => ({})
    },
    gameOptions: {
      type: Array,
      default: () => []
    }
  },
  setup(props, { expose }) {
    const formRef = ref();
    const localVersionOptions = ref<any[]>([]);

    const rules = {
      game_id: [{ required: true, message: "请选择所属游戏", trigger: "change" }],
      version_id: [{ required: true, message: "请选择所属版本", trigger: "change" }],
      account: [{ required: true, message: "请输入游戏账号", trigger: "blur" }]
    };

    async function loadVersionOptions(gameId: number | null) {
      if (!gameId) {
        localVersionOptions.value = [];
        return;
      }
      const { code, data } = await getAllOfflineVersions(gameId);
      if (code === 0) {
        localVersionOptions.value = (data || []).map((v: any) => ({
          label: v.name,
          value: v.id
        }));
      }
    }

    async function onGameChange(gameId: number | null) {
      (props.formInline as any).version_id = null;
      localVersionOptions.value = [];
      await loadVersionOptions(gameId);
    }

    // Load version options when editing — keep the existing version_id selected
    if ((props.formInline as any)?.game_id) {
      loadVersionOptions((props.formInline as any).game_id);
    }

    const getRef = () => formRef.value;
    expose({ getRef });

    return () => (
      <el-form
        ref={formRef}
        model={props.formInline}
        rules={rules}
        label-width="90px"
      >
        <el-form-item label="所属游戏" prop="game_id">
          <el-select
            v-model={(props.formInline as any).game_id}
            placeholder="请选择游戏"
            clearable
            filterable
            style="width: 100%"
            onChange={onGameChange}
          >
            {(props.gameOptions as any[]).map((opt: any) => (
              <el-option key={opt.value} label={opt.label} value={opt.value} />
            ))}
          </el-select>
        </el-form-item>
        <el-form-item label="所属版本" prop="version_id">
          <el-select
            v-model={(props.formInline as any).version_id}
            placeholder="请选择版本"
            clearable
            filterable
            style="width: 100%"
          >
            {localVersionOptions.value.map((opt: any) => (
              <el-option key={opt.value} label={opt.label} value={opt.value} />
            ))}
          </el-select>
        </el-form-item>
        <el-form-item label="游戏账号" prop="account">
          <el-input
            v-model={(props.formInline as any).account}
            placeholder="请输入游戏账号"
          />
        </el-form-item>
        <el-form-item label="游戏密码" prop="password">
          <el-input
            v-model={(props.formInline as any).password}
            placeholder="请输入游戏密码"
          />
        </el-form-item>
        <el-form-item label="动态码" prop="code">
          <el-input
            v-model={(props.formInline as any).code}
            placeholder="请输入动态验证码(shared_secret)"
          />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model={(props.formInline as any).status}>
            <el-radio value={1}>可用</el-radio>
            <el-radio value={0}>禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
    );
  }
});

/** Import select component: game + version */
const ImportSelectComponent = defineComponent({
  name: "OfflineImportSelect",
  props: {
    gameOptions: {
      type: Array,
      default: () => []
    }
  },
  setup(props, { expose }) {
    const formRef = ref();
    const formInline = reactive({
      game_id: null as number | null,
      version_id: null as number | null
    });
    const localVersionOptions = ref<any[]>([]);

    async function onGameChange(gameId: number | null) {
      formInline.version_id = null;
      localVersionOptions.value = [];
      if (gameId) {
        const { code, data } = await getAllOfflineVersions(gameId);
        if (code === 0) {
          localVersionOptions.value = (data || []).map((v: any) => ({
            label: v.name,
            value: v.id
          }));
        }
      }
    }

    expose({
      getRef: () => formRef.value,
      getFormData: () => formInline
    });

    return () => (
      <el-form ref={formRef} model={formInline} label-width="90px">
        <el-form-item label="所属游戏" prop="game_id">
          <el-select
            v-model={formInline.game_id}
            placeholder="请选择游戏"
            filterable
            style="width: 100%"
            onChange={onGameChange}
          >
            {(props.gameOptions as any[]).map((opt: any) => (
              <el-option key={opt.value} label={opt.label} value={opt.value} />
            ))}
          </el-select>
        </el-form-item>
        <el-form-item label="所属版本" prop="version_id">
          <el-select
            v-model={formInline.version_id}
            placeholder="请选择版本"
            filterable
            style="width: 100%"
          >
            {localVersionOptions.value.map((opt: any) => (
              <el-option key={opt.value} label={opt.label} value={opt.value} />
            ))}
          </el-select>
        </el-form-item>
      </el-form>
    );
  }
});
