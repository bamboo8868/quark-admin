import { message } from "@/utils/message";
import { addDialog } from "@/components/ReDialog";
import {
  getGameAccMgrList,
  createGameAccMgr,
  updateGameAccMgr,
  deleteGameAccMgr
} from "@/api/gameAccMgr";
import { getGameList } from "@/api/game";
import { ref, reactive, onMounted, h, defineComponent } from "vue";
import type { PaginationProps } from "@pureadmin/table";

export function useGameAccount() {
  const loading = ref(false);
  const formRef = ref();
  const accFormRef = ref();

  /** Game options for dropdown */
  const gameOptions = ref([]);

  /** Search form */
  const form = reactive({
    account: "",
    game_id: null as number | null,
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
      label: "游戏",
      prop: "game_name",
      minWidth: 140
    },
    {
      label: "账号",
      prop: "account",
      minWidth: 150
    },
    {
      label: "密码",
      prop: "password",
      minWidth: 130,
      showOverflowTooltip: true
    },
    {
      label: "密钥",
      prop: "secret",
      minWidth: 120,
      showOverflowTooltip: true
    },
    {
      label: "等级",
      prop: "level",
      minWidth: 80
    },
    {
      label: "平台",
      prop: "platform",
      minWidth: 100
    },
    {
      label: "状态",
      prop: "status",
      minWidth: 90,
      cellRenderer: ({ row }) => (
        <el-tag type={row.status === 1 ? "success" : "danger"} effect="plain">
          {row.status === 1 ? "启用" : "禁用"}
        </el-tag>
      )
    },
    {
      label: "备注",
      prop: "remark",
      minWidth: 150,
      showOverflowTooltip: true
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
      const { code, data } = await getGameAccMgrList({
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

  /** Load game options */
  async function loadGameOptions() {
    try {
      const res = await getGameList({ page: 1, limit: 200 });
      if (res.code === 0) {
        gameOptions.value = (res.data?.list || []).map(g => ({
          label: g.name,
          value: g.id
        }));
      }
    } catch (e) {
      console.error(e);
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

  /** Open dialog */
  function openDialog(title = "新增", row?: any) {
    const isEdit = title === "修改";
    addDialog({
      title: `${title}游戏账号`,
      props: {
        formInline: {
          game_id: row?.game_id ?? null,
          account: row?.account ?? "",
          password: row?.password ?? "",
          secret: row?.secret ?? "",
          level: row?.level ?? 0,
          platform: row?.platform ?? "",
          status: row?.status ?? 1,
          remark: row?.remark ?? ""
        }
      },
      width: "50%",
      draggable: true,
      closeOnClickModal: false,
      contentRenderer: () =>
        h(AccFormComponent, {
          ref: accFormRef,
          formInline: null,
          gameOptions: gameOptions.value
        }),
      beforeSure: async (done, { options }) => {
        const FormRef = accFormRef.value.getRef();
        const curData = options.props.formInline;
        FormRef.validate(async (valid: boolean) => {
          if (valid) {
            if (isEdit) {
              const { code } = await updateGameAccMgr(row.id, curData);
              if (code === 0) {
                message("修改成功", { type: "success" });
                done();
                onSearch();
              }
            } else {
              const { code } = await createGameAccMgr(curData);
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
    const { code } = await deleteGameAccMgr(row.id);
    if (code === 0) {
      message("删除成功", { type: "success" });
      onSearch();
    }
  }

  onMounted(() => {
    loadGameOptions();
    onSearch();
  });

  return {
    loading,
    form,
    formRef,
    dataList,
    columns,
    pagination,
    gameOptions,
    onSearch,
    resetForm,
    handleSizeChange,
    handleCurrentChange,
    openDialog,
    handleDelete
  };
}

/** Account form component for dialog */
const AccFormComponent = defineComponent({
  name: "GameAccForm",
  props: {
    formInline: {
      type: Object,
      default: () => ({})
    },
    gameOptions: {
      type: Array,
      default: () => []
    }
  },
  setup(props, { expose }) {
    const formRef = ref();
    const rules = {
      game_id: [{ required: true, message: "请选择游戏", trigger: "change" }],
      account: [{ required: true, message: "请输入账号", trigger: "blur" }]
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
        <el-form-item label="关联游戏" prop="game_id">
          <el-select
            v-model={props.formInline.game_id}
            placeholder="请选择游戏"
            clearable
            filterable
            style="width: 100%"
          >
            {props.gameOptions.map((opt: any) => (
              <el-option key={opt.value} label={opt.label} value={opt.value} />
            ))}
          </el-select>
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
          />
        </el-form-item>
        <el-form-item label="密钥" prop="secret">
          <el-input
            v-model={props.formInline.secret}
            placeholder="请输入密钥/令牌"
          />
        </el-form-item>
        <el-form-item label="等级" prop="level">
          <el-input-number
            v-model={props.formInline.level}
            min={0}
            max={999}
          />
        </el-form-item>
        <el-form-item label="平台" prop="platform">
          <el-input
            v-model={props.formInline.platform}
            placeholder="如 Steam/Epic"
          />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model={props.formInline.status}>
            <el-radio value={1}>启用</el-radio>
            <el-radio value={0}>禁用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input
            v-model={props.formInline.remark}
            type="textarea"
            rows={2}
            placeholder="请输入备注"
          />
        </el-form-item>
      </el-form>
    );
  }
});
