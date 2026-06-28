import { message } from "@/utils/message";
import {
  getMemberCdkLogList,
  deleteMemberCdkLog
} from "@/api/memberCdk";
import { ref, reactive, onMounted } from "vue";
import type { PaginationProps } from "@pureadmin/table";

/** Member level map */
const levelMap: Record<number, { label: string; type: string }> = {
  1: { label: "青铜", type: "warning" },
  2: { label: "黄金", type: "success" }
};

const cdkStatusMap: Record<number, { label: string; type: string }> = {
  0: { label: "禁用", type: "info" },
  1: { label: "可用", type: "success" },
  2: { label: "已使用", type: "danger" }
};

const actionMap: Record<string, { label: string; type: string }> = {
  redeem: { label: "兑换", type: "primary" },
  renew: { label: "续费", type: "warning" }
};

export function useMemberCdkLog() {
  const loading = ref(false);
  const formRef = ref();

  /** Search form */
  const form = reactive({
    cdk_code: "",
    member_name: "",
    member_level: null as number | null,
    action: null as string | null
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
      label: "CDK码",
      prop: "cdk_code",
      minWidth: 180
    },
    {
      label: "会员名称",
      prop: "member_name",
      minWidth: 120
    },
    {
      label: "会员等级",
      prop: "member_level",
      minWidth: 90,
      cellRenderer: ({ row }: any) => {
        const info = levelMap[row.member_level] || { label: "未知", type: "info" };
        return <el-tag type={info.type as any} size="small">{info.label}</el-tag>;
      }
    },
    {
      label: "时长(月)",
      prop: "duration_months",
      minWidth: 80
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
      label: "CDK状态",
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

  async function onSearch() {
    loading.value = true;
    try {
      const payload: any = {
        cdk_code: form.cdk_code,
        member_name: form.member_name,
        member_level: form.member_level,
        action: form.action,
        page: pagination.currentPage,
        limit: pagination.pageSize
      };
      const { code, data } = await getMemberCdkLogList(payload);
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
    form.member_name = "";
    form.member_level = null;
    form.action = null;
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
    const { code } = await deleteMemberCdkLog(row.id);
    if (code === 0) {
      message("删除成功", { type: "success" });
      onSearch();
    }
  }

  onMounted(() => {
    onSearch();
  });

  return {
    loading,
    form,
    formRef,
    dataList,
    columns,
    pagination,
    levelMap,
    actionMap,
    onSearch,
    resetForm,
    handleSizeChange,
    handleCurrentChange,
    handleDelete
  };
}
