import { message } from "@/utils/message";
import { addDialog } from "@/components/ReDialog";
import {
  getAccountAccessList,
  createAccountAccess,
  updateAccountAccess,
  deleteAccountAccess
} from "@/api/accountAccess";
import { ref, reactive, onMounted, h, defineComponent } from "vue";
import type { PaginationProps } from "@pureadmin/table";

export function useAccountAccess() {
  const loading = ref(false);
  const formRef = ref();
  const accountFormRef = ref();

  /** Search form */
  const form = reactive({
    account: "",
    game_name: ""
  });

  /** Pagination */
  const pagination = reactive<PaginationProps>({
    total: 0,
    pageSize: 10,
    currentPage: 1,
    background: true
  });

  /** Data list */
  const dataList = ref([]);

  /** Table columns */
  const columns: TableColumnList = [
    {
      label: "编号",
      prop: "id",
      minWidth: 70
    },
    {
      label: "游戏名称",
      prop: "game_name",
      minWidth: 130
    },
    {
      label: "账号",
      prop: "account",
      minWidth: 160
    },
    {
      label: "密码",
      prop: "password",
      minWidth: 200
    },
    {
      label: "24小时查看次数",
      prop: "view_count_24h",
      minWidth: 120,
      cellRenderer: ({ row }) => (
        <el-tag type="info" effect="plain">
          {row.view_count_24h ?? 0}
        </el-tag>
      )
    },
    {
      label: "最近5次查看",
      prop: "view_times",
      minWidth: 140,
      cellRenderer: ({ row }) => {
        let times: string[] = [];
        try {
          times = typeof row.view_times === "string"
            ? JSON.parse(row.view_times)
            : (row.view_times || []);
        } catch {
          times = [];
        }
        if (times.length === 0) return <span style="color: #999">暂无记录</span>;
        return (
          <el-popover trigger="click" width="220">
            {{
              default: () => (
                <div>
                  {times.map((t: string) => (
                    <div style="font-size: 12px; line-height: 22px;">
                      {new Date(t).toLocaleString("zh-CN")}
                    </div>
                  ))}
                </div>
              ),
              reference: () => (
                <el-button link type="primary">
                  查看记录 ({times.length})
                </el-button>
              )
            }}
          </el-popover>
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
      width: 200,
      slot: "operation"
    }
  ];

  /** Fetch list */
  async function onSearch() {
    loading.value = true;
    try {
      const { code, data } = await getAccountAccessList({
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

  /** Reset search form */
  const resetForm = (formEl: any) => {
    if (!formEl) return;
    formEl.resetFields();
    pagination.currentPage = 1;
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

  /** Open account dialog */
  function openDialog(title = "新增", row?: any) {
    const isEdit = title === "修改";
    addDialog({
      title: `${title}D加密账号`,
      props: {
        formInline: {
          game_name: row?.game_name ?? "",
          account: row?.account ?? "",
          password: row?.password ?? ""
        }
      },
      width: "40%",
      draggable: true,
      closeOnClickModal: false,
      contentRenderer: () =>
        h(AccountFormComponent, {
          ref: accountFormRef,
          formInline: null
        }),
      beforeSure: async (done, { options }) => {
        const FormRef = accountFormRef.value.getRef();
        const curData = options.props.formInline;
        FormRef.validate(async (valid: boolean) => {
          if (valid) {
            if (isEdit) {
              const { code } = await updateAccountAccess(row.id, curData);
              if (code === 0) {
                message("修改成功", { type: "success" });
                done();
                onSearch();
              }
            } else {
              const { code } = await createAccountAccess(curData);
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

  /** Delete record */
  async function handleDelete(row: any) {
    const { code } = await deleteAccountAccess(row.id);
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
    onSearch,
    resetForm,
    handleSizeChange,
    handleCurrentChange,
    openDialog,
    handleDelete
  };
}

/** Account form component for dialog */
const AccountFormComponent = defineComponent({
  name: "AccountAccessForm",
  props: {
    formInline: {
      type: Object,
      default: () => ({})
    }
  },
  setup(props, { expose }) {
    const formRef = ref();
    const rules = {
      game_name: [{ required: true, message: "请输入游戏名称", trigger: "blur" }],
      account: [{ required: true, message: "请输入账号", trigger: "blur" }],
      password: [{ required: true, message: "请输入密码", trigger: "blur" }]
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
        <el-form-item label="游戏名称" prop="game_name">
          <el-input
            v-model={props.formInline.game_name}
            placeholder="请输入游戏名称"
          />
        </el-form-item>
        <el-form-item label="账号" prop="account">
          <el-input
            v-model={props.formInline.account}
            placeholder="请输入账号"
          />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model={props.formInline.password}
            placeholder="请输入密码"
            show-password
          />
        </el-form-item>
      </el-form>
    );
  }
});
