import dayjs from "dayjs";
import { message } from "@/utils/message";
import { getKeyList } from "@pureadmin/utils";
import { getOperationLogsList, batchDeleteOperationLogs, clearOperationLogs } from "@/api/system";
import { usePublicHooks } from "@/views/system/hooks";
import type { PaginationProps } from "@pureadmin/table";
import { type Ref, reactive, ref, onMounted, toRaw } from "vue";

export function useRole(tableRef: Ref) {
  const form = reactive({
    module: "",
    status: "",
    operatingTime: [] as string[]
  });
  const dataList = ref([]);
  const loading = ref(true);
  const selectedNum = ref(0);
  const { tagStyle } = usePublicHooks();

  const pagination = reactive<PaginationProps>({
    total: 0,
    pageSize: 10,
    currentPage: 1,
    background: true
  });
  const columns: TableColumnList = [
    {
      label: "勾选列", // 如果需要表格多选，此处label必须设置
      type: "selection",
      fixed: "left",
      reserveSelection: true // 数据刷新后保留选项
    },
    {
      label: "序号",
      prop: "id",
      minWidth: 90
    },
    {
      label: "操作人员",
      prop: "username",
      minWidth: 100
    },
    {
      label: "所属模块",
      prop: "module",
      minWidth: 140
    },
    {
      label: "操作概要",
      prop: "summary",
      minWidth: 140
    },
    {
      label: "操作 IP",
      prop: "ip",
      minWidth: 100
    },
    {
      label: "操作地点",
      prop: "address",
      minWidth: 140
    },
    {
      label: "操作系统",
      prop: "system",
      minWidth: 100
    },
    {
      label: "浏览器类型",
      prop: "browser",
      minWidth: 100
    },
    {
      label: "操作状态",
      prop: "status",
      minWidth: 100,
      cellRenderer: ({ row, props }) => (
        <el-tag size={props.size} style={tagStyle.value(row.status)}>
          {row.status === 1 ? "成功" : "失败"}
        </el-tag>
      )
    },
    {
      label: "操作时间",
      prop: "operatingTime",
      minWidth: 180,
      formatter: ({ operatingTime }) =>
        dayjs(operatingTime).format("YYYY-MM-DD HH:mm:ss")
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

  /** 当CheckBox选择项发生变化时会触发该事件 */
  function handleSelectionChange(val) {
    selectedNum.value = val.length;
    // 重置表格高度
    tableRef.value.setAdaptive();
  }

  /** 取消选择 */
  function onSelectionCancel() {
    selectedNum.value = 0;
    // 用于多选表格，清空用户的选择
    tableRef.value.getTableRef().clearSelection();
  }

  async function onbatchDel() {
    const curSelected = tableRef.value.getTableRef().getSelectionRows();
    const ids = getKeyList(curSelected, "id");
    const { code } = await batchDeleteOperationLogs(ids);
    if (code === 0) {
      message(`\u5DF2\u5220\u9664\u5E8F\u53F7\u4E3A ${ids} \u7684\u6570\u636E`, { type: "success" });
      tableRef.value.getTableRef().clearSelection();
      onSearch();
    }
  }
  
  async function clearAll() {
    const { code } = await clearOperationLogs();
    if (code === 0) {
      message("\u5DF2\u5220\u9664\u6240\u6709\u65E5\u5FD7\u6570\u636E", { type: "success" });
      onSearch();
    }
  }

  async function onSearch() {
    loading.value = true;
    const params: any = {
      ...toRaw(form),
      page: pagination.currentPage,
      limit: pagination.pageSize
    };
    if (form.operatingTime && form.operatingTime.length === 2) {
      params.operatingTime = [
        dayjs(form.operatingTime[0]).format("YYYY-MM-DD HH:mm:ss"),
        dayjs(form.operatingTime[1]).format("YYYY-MM-DD HH:mm:ss")
      ];
    }
    const { code, data } = await getOperationLogsList(params);
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
    selectedNum,
    onSearch,
    clearAll,
    resetForm,
    onbatchDel,
    handleSizeChange,
    onSelectionCancel,
    handleCurrentChange,
    handleSelectionChange
  };
}
