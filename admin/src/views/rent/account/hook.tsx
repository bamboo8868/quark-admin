import { message } from "@/utils/message";
import { addDialog } from "@/components/ReDialog";
import {
  getRentAccountList,
  createRentAccount,
  updateRentAccount,
  deleteRentAccount,
  batchDeleteRentAccounts,
  getAllRentGames,
  importRentAccounts
} from "@/api/rent";
import { ref, reactive, onMounted, h, defineComponent } from "vue";
import type { PaginationProps } from "@pureadmin/table";

const statusMap: Record<number, { label: string; type: string }> = {
  0: { label: "禁用", type: "info" },
  1: { label: "可用", type: "success" },
  2: { label: "已出租", type: "warning" }
};

export function useRentAccount() {
  const loading = ref(false);
  const formRef = ref();
  const accFormRef = ref();

  /** Selected rows for batch delete */
  const selectedRows = ref([]);

  /** Game options for dropdown */
  const gameOptions = ref([]);

  /** Search form */
  const form = reactive({
    account: "",
    game_id: null as number | null,
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
      label: "出租起始",
      prop: "rent_start_at",
      minWidth: 170,
      cellRenderer: ({ row }: any) => {
        if (!row.rent_start_at) return <span>-</span>;
        return <span>{new Date(row.rent_start_at).toLocaleString("zh-CN")}</span>;
      }
    },
    {
      label: "出租结束",
      prop: "rent_end_at",
      minWidth: 170,
      cellRenderer: ({ row }: any) => {
        if (!row.rent_end_at) return <span>-</span>;
        const expireDate = new Date(row.rent_end_at);
        const isExpired = expireDate < new Date();
        return (
          <span class={isExpired ? "text-red-500" : "text-blue-500"}>
            {expireDate.toLocaleString("zh-CN")}
          </span>
        );
      }
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
      const { code, data } = await getAllRentGames();
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

  async function onSearch() {
    loading.value = true;
    try {
      const { code, data } = await getRentAccountList({
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
    form.status = null;
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
    const { code } = await batchDeleteRentAccounts(ids);
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
          account: row?.account ?? "",
          password: row?.password ?? "",
          code: row?.code ?? "",
          status: row?.status ?? 1
        },
        gameOptions: gameOptions.value
      },
      width: "30%",
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
              const { code } = await updateRentAccount(row.id, curData);
              if (code === 0) {
                message("修改成功", { type: "success" });
                done();
                onSearch();
              }
            } else {
              const { code } = await createRentAccount(curData);
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
    const { code } = await deleteRentAccount(row.id);
    if (code === 0) {
      message("删除成功", { type: "success" });
      onSearch();
    }
  }

  /** Import JSON (SDA format) */
  const importLoading = ref(false);
  const gameSelectRef = ref();

  function handleImport() {
    // Show game selection dialog first
    addDialog({
      title: "选择所属游戏",
      width: "30%",
      draggable: true,
      closeOnClickModal: false,
      contentRenderer: () =>
        h(GameSelectComponent, {
          ref: gameSelectRef,
          gameOptions: gameOptions.value
        }),
      beforeSure: async (done) => {
        const formData = gameSelectRef.value?.getFormData();
        const selectedGameId = formData?.game_id;
        if (!selectedGameId) {
          message("请选择游戏", { type: "warning" });
          return;
        }
        done();
        // Open file picker after dialog closes
        openFilePicker(selectedGameId);
      }
    });
  }

  function openFilePicker(gameId: number) {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = ".json";
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
            // Support both array and object-with-accounts format
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

        const { code, message: msg } = await importRentAccounts(gameId, allItems);
        if (code === 0) {
          message(
            msg || `成功导入 ${allItems.length} 条数据（共 ${files.length} 个文件）`,
            { type: "success" }
          );
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
    selectedRows,
    statusMap,
    onSearch,
    resetForm,
    handleSizeChange,
    handleCurrentChange,
    handleSelectionChange,
    handleBatchDelete,
    openDialog,
    handleDelete,
    importLoading,
    handleImport
  };
}

/** Account form component for dialog */
const AccountFormComponent = defineComponent({
  name: "RentAccountForm",
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
    const rules = {
      game_id: [
        { required: true, message: "请选择所属游戏", trigger: "change" }
      ],
      account: [
        { required: true, message: "请输入游戏账号", trigger: "blur" }
      ]
    };

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
            v-model={props.formInline.game_id}
            placeholder="请选择游戏"
            clearable
            filterable
            style="width: 100%"
          >
            {(props.gameOptions as any[]).map((opt: any) => (
              <el-option key={opt.value} label={opt.label} value={opt.value} />
            ))}
          </el-select>
        </el-form-item>
        <el-form-item label="游戏账号" prop="account">
          <el-input
            v-model={props.formInline.account}
            placeholder="请输入游戏账号"
          />
        </el-form-item>
        <el-form-item label="游戏密码" prop="password">
          <el-input
            v-model={props.formInline.password}
            placeholder="请输入游戏密码"
          />
        </el-form-item>
        <el-form-item label="动态码" prop="code">
          <el-input
            v-model={props.formInline.code}
            placeholder="请输入动态验证码(可选)"
          />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model={props.formInline.status}>
            <el-radio value={1}>可用</el-radio>
            <el-radio value={0}>禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
    );
  }
});

/** Game select component for import dialog */
const GameSelectComponent = defineComponent({
  name: "GameSelectForm",
  props: {
    gameOptions: {
      type: Array,
      default: () => []
    }
  },
  setup(props, { expose }) {
    const formRef = ref();
    const formInline = reactive({
      game_id: null as number | null
    });

    expose({
      getRef: () => formRef.value,
      getFormData: () => formInline
    });

    return () => (
      <el-form ref={formRef} model={formInline} label-width="90px">
        <el-form-item label="所属游戏" prop="game_id" rules={[{ required: true, message: "请选择游戏", trigger: "change" }]}>
          <el-select
            v-model={formInline.game_id}
            placeholder="请选择游戏"
            filterable
            style="width: 100%"
          >
            {(props.gameOptions as any[]).map((opt: any) => (
              <el-option key={opt.value} label={opt.label} value={opt.value} />
            ))}
          </el-select>
        </el-form-item>
      </el-form>
    );
  }
});
