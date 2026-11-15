import { message } from "@/utils/message";
import { addDialog } from "@/components/ReDialog";
import {
  getMemberGameSimpleList,
  createMemberGameSimple,
  updateMemberGameSimple,
  deleteMemberGameSimple,
  importMemberGameSimpleSda
} from "@/api/memberGamesSimple";
import { ref, reactive, onMounted, h, defineComponent } from "vue";
import type { PaginationProps } from "@pureadmin/table";

/** Member level map (统一三级：0=游客 / 1=会员 / 2=高级会员) */
const levelMap: Record<number, { label: string; type: string }> = {
  0: { label: "游客", type: "info" },
  1: { label: "会员", type: "warning" },
  2: { label: "高级会员", type: "success" }
};

export function useMemberGameSimple() {
  const loading = ref(false);
  const formRef = ref();
  const editFormRef = ref();

  /** Search form */
  const form = reactive({
    name: "",
    member_level: null as number | null,
    status: null as number | null
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
      minWidth: 70
    },
    {
      label: "游戏名称",
      prop: "game_name",
      minWidth: 150,
      showOverflowTooltip: true
    },
    {
      label: "游戏账号",
      prop: "account",
      minWidth: 150,
      showOverflowTooltip: true
    },
    {
      label: "密码",
      prop: "password",
      minWidth: 140,
      showOverflowTooltip: true
    },
    {
      label: "动态码",
      prop: "totp_code",
      minWidth: 120,
      showOverflowTooltip: true
    },
    {
      label: "会员等级",
      prop: "member_level",
      minWidth: 100,
      cellRenderer: ({ row }) => {
        const info = levelMap[Number(row.member_level || 0)] || levelMap[0];
        return (
          <el-tag type={info.type as any} effect="plain">
            {info.label}
          </el-tag>
        );
      }
    },
    {
      label: "状态",
      prop: "status",
      minWidth: 90,
      cellRenderer: ({ row }) => (
        <el-tag
          type={Number(row.status) === 1 ? "success" : "info"}
          effect="plain"
        >
          {Number(row.status) === 1 ? "启用" : "禁用"}
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
      width: 160,
      slot: "operation"
    }
  ];

  /** Fetch list */
  async function onSearch() {
    loading.value = true;
    try {
      const { code, data } = await getMemberGameSimpleList({
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
    form.name = "";
    form.member_level = null;
    form.status = null;
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

  /** Open dialog */
  function openDialog(title = "新增", row?: any) {
    const isEdit = title === "修改";
    addDialog({
      title: `${title}简易游戏`,
      props: {
        formInline: {
          game_name: row?.game_name ?? "",
          account: row?.account ?? "",
          password: row?.password ?? "",
          code: row?.code ?? "",
          member_level: row?.member_level ?? 0,
          status: row?.status ?? 1
        }
      },
      width: "50%",
      draggable: true,
      closeOnClickModal: false,
      contentRenderer: () =>
        h(SimpleGameFormComponent, {
          ref: editFormRef,
          formInline: null
        }),
      beforeSure: async (done, { options }) => {
        const FormRef = editFormRef.value.getRef();
        const curData = options.props.formInline;
        FormRef.validate(async (valid: boolean) => {
          if (valid) {
            if (isEdit) {
              const { code } = await updateMemberGameSimple(row.id, curData);
              if (code === 0) {
                message("修改成功", { type: "success" });
                done();
                onSearch();
              }
            } else {
              const { code } = await createMemberGameSimple(curData);
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

  /** Delete */
  async function handleDelete(row: any) {
    const { code } = await deleteMemberGameSimple(row.id);
    if (code === 0) {
      message("删除成功", { type: "success" });
      onSearch();
    }
  }

  /** Import SDA/maFile — 与游戏账号导入一致：按 account_name 全局绑定
   *  已存在简易游戏行的密钥，未匹配的直接跳过不新增 */
  const importLoading = ref(false);

  function handleImport() {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = ".json,.mafile";
    input.onchange = async (e: Event) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files || files.length === 0) return;

      importLoading.value = true;
      try {
        const allItems: any[] = [];
        const errors: string[] = [];

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          try {
            const text = await file.text();
            const json = JSON.parse(text);
            const items = Array.isArray(json) ? json : json.accounts || [json];
            allItems.push(...items);
          } catch (err: any) {
            errors.push(`${file.name}: ${err?.message || "解析失败"}`);
          }
        }

        if (errors.length > 0) {
          message(`部分文件解析失败: ${errors.join("; ")}`, { type: "warning" });
        }

        if (allItems.length === 0) {
          message("所选文件中没有有效数据", { type: "warning" });
          return;
        }

        const { code, message: msg } = await importMemberGameSimpleSda(allItems);
        if (code === 0) {
          message(msg || `成功绑定 ${allItems.length} 条数据`, { type: "success" });
          onSearch();
        } else {
          message(msg || "导入失败", { type: "error" });
        }
      } catch (err: any) {
        message(err?.message || "文件处理失败", { type: "error" });
      } finally {
        importLoading.value = false;
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
    importLoading,
    handleImport
  };
}

/** Simple game form component for dialog */
const SimpleGameFormComponent = defineComponent({
  name: "MemberGameSimpleForm",
  props: {
    formInline: {
      type: Object,
      default: () => ({})
    }
  },
  setup(props, { expose }) {
    const formRef = ref();
    const rules = {
      game_name: [
        { required: true, message: "请输入游戏名称", trigger: "blur" }
      ]
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
        <el-form-item label="游戏账号" prop="account">
          <el-input
            v-model={props.formInline.account}
            placeholder="请输入游戏账号"
          />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model={props.formInline.password}
            placeholder="请输入密码"
          />
        </el-form-item>
        <el-form-item label="密钥" prop="code">
          <el-input
            v-model={props.formInline.code}
            placeholder="动态验证码密钥(shared_secret)"
          />
        </el-form-item>
        <el-form-item label="会员等级" prop="member_level">
          <el-select
            v-model={props.formInline.member_level}
            placeholder="请选择会员等级"
          >
            <el-option label="游客" value={0} />
            <el-option label="会员" value={1} />
            <el-option label="高级会员" value={2} />
          </el-select>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model={props.formInline.status}>
            <el-radio value={1}>启用</el-radio>
            <el-radio value={0}>禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
    );
  }
});
