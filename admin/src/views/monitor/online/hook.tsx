import dayjs from "dayjs";
import { message } from "@/utils/message";
import { getOnlineLogsList, forceOffline } from "@/api/system";
import { reactive, ref, onMounted, toRaw } from "vue";
import type { PaginationProps } from "@pureadmin/table";

export function useRole() {
  const form = reactive({
    username: ""
  });
  const dataList = ref([]);
  const loading = ref(true);
  const pagination = reactive<PaginationProps>({
    total: 0,
    pageSize: 10,
    currentPage: 1,
    background: true
  });
  const columns: TableColumnList = [
    {
      label: "\u5E8F\u53F7",
      prop: "id",
      minWidth: 60
    },
    {
      label: "\u7528\u6237\u540D",
      prop: "username",
      minWidth: 100
    },
    {
      label: "\u767B\u5F55 IP",
      prop: "ip",
      minWidth: 140
    },
    {
      label: "\u767B\u5F55\u5730\u70B9",
      prop: "address",
      minWidth: 140
    },
    {
      label: "\u64CD\u4F5C\u7CFB\u7EDF",
      prop: "system",
      minWidth: 100
    },
    {
      label: "\u6D4F\u89C8\u5668\u7C7B\u578B",
      prop: "browser",
      minWidth: 100
    },
    {
      label: "\u767B\u5F55\u65F6\u95F4",
      prop: "loginTime",
      minWidth: 180,
      formatter: ({ loginTime }) =>
        dayjs(loginTime).format("YYYY-MM-DD HH:mm:ss")
    },
    {
      label: "\u64CD\u4F5C",
      fixed: "right",
      slot: "operation"
    }
  ];

  function handleSizeChange(val: number) {
    pagination.pageSize = val;
    onSearch();
  }

  function handleCurrentChange(val: number) {
    pagination.currentPage = val;
    onSearch();
  }

  function handleSelectionChange(val) {
    console.log("handleSelectionChange", val);
  }

  async function handleOffline(row) {
    const { code } = await forceOffline(row.id);
    if (code === 0) {
      message(`${row.username}\u5DF2\u88AB\u5F3A\u5236\u4E0B\u7EBF`, { type: "success" });
      onSearch();
    }
  }

  async function onSearch() {
    loading.value = true;
    const { code, data } = await getOnlineLogsList({
      ...toRaw(form),
      page: pagination.currentPage,
      limit: pagination.pageSize
    });
    if (code === 0) {
      dataList.value = data.list;
      pagination.total = data.total;
      pagination.pageSize = data.pageSize;
      pagination.currentPage = data.currentPage;
    }
    loading.value = false;
  }

  const resetForm = formEl => {
    if (!formEl) return;
    formEl.resetFields();
    onSearch();
  };

  onMounted(() => {
    onSearch();
  });

  return {
    form,
    loading,
    columns,
    dataList,
    pagination,
    onSearch,
    resetForm,
    handleOffline,
    handleSizeChange,
    handleCurrentChange,
    handleSelectionChange
  };
}
