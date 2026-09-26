import { message } from "@/utils/message";
import {
  getOfflineLogList,
  deleteOfflineLog,
  getAllOfflineGames,
  getAllOfflineVersions,
  updateOfflineCdk
} from "@/api/offline";
import { ref, reactive, onMounted } from "vue";
import type { PaginationProps } from "@pureadmin/table";

const cdkStatusMap: Record<number, { label: string; type: string }> = {
  0: { label: "未使用", type: "success" },
  1: { label: "已使用", type: "warning" },
  2: { label: "已过期", type: "danger" },
  3: { label: "已禁用", type: "info" }
};

export function useOfflineLog() {
  const loading = ref(false);
  const formRef = ref();

  /** Game & version options for dropdown */
  const gameOptions = ref([]);
  const versionOptions = ref([]);

  /** Search form */
  const form = reactive({
    game_id: null as number | null,
    version_id: null as number | null,
    cdk_code: "",
    username: ""
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
      minWidth: 60
    },
    {
      label: "游戏名称",
      prop: "game_name",
      minWidth: 130
    },
    {
      label: "版本名称",
      prop: "version_name",
      minWidth: 110
    },
    {
      label: "CDK码",
      prop: "cdk_code",
      minWidth: 170
    },
    {
      label: "使用账号",
      prop: "account",
      minWidth: 140
    },
    {
      label: "操作人",
      prop: "username",
      minWidth: 100
    },
    {
      label: "是否使用",
      prop: "cdk_status",
      minWidth: 90,
      cellRenderer: ({ row }: any) => {
        const status = row.cdk_status;
        if (status === undefined || status === null) {
          return <el-tag type="info" size="small">未知</el-tag>;
        }
        const info = cdkStatusMap[status] || { label: "未知", type: "info" };
        return <el-tag type={info.type as any} size="small">{info.label}</el-tag>;
      }
    },
    {
      label: "IP地址",
      prop: "ip",
      minWidth: 130
    },
    {
      label: "操作时间",
      prop: "created_at",
      minWidth: 170,
      formatter: ({ created_at }) =>
        created_at ? new Date(created_at).toLocaleString("zh-CN") : ""
    },
    {
      label: "操作",
      fixed: "right",
      width: 150,
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
        versionOptions.value = (data || []).map((v: any) => ({
          label: v.name,
          value: v.id
        }));
      }
    } catch (e) {
      console.error(e);
    }
  }

  function onGameChange(val: number | null) {
    form.version_id = null;
    if (val) {
      loadVersionOptions(val);
    } else {
      versionOptions.value = [];
    }
  }

  async function onSearch() {
    loading.value = true;
    try {
      const payload: any = {
        game_id: form.game_id,
        version_id: form.version_id,
        cdk_code: form.cdk_code,
        username: form.username,
        page: pagination.currentPage,
        limit: pagination.pageSize
      };
      const { code, data } = await getOfflineLogList(payload);
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
    form.game_id = null;
    form.version_id = null;
    form.cdk_code = "";
    form.username = "";
    versionOptions.value = [];
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

  async function handleDelete(row: any) {
    const { code } = await deleteOfflineLog(row.id);
    if (code === 0) {
      message("删除成功", { type: "success" });
      onSearch();
    }
  }

  /** Toggle CDK disable status from log row */
  async function handleToggleCdkStatus(row: any) {
    const cdkId = row.cdk_id;
    if (!cdkId) {
      message("CDK关联信息缺失", { type: "warning" });
      return;
    }
    const currentStatus = row.cdk_status;
    const isDisabling = currentStatus !== 3;
    const newStatus = isDisabling ? 3 : (row.used_by ? 1 : 0);
    const actionText = isDisabling ? "禁用" : "启用";

    try {
      const { code } = await updateOfflineCdk(cdkId, { status: newStatus });
      if (code === 0) {
        message(`CDK${actionText}成功`, { type: "success" });
        onSearch();
      }
    } catch (err: any) {
      message(err?.message || `${actionText}失败`, { type: "error" });
    }
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
    versionOptions,
    onGameChange,
    onSearch,
    resetForm,
    handleSizeChange,
    handleCurrentChange,
    handleDelete,
    handleToggleCdkStatus
  };
}
