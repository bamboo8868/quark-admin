import { message } from "@/utils/message";
import {
  getRentLogList,
  deleteRentLog,
  getAllRentGames
} from "@/api/rent";
import { ref, reactive, onMounted } from "vue";
import type { PaginationProps } from "@pureadmin/table";

const cdkStatusMap: Record<number, { label: string; type: string }> = {
  0: { label: "未使用", type: "success" },
  1: { label: "已使用", type: "warning" },
  2: { label: "已过期", type: "danger" }
};

const actionMap: Record<string, { label: string; type: string }> = {
  redeem: { label: "兑换", type: "primary" },
  renew: { label: "续租", type: "warning" }
};

export function useRentLog() {
  const loading = ref(false);
  const formRef = ref();

  /** Game options for dropdown */
  const gameOptions = ref([]);

  /** Search form */
  const form = reactive({
    cdk_code: "",
    account: "",
    game_id: null as number | null
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
      label: "时长(小时)",
      prop: "rent_hours",
      minWidth: 90
    },
    {
      label: "类型",
      prop: "action",
      minWidth: 80,
      cellRenderer: ({ row }: any) => {
        const info = actionMap[row.action] || { label: row.action, type: "info" };
        return <el-tag type={info.type as any} size="small">{info.label}</el-tag>;
      }
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
      label: "使用时间",
      prop: "used_at",
      minWidth: 170,
      cellRenderer: ({ row }: any) => {
        if (!row.used_at) return <span>-</span>;
        return <span>{new Date(row.used_at).toLocaleString("zh-CN")}</span>;
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
      width: 100,
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
      const payload: any = {
        game_id: form.game_id,
        cdk_code: form.cdk_code,
        account: form.account,
        page: pagination.currentPage,
        limit: pagination.pageSize
      };
      const { code, data } = await getRentLogList(payload);
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
    form.cdk_code = "";
    form.account = "";
    form.game_id = null;
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
    const { code } = await deleteRentLog(row.id);
    if (code === 0) {
      message("删除成功", { type: "success" });
      onSearch();
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
    onSearch,
    resetForm,
    handleSizeChange,
    handleCurrentChange,
    handleDelete
  };
}
