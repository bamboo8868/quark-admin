import dayjs from "dayjs";
import {
  getEmailAccounts,
  getEmails,
  getEmailDetail
} from "@/api/email";
import { reactive, ref, onMounted, onUnmounted, watch } from "vue";
import type { PaginationProps } from "@pureadmin/table";

export function useMail() {
  const loading = ref(false);
  const accountList = ref([]);
  const selectedAccountId = ref<number | null>(null);

  /** Search form */
  const form = reactive({
    subject: "",
    gameAccount: ""
  });

  /** Pagination */
  const pagination = reactive<PaginationProps>({
    total: 0,
    pageSize: 50,
    currentPage: 1,
    background: true
  });

  /** Email list data */
  const dataList = ref([]);

  /** HTML viewer dialog */
  const htmlDialogVisible = ref(false);
  const htmlDialogTitle = ref("");
  const htmlContent = ref("");

  /** Auto refresh */
  const autoRefreshInterval = ref(0); // 0 = disabled, in seconds
  let autoRefreshTimer: ReturnType<typeof setInterval> | null = null;

  /** Start auto refresh timer */
  function startAutoRefresh() {
    stopAutoRefresh();
    if (autoRefreshInterval.value > 0) {
      autoRefreshTimer = setInterval(() => {
        onSearch();
      }, autoRefreshInterval.value * 1000);
    }
  }

  /** Stop auto refresh timer */
  function stopAutoRefresh() {
    if (autoRefreshTimer) {
      clearInterval(autoRefreshTimer);
      autoRefreshTimer = null;
    }
  }

  /** Watch interval changes */
  watch(autoRefreshInterval, () => {
    startAutoRefresh();
  });

  /** Email table columns */
  const columns: TableColumnList = [
    {
      label: "日期",
      prop: "date",
      minWidth: 180,
      formatter: ({ date }) =>
        date ? dayjs(date).format("YYYY-MM-DD HH:mm:ss") : ""
    },
    {
      label: "账号",
      prop: "gameAccount",
      minWidth: 150,
      formatter: ({ gameAccount }) => gameAccount || "-"
    },
    {
      label: "验证码",
      prop: "code",
      minWidth: 120,
      formatter: ({ code }) => code || "-"
    },
    {
      label: "主题",
      prop: "subject",
      minWidth: 300
    },
    {
      label: "状态",
      prop: "flags",
      minWidth: 80,
      formatter: ({ flags }) => {
        if (!flags || !flags.length) return "";
        return flags.includes("\\Seen") ? "已读" : "未读";
      }
    },
    {
      label: "操作",
      fixed: "right",
      width: 120,
      slot: "operation"
    }
  ];

  /** View email raw HTML */
  async function handleViewHtml(row: any) {
    const { code, data } = await getEmailDetail(row.id);
    if (code === 0 && data) {
      htmlDialogTitle.value = data.subject || "邮件详情";
      htmlContent.value = data.bodyHtml || "(无HTML内容)";
      htmlDialogVisible.value = true;
    }
  }

  /** Fetch email accounts (for dropdown) */
  async function loadAccounts() {
    const { code, data } = await getEmailAccounts();
    if (code === 0) {
      accountList.value = data;
      // Default: query all accounts on load
      onSearch();
    }
  }

  /** Search emails */
  async function onSearch() {
    loading.value = true;
    const { code, data } = await getEmails({
      accountId: selectedAccountId.value || undefined,
      limit: pagination.pageSize,
      page: pagination.currentPage,
      subject: form.subject || undefined,
      gameAccount: form.gameAccount || undefined
    });
    if (code === 0) {
      dataList.value = data.list;
      pagination.total = data.total;
      pagination.pageSize = data.pageSize;
      pagination.currentPage = data.currentPage;
    }
    loading.value = false;
  }

  /** Reset search form */
  const resetForm = (formEl: any) => {
    if (!formEl) return;
    formEl.resetFields();
    onSearch();
  };

  /** Page size change */
  function handleSizeChange(val: number) {
    pagination.pageSize = val;
    onSearch();
  }

  /** Current page change */
  function handleCurrentChange(val: number) {
    pagination.currentPage = val;
    onSearch();
  }

  /** Account dropdown change */
  function handleAccountChange(val: number) {
    selectedAccountId.value = val;
    pagination.currentPage = 1;
    onSearch();
  }

  onMounted(() => {
    loadAccounts();
  });

  onUnmounted(() => {
    stopAutoRefresh();
  });

  return {
    loading,
    form,
    accountList,
    selectedAccountId,
    dataList,
    columns,
    pagination,
    onSearch,
    resetForm,
    handleSizeChange,
    handleCurrentChange,
    handleAccountChange,
    htmlDialogVisible,
    htmlDialogTitle,
    htmlContent,
    handleViewHtml,
    autoRefreshInterval
  };
}
