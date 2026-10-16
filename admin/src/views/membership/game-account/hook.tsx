import { message } from "@/utils/message";
import { addDialog } from "@/components/ReDialog";
import {
  getGameAccMgrList,
  createGameAccMgr,
  updateGameAccMgr,
  deleteGameAccMgr,
  importGameAccMgrSda
} from "@/api/gameAccMgr";
import { getGameList } from "@/api/game";
import { GameAccFormComponent } from "../components/gameAccForm";
import { ref, reactive, onMounted, h } from "vue";
import type { PaginationProps } from "@pureadmin/table";

export function useGameAccount() {
  const loading = ref(false);
  const formRef = ref();
  const accFormRef = ref();

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
      label: "ID",
      prop: "id",
      minWidth: 70
    },
    {
      label: "游戏",
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
      label: "密钥",
      prop: "secret",
      minWidth: 120,
      showOverflowTooltip: true
    },
    {
      label: "等级",
      prop: "level",
      minWidth: 80
    },
    {
      label: "平台",
      prop: "platform",
      minWidth: 100
    },
    {
      label: "状态",
      prop: "status",
      minWidth: 90,
      cellRenderer: ({ row }) => (
        <el-tag type={row.status === 1 ? "success" : "danger"} effect="plain">
          {row.status === 1 ? "启用" : "禁用"}
        </el-tag>
      )
    },
    {
      label: "备注",
      prop: "remark",
      minWidth: 150,
      showOverflowTooltip: true
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
      width: 160,
      slot: "operation"
    }
  ];

  /** Fetch list */
  async function onSearch() {
    loading.value = true;
    try {
      const { code, data } = await getGameAccMgrList({
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

  /** Load game options */
  async function loadGameOptions() {
    try {
      const res = await getGameList({ page: 1, limit: 200 });
      if (res.code === 0) {
        gameOptions.value = (res.data?.list || []).map(g => ({
          label: g.name,
          value: g.id
        }));
      }
    } catch (e) {
      console.error(e);
    }
  }

  /** Reset search form */
  const resetForm = (formEl: any) => {
    if (!formEl) return;
    formEl.resetFields();
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

  /** Open dialog */
  function openDialog(title = "新增", row?: any) {
    const isEdit = title === "修改";
    addDialog({
      title: `${title}游戏账号`,
      props: {
        formInline: {
          game_id: row?.game_id ?? null,
          account: row?.account ?? "",
          password: row?.password ?? "",
          secret: row?.secret ?? "",
          level: row?.level ?? 0,
          platform: row?.platform ?? "",
          status: row?.status ?? 1,
          remark: row?.remark ?? ""
        }
      },
      width: "50%",
      draggable: true,
      closeOnClickModal: false,
      contentRenderer: () =>
        h(GameAccFormComponent, {
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
              const { code } = await updateGameAccMgr(row.id, curData);
              if (code === 0) {
                message("修改成功", { type: "success" });
                done();
                onSearch();
              }
            } else {
              const { code } = await createGameAccMgr(curData);
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

  /** Delete */
  async function handleDelete(row: any) {
    const { code } = await deleteGameAccMgr(row.id);
    if (code === 0) {
      message("删除成功", { type: "success" });
      onSearch();
    }
  }

  /** Import SDA/maFile — 与租号导入一致：按 account_name 全局绑定
   *  已存在游戏账号的密钥，未匹配的直接跳过不新增 */
  const importLoading = ref(false);

  function handleImport() {
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
            errors.push(`${file.name}: ${err?.message || "解析失败"}`);
          }
        }

        if (errors.length > 0) {
          message(`部分文件解析失败: ${errors.join("; ")}`, { type: "warning" });
        }

        if (allItems.length === 0) {
          message("所选文件中没有有效数据", { type: "warning" });
          return;
        }

        const { code, message: msg } = await importGameAccMgrSda(allItems);
        if (code === 0) {
          message(msg || `成功绑定 ${allItems.length} 条数据`, { type: "success" });
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
    onSearch,
    resetForm,
    handleSizeChange,
    handleCurrentChange,
    openDialog,
    handleDelete,
    importLoading,
    handleImport
  };
}
