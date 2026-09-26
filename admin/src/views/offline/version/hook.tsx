import { message } from "@/utils/message";
import { addDialog } from "@/components/ReDialog";
import {
  getOfflineVersionList,
  createOfflineVersion,
  updateOfflineVersion,
  deleteOfflineVersion,
  getAllOfflineGames
} from "@/api/offline";
import { ref, reactive, onMounted, h, defineComponent } from "vue";
import type { PaginationProps } from "@pureadmin/table";

export function useOfflineVersion() {
  const loading = ref(false);
  const formRef = ref();
  const versionFormRef = ref();

  /** Game options for dropdown */
  const gameOptions = ref([]);

  /** Search form */
  const form = reactive({
    game_id: null as number | null,
    name: ""
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
      minWidth: 80
    },
    {
      label: "所属游戏",
      prop: "game_name",
      minWidth: 150
    },
    {
      label: "版本名称",
      prop: "name",
      minWidth: 150
    },
    {
      label: "状态",
      prop: "status",
      minWidth: 100,
      slot: "status"
    },
    {
      label: "备注",
      prop: "remark",
      minWidth: 200
    },
    {
      label: "操作",
      fixed: "right",
      width: 160,
      slot: "operation"
    }
  ];

  async function loadGameOptions() {
    const { code, data } = await getAllOfflineGames();
    if (code === 0) {
      gameOptions.value = data || [];
    }
  }

  async function onSearch() {
    loading.value = true;
    try {
      const { code, data } = await getOfflineVersionList({
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

  const resetForm = (formEl: any) => {
    if (!formEl) return;
    formEl.resetFields();
    form.game_id = null;
    form.name = "";
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

  function openDialog(title = "新增", row?: any) {
    const isEdit = title === "修改";
    addDialog({
      title: `${title}版本`,
      props: {
        formInline: {
          game_id: row?.game_id ?? null,
          name: row?.name ?? "",
          status: row?.status ?? 1,
          remark: row?.remark ?? ""
        }
      },
      width: "40%",
      draggable: true,
      closeOnClickModal: false,
      contentRenderer: () =>
        h(VersionFormComponent, {
          ref: versionFormRef,
          formInline: null,
          gameOptions: gameOptions.value
        }),
      beforeSure: async (done, { options }) => {
        const FormRef = versionFormRef.value.getRef();
        const curData = options.props.formInline;
        FormRef.validate(async (valid: boolean) => {
          if (valid) {
            if (isEdit) {
              const { code } = await updateOfflineVersion(row.id, curData);
              if (code === 0) {
                message("修改成功", { type: "success" });
                done();
                onSearch();
              }
            } else {
              const { code } = await createOfflineVersion(curData);
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

  async function handleDelete(row: any) {
    const { code } = await deleteOfflineVersion(row.id);
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

/** Version form component for dialog */
const VersionFormComponent = defineComponent({
  name: "OfflineVersionForm",
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
      game_id: [{ required: true, message: "请选择所属游戏", trigger: "change" }],
      name: [{ required: true, message: "请输入版本名称", trigger: "blur" }]
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
        <el-form-item label="所属游戏" prop="game_id">
          <el-select
            v-model={props.formInline.game_id}
            placeholder="请选择游戏"
            style={{ width: "100%" }}
          >
            {(props.gameOptions as any[]).map(game => (
              <el-option key={game.id} label={game.name} value={game.id} />
            ))}
          </el-select>
        </el-form-item>
        <el-form-item label="版本名称" prop="name">
          <el-input
            v-model={props.formInline.name}
            placeholder="请输入版本名称，如 标准版、豪华版"
          />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-switch
            v-model={props.formInline.status}
            active-value={1}
            inactive-value={0}
            inline-prompt
            active-text="启用"
            inactive-text="禁用"
          />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input
            v-model={props.formInline.remark}
            type="textarea"
            placeholder="请输入备注"
            rows={3}
          />
        </el-form-item>
      </el-form>
    );
  }
});
