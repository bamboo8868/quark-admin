import { message } from "@/utils/message";
import { addDialog } from "@/components/ReDialog";
import {
  getGameAccountList,
  createGameAccount,
  updateGameAccount,
  deleteGameAccount,
  importGameAccounts,
  logoutGameAccount
} from "@/api/gameAccount";
import { ref, reactive, onMounted, h, defineComponent } from "vue";
import type { PaginationProps } from "@pureadmin/table";

import Refresh from "~icons/ep/refresh";
import Delete from "~icons/ep/delete";
import EditPen from "~icons/ep/edit-pen";
import AddFill from "~icons/ri/add-circle-line";

export function useGameAccount() {
  const loading = ref(false);
  const formRef = ref();
  const accountFormRef = ref();

  /** Search form */
  const form = reactive({
    account: "",
    visible: null as number | null
  });

  /** Pagination */
  const pagination = reactive<PaginationProps>({
    total: 0,
    pageSize: 10,
    currentPage: 1,
    background: true
  });

  /** Account list data */
  const dataList = ref([]);

  /** Account table columns */
  const columns: TableColumnList = [
    {
      label: "ID",
      prop: "id",
      minWidth: 70
    },
    {
      label: "用户名",
      prop: "account",
      minWidth: 150
    },
    {
      label: "密码",
      prop: "password",
      minWidth: 120
    },
    {
      label: "验证码",
      prop: "code",
      minWidth: 150
    },
    {
      label: "可查询",
      prop: "visible",
      minWidth: 100,
      cellRenderer: ({ row }) => (
        <el-tag type={row.visible === 1 ? "success" : "danger"} effect="plain">
          {row.visible === 1 ? "是" : "否"}
        </el-tag>
      )
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
      width: 280,
      slot: "operation"
    }
  ];

  /** Fetch game accounts */
  async function onSearch() {
    loading.value = true;
    try {
      const { code, data } = await getGameAccountList({
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
      title: `${title}游戏账号`,
      props: {
        formInline: {
          account: row?.account ?? "",
          password: row?.password ?? "",
          code: row?.code ?? "",
          visible: row?.visible ?? 1
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
              const { code } = await updateGameAccount(row.id, curData);
              if (code === 0) {
                message("修改成功", { type: "success" });
                done();
                onSearch();
              }
            } else {
              const { code } = await createGameAccount(curData);
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

  /** Delete account */
  async function handleDelete(row: any) {
    const { code } = await deleteGameAccount(row.id);
    if (code === 0) {
      message("删除成功", { type: "success" });
      onSearch();
    }
  }

  /** Logout account */
  async function handleLogout(row: any) {
    const { code } = await logoutGameAccount(row.id);
    if (code === 0) {
      message("注销成功", { type: "success" });
      onSearch();
    }
  }

  /** Import accounts from JSON file */
  function handleImport() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        let json = JSON.parse(text);

        // Support both array and object-with-accounts format
        const items = Array.isArray(json) ? json : json.accounts || [json];

        if (items.length === 0) {
          message("JSON 文件中没有有效数据", { type: "warning" });
          return;
        }

        const { code, message: msg } = await importGameAccounts(items);
        if (code === 0) {
          message(msg || "导入成功", { type: "success" });
          onSearch();
        }
      } catch (err: any) {
        message(err?.message || "JSON 文件解析失败", { type: "error" });
      }
    };
    input.click();
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
    handleDelete,
    handleImport,
    handleLogout
  };
}

/** Account form component for dialog */
const AccountFormComponent = defineComponent({
  name: "GameAccountForm",
  props: {
    formInline: {
      type: Object,
      default: () => ({})
    }
  },
  setup(props, { expose }) {
    const formRef = ref();
    const rules = {
      account: [{ required: true, message: "请输入用户名", trigger: "blur" }],
      code: [{ required: true, message: "请输入验证码", trigger: "blur" }]
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
        <el-form-item label="密码" prop="password">
          <el-input
            v-model={props.formInline.password}
            placeholder="请输入密码"
          />
        </el-form-item>
        <el-form-item label="查询状态" prop="visible">
          <el-radio-group v-model={props.formInline.visible}>
            <el-radio value={1}>是</el-radio>
            <el-radio value={0}>否</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
    );
  }
});
