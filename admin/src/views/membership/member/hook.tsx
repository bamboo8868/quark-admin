import { message } from "@/utils/message";
import { addDialog } from "@/components/ReDialog";
import {
  getMemberList,
  updateMember,
  deleteMember,
  batchDeleteMembers,
  updateMemberLevel
} from "@/api/member";
import { ref, reactive, onMounted, h, defineComponent } from "vue";
import type { PaginationProps } from "@pureadmin/table";

import Refresh from "~icons/ep/refresh";
import Delete from "~icons/ep/delete";
import EditPen from "~icons/ep/edit-pen";

/** Member level map */
const levelMap: Record<number, { label: string; type: string }> = {
  0: { label: "游客", type: "info" },
  1: { label: "青铜", type: "warning" },
  2: { label: "黄金", type: "success" }
};

export function useMemberList() {
  const loading = ref(false);
  const formRef = ref();
  const memberFormRef = ref();

  /** Selected rows for batch delete */
  const selectedRows = ref([]);

  /** Search form */
  const form = reactive({
    username: "",
    email: "",
    status: null as number | null,
    member_level: null as number | null
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
      type: "selection",
      align: "left",
      width: 50
    },
    {
      label: "ID",
      prop: "id",
      minWidth: 70
    },
    {
      label: "用户名",
      prop: "username",
      minWidth: 120
    },
    {
      label: "昵称",
      prop: "nickname",
      minWidth: 120
    },
    {
      label: "邮箱",
      prop: "email",
      minWidth: 160,
      showOverflowTooltip: true
    },
    {
      label: "手机号",
      prop: "phone",
      minWidth: 120
    },
    {
      label: "会员等级",
      prop: "member_level",
      minWidth: 100,
      cellRenderer: ({ row }) => {
        const info = levelMap[row.member_level] || levelMap[0];
        return (
          <el-tag type={info.type} effect="plain">
            {info.label}
          </el-tag>
        );
      }
    },
    {
      label: "状态",
      prop: "status",
      minWidth: 80,
      cellRenderer: ({ row }) => (
        <el-tag type={row.status === 1 ? "success" : "danger"} effect="plain">
          {row.status === 1 ? "正常" : "禁用"}
        </el-tag>
      )
    },
    {
      label: "登录次数",
      prop: "login_count",
      minWidth: 80
    },
    {
      label: "最后登录",
      prop: "last_login_at",
      minWidth: 170,
      formatter: ({ last_login_at }) =>
        last_login_at ? new Date(last_login_at).toLocaleString("zh-CN") : "—"
    },
    {
      label: "注册时间",
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
      const { code, data } = await getMemberList({
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

  function handleSizeChange(val: number) {
    pagination.pageSize = val;
    onSearch();
  }

  function handleCurrentChange(val: number) {
    pagination.currentPage = val;
    onSearch();
  }

  /** Selection change */
  function handleSelectionChange(rows: any[]) {
    selectedRows.value = rows;
  }

  /** Batch delete */
  async function handleBatchDelete() {
    if (selectedRows.value.length === 0) {
      message("请选择要删除的会员", { type: "warning" });
      return;
    }
    const ids = selectedRows.value.map((r: any) => r.id);
    const { code } = await batchDeleteMembers(ids);
    if (code === 0) {
      message("批量删除成功", { type: "success" });
      onSearch();
    }
  }

  /** Edit dialog */
  function openDialog(title = "编辑", row?: any) {
    const isEdit = title === "编辑";
    addDialog({
      title: `${title}会员`,
      props: {
        formInline: {
          username: row?.username ?? "",
          nickname: row?.nickname ?? "",
          email: row?.email ?? "",
          phone: row?.phone ?? "",
          status: row?.status ?? 1,
          member_level: row?.member_level ?? 0,
          signature: row?.signature ?? ""
        }
      },
      width: "45%",
      draggable: true,
      closeOnClickModal: false,
      contentRenderer: () =>
        h(MemberFormComponent, {
          ref: memberFormRef,
          formInline: null
        }),
      beforeSure: async (done, { options }) => {
        const FormRef = memberFormRef.value.getRef();
        const curData = options.props.formInline;
        FormRef.validate(async (valid: boolean) => {
          if (valid) {
            if (isEdit) {
              const { code } = await updateMember(row.id, curData);
              if (code === 0) {
                message("修改成功", { type: "success" });
                done();
                onSearch();
              }
            }
          }
        });
      }
    });
  }

  /** Quick level change */
  async function handleLevelChange(row: any, level: number) {
    const { code } = await updateMemberLevel(row.id, { member_level: level });
    if (code === 0) {
      message("等级修改成功", { type: "success" });
      onSearch();
    }
  }

  /** Delete */
  async function handleDelete(row: any) {
    const { code } = await deleteMember(row.id);
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
    selectedRows,
    onSearch,
    resetForm,
    handleSizeChange,
    handleCurrentChange,
    handleSelectionChange,
    handleBatchDelete,
    openDialog,
    handleLevelChange,
    handleDelete,
    levelMap
  };
}

/** Member form component for dialog */
const MemberFormComponent = defineComponent({
  name: "MemberForm",
  props: {
    formInline: {
      type: Object,
      default: () => ({})
    }
  },
  setup(props, { expose }) {
    const formRef = ref();
    const rules = {
      username: [{ required: true, message: "用户名不能为空", trigger: "blur" }],
      nickname: [{ required: true, message: "昵称不能为空", trigger: "blur" }]
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
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model={props.formInline.username}
            disabled
            placeholder="用户名"
          />
        </el-form-item>
        <el-form-item label="昵称" prop="nickname">
          <el-input
            v-model={props.formInline.nickname}
            placeholder="请输入昵称"
          />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input
            v-model={props.formInline.email}
            placeholder="请输入邮箱"
          />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input
            v-model={props.formInline.phone}
            placeholder="请输入手机号"
          />
        </el-form-item>
        <el-form-item label="个性签名" prop="signature">
          <el-input
            v-model={props.formInline.signature}
            type="textarea"
            rows={2}
            placeholder="请输入个性签名"
          />
        </el-form-item>
        <el-form-item label="会员等级" prop="member_level">
          <el-radio-group v-model={props.formInline.member_level}>
            <el-radio value={0}>游客</el-radio>
            <el-radio value={1}>青铜</el-radio>
            <el-radio value={2}>黄金</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model={props.formInline.status}>
            <el-radio value={1}>正常</el-radio>
            <el-radio value={0}>禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
    );
  }
});
