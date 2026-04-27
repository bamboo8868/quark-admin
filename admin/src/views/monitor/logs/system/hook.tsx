import dayjs from "dayjs";
import Detail from "./detail.vue";
import { message } from "@/utils/message";
import { addDialog } from "@/components/ReDialog";
import type { PaginationProps } from "@pureadmin/table";
import { type Ref, reactive, ref, onMounted, toRaw } from "vue";
import { getKeyList, useCopyToClipboard } from "@pureadmin/utils";
import { getSystemLogsList, getSystemLogsDetail, batchDeleteSystemLogs, clearSystemLogs } from "@/api/system";
import Info from "~icons/ri/question-line";

export function useRole(tableRef: Ref) {
  const form = reactive({
    module: "",
    requestTime: [] as string[]
  });
  const dataList = ref([]);
  const loading = ref(true);
  const selectedNum = ref(0);
  const { copied, update } = useCopyToClipboard();

  const pagination = reactive<PaginationProps>({
    total: 0,
    pageSize: 10,
    currentPage: 1,
    background: true
  });

  // const getLevelType = (type, text = false) => {
  //   switch (type) {
  //     case 0:
  //       return text ? "debug" : "primary";
  //     case 1:
  //       return text ? "info" : "success";
  //     case 2:
  //       return text ? "warn" : "info";
  //     case 3:
  //       return text ? "error" : "warning";
  //     case 4:
  //       return text ? "fatal" : "danger";
  //   }
  // };

  const columns: TableColumnList = [
    {
      label: "勾选列", // 如果需要表格多选，此处label必须设置
      type: "selection",
      fixed: "left",
      reserveSelection: true // 数据刷新后保留选项
    },
    {
      label: "ID",
      prop: "id",
      minWidth: 90
    },
    {
      label: "所属模块",
      prop: "module",
      minWidth: 100
    },
    {
      headerRenderer: () => (
        <span class="flex-c">
          请求接口
          <iconifyIconOffline
            icon={Info}
            class="ml-1 cursor-help"
            v-tippy={{
              content: "双击下面请求接口进行拷贝"
            }}
          />
        </span>
      ),
      prop: "url",
      minWidth: 140
    },
    {
      label: "请求方法",
      prop: "method",
      minWidth: 140
    },
    {
      label: "IP 地址",
      prop: "ip",
      minWidth: 100
    },
    {
      label: "地点",
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
    // {
    //   label: "级别",
    //   prop: "level",
    //   minWidth: 90,
    //   cellRenderer: ({ row, props }) => (
    //     <el-tag size={props.size} type={getLevelType(row.level)} effect="plain">
    //       {getLevelType(row.level, true)}
    //     </el-tag>
    //   )
    // },
    {
      label: "请求耗时",
      prop: "takesTime",
      minWidth: 100,
      cellRenderer: ({ row, props }) => (
        <el-tag
          size={props.size}
          type={row.takesTime < 1000 ? "success" : "warning"}
          effect="plain"
        >
          {row.takesTime} ms
        </el-tag>
      )
    },
    {
      label: "请求时间",
      prop: "requestTime",
      minWidth: 180,
      formatter: ({ requestTime }) =>
        dayjs(requestTime).format("YYYY-MM-DD HH:mm:ss")
    },
    {
      label: "操作",
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

  /** 拷贝请求接口，表格单元格被双击时触发 */
  function handleCellDblclick({ url }, { property }) {
    if (property !== "url") return;
    update(url);
    copied.value
      ? message(`${url} 已拷贝`, { type: "success" })
      : message("拷贝失败", { type: "warning" });
  }

  async function onbatchDel() {
    const curSelected = tableRef.value.getTableRef().getSelectionRows();
    const ids = getKeyList(curSelected, "id");
    const { code } = await batchDeleteSystemLogs(ids);
    if (code === 0) {
      message(`\u5DF2\u5220\u9664\u5E8F\u53F7\u4E3A ${ids} \u7684\u6570\u636E`, { type: "success" });
      tableRef.value.getTableRef().clearSelection();
      onSearch();
    }
  }
  
  async function clearAll() {
    const { code } = await clearSystemLogs();
    if (code === 0) {
      message("\u5DF2\u5220\u9664\u6240\u6709\u65E5\u5FD7\u6570\u636E", { type: "success" });
      onSearch();
    }
  }

  function onDetail(row) {
    getSystemLogsDetail({ id: row.id }).then(res => {
      addDialog({
        title: "系统日志详情",
        fullscreen: true,
        hideFooter: true,
        contentRenderer: () => Detail,
        props: {
          data: [res]
        }
      });
    });
  }

  async function onSearch() {
    loading.value = true;
    const params: any = {
      ...toRaw(form),
      page: pagination.currentPage,
      limit: pagination.pageSize
    };
    if (form.requestTime && form.requestTime.length === 2) {
      params.requestTime = [
        dayjs(form.requestTime[0]).format("YYYY-MM-DD HH:mm:ss"),
        dayjs(form.requestTime[1]).format("YYYY-MM-DD HH:mm:ss")
      ];
    }
    const { code, data } = await getSystemLogsList(params);
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
    onDetail,
    clearAll,
    resetForm,
    onbatchDel,
    handleSizeChange,
    onSelectionCancel,
    handleCellDblclick,
    handleCurrentChange,
    handleSelectionChange
  };
}
