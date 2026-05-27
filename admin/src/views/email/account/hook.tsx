import { message } from "@/utils/message";
import { addDialog } from "@/components/ReDialog";
import {
  getEmailAccounts,
  createEmailAccount,
  updateEmailAccount,
  deleteEmailAccount
} from "@/api/email";
import { ref, reactive, onMounted, h, defineComponent } from "vue";
import type { PaginationProps } from "@pureadmin/table";

import Refresh from "~icons/ep/refresh";
import Delete from "~icons/ep/delete";
import EditPen from "~icons/ep/edit-pen";
import AddFill from "~icons/ri/add-circle-line";

export function useAccount() {
  const loading = ref(false);
  const formRef = ref();
  const accountFormRef = ref();

  /** Search form */
  const form = reactive({
    displayName: "",
    host: ""
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
      label: "名称",
      prop: "displayName",
      minWidth: 120
    },
    {
      label: "服务器",
      prop: "host",
      minWidth: 160,
      formatter: ({ host, port }) => `${host}:${port}`
    },
    {
      label: "用户名",
      prop: "username",
      minWidth: 180
    },
    {
      label: "SSL",
      prop: "tls",
      minWidth: 60,
      formatter: ({ tls }) => (tls ? "是" : "否")
    },
    {
      label: "操作",
      fixed: "right",
      width: 160,
      slot: "operation"
    }
  ];

  /** Fetch email accounts */
  async function onSearch() {
    loading.value = true;
    try {
      const { code, data } = await getEmailAccounts();
      if (code === 0) {
        let filtered = data || [];
        if (form.displayName) {
          filtered = filtered.filter(item =>
            item.displayName?.includes(form.displayName)
          );
        }
        if (form.host) {
          filtered = filtered.filter(item => item.host?.includes(form.host));
        }
        pagination.total = filtered.length;
        const start = (pagination.currentPage - 1) * pagination.pageSize;
        const end = start + pagination.pageSize;
        dataList.value = filtered.slice(start, end);
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
  function openAccountDialog(title = "新增", row?: any) {
    const isEdit = title === "修改";
    addDialog({
      title: `${title}邮箱账号`,
      props: {
        formInline: {
          displayName: row?.displayName ?? "",
          host: row?.host ?? "",
          port: row?.port ?? 993,
          tls: row?.tls ?? true,
          username: row?.username ?? "",
          password: ""
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
              const updateData: any = {
                displayName: curData.displayName,
                host: curData.host,
                port: curData.port,
                tls: curData.tls,
                username: curData.username
              };
              if (curData.password) {
                updateData.password = curData.password;
              }
              const { code } = await updateEmailAccount(row.id, updateData);
              if (code === 0) {
                message("修改成功", { type: "success" });
                done();
                onSearch();
              }
            } else {
              const { code } = await createEmailAccount(curData);
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
    const { code } = await deleteEmailAccount(row.id);
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
    openAccountDialog,
    handleDelete
  };
}

/** Account form component for dialog */
const AccountFormComponent = defineComponent({
  name: "AccountForm",
  props: {
    formInline: {
      type: Object,
      default: () => ({})
    }
  },
  setup(props, { expose }) {
    const formRef = ref();
    const rules = {
      displayName: [{ required: true, message: "请输入名称", trigger: "blur" }],
      host: [{ required: true, message: "请输入服务器地址", trigger: "blur" }],
      username: [{ required: true, message: "请输入用户名", trigger: "blur" }]
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
        <el-form-item label="名称" prop="displayName">
          <el-input
            v-model={props.formInline.displayName}
            placeholder="请输入账号显示名称"
          />
        </el-form-item>
        <el-form-item label="服务器" prop="host">
          <el-input
            v-model={props.formInline.host}
            placeholder="IMAP服务器地址，如 imap.gmail.com"
          />
        </el-form-item>
        <el-form-item label="端口" prop="port">
          <el-input-number
            v-model={props.formInline.port}
            min={1}
            max={65535}
          />
        </el-form-item>
        <el-form-item label="SSL" prop="tls">
          <el-switch v-model={props.formInline.tls} />
        </el-form-item>
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model={props.formInline.username}
            placeholder="邮箱登录账号"
          />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model={props.formInline.password}
            type="password"
            show-password
            placeholder={props.formInline.id ? "不修改请留空" : "邮箱登录密码或应用专用密码"}
          />
        </el-form-item>
      </el-form>
    );
  }
});
