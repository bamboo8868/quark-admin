import { message } from "@/utils/message";
import { addDialog } from "@/components/ReDialog";
import {
  getOfflineGameList,
  createOfflineGame,
  updateOfflineGame,
  deleteOfflineGame,
  getOfflineVersionList,
  createOfflineVersion,
  updateOfflineVersion,
  deleteOfflineVersion
} from "@/api/offline";
import { ref, reactive, onMounted, h, defineComponent } from "vue";
import type { PaginationProps } from "@pureadmin/table";

export function useOfflineGame() {
  const loading = ref(false);
  const formRef = ref();
  const gameFormRef = ref();

  /** Search form */
  const form = reactive({
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
      label: "游戏名称",
      prop: "name",
      minWidth: 200
    },
    {
      label: "操作",
      fixed: "right",
      width: 240,
      slot: "operation"
    }
  ];

  async function onSearch() {
    loading.value = true;
    try {
      const { code, data } = await getOfflineGameList({
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
      title: `${title}游戏`,
      props: {
        formInline: {
          name: row?.name ?? ""
        }
      },
      width: "30%",
      draggable: true,
      closeOnClickModal: false,
      contentRenderer: () =>
        h(GameFormComponent, {
          ref: gameFormRef,
          formInline: null
        }),
      beforeSure: async (done, { options }) => {
        const FormRef = gameFormRef.value.getRef();
        const curData = options.props.formInline;
        FormRef.validate(async (valid: boolean) => {
          if (valid) {
            if (isEdit) {
              const { code } = await updateOfflineGame(row.id, curData);
              if (code === 0) {
                message("修改成功", { type: "success" });
                done();
                onSearch();
              }
            } else {
              const { code } = await createOfflineGame(curData);
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
    const { code } = await deleteOfflineGame(row.id);
    if (code === 0) {
      message("删除成功", { type: "success" });
      onSearch();
    }
  }

  /** 版本管理弹窗 */
  const versionList = ref<any[]>([]);
  const versionLoading = ref(false);
  const versionFormRef = ref();

  async function openVersionDialog(gameRow: any) {
    versionList.value = [];
    await loadVersions(gameRow.id);

    addDialog({
      title: `版本管理 - ${gameRow.name}`,
      width: "55%",
      draggable: true,
      closeOnClickModal: false,
      footerRenderer: () => <span></span>,
      contentRenderer: () =>
        h(VersionManageComponent, {
          gameRow,
          versionList: versionList.value,
          loading: versionLoading.value,
          onAdd: () => openVersionFormDialog(gameRow, null),
          onEdit: (row: any) => openVersionFormDialog(gameRow, row),
          onDelete: async (row: any) => {
            const { code } = await deleteOfflineVersion(row.id);
            if (code === 0) {
              message("删除成功", { type: "success" });
              await loadVersions(gameRow.id);
            }
          }
        })
    });
  }

  async function loadVersions(gameId: number) {
    versionLoading.value = true;
    try {
      const { code, data } = await getOfflineVersionList({
        game_id: gameId,
        page: 1,
        limit: 999
      });
      if (code === 0) {
        versionList.value = data?.list || [];
      }
    } finally {
      versionLoading.value = false;
    }
  }

  function openVersionFormDialog(gameRow: any, versionRow: any | null) {
    const isEdit = !!versionRow;
    addDialog({
      title: isEdit ? "编辑版本" : "新增版本",
      props: {
        formInline: {
          name: versionRow?.name ?? "",
          status: versionRow?.status ?? 1,
          remark: versionRow?.remark ?? ""
        }
      },
      width: "30%",
      draggable: true,
      closeOnClickModal: false,
      contentRenderer: () =>
        h(VersionFormComponent, {
          ref: versionFormRef,
          formInline: null
        }),
      beforeSure: async (done, { options }) => {
        const FormRef = versionFormRef.value.getRef();
        const curData = options.props.formInline;
        FormRef.validate(async (valid: boolean) => {
          if (valid) {
            if (isEdit) {
              const { code } = await updateOfflineVersion(versionRow.id, curData);
              if (code === 0) {
                message("修改成功", { type: "success" });
                done();
                await loadVersions(gameRow.id);
              }
            } else {
              const { code } = await createOfflineVersion({
                ...curData,
                game_id: gameRow.id
              });
              if (code === 0) {
                message("新增成功", { type: "success" });
                done();
                await loadVersions(gameRow.id);
              }
            }
          }
        });
      }
    });
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
    openVersionDialog
  };
}

/** Game form component for dialog */
const GameFormComponent = defineComponent({
  name: "OfflineGameForm",
  props: {
    formInline: {
      type: Object,
      default: () => ({})
    }
  },
  setup(props, { expose }) {
    const formRef = ref();
    const rules = {
      name: [{ required: true, message: "请输入游戏名称", trigger: "blur" }]
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
        <el-form-item label="游戏名称" prop="name">
          <el-input
            v-model={props.formInline.name}
            placeholder="请输入游戏名称"
          />
        </el-form-item>
      </el-form>
    );
  }
});

/** Version form component (name + status + remark) */
const VersionFormComponent = defineComponent({
  name: "OfflineVersionFormInline",
  props: {
    formInline: {
      type: Object,
      default: () => ({})
    }
  },
  setup(props, { expose }) {
    const formRef = ref();
    const rules = {
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
            rows={2}
          />
        </el-form-item>
      </el-form>
    );
  }
});

/** Version manage component - shows version table inside dialog */
const VersionManageComponent = defineComponent({
  name: "OfflineVersionManage",
  props: {
    gameRow: { type: Object, default: () => ({}) },
    versionList: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    onAdd: { type: Function, default: () => {} },
    onEdit: { type: Function, default: () => {} },
    onDelete: { type: Function, default: () => {} }
  },
  setup(props) {
    return () => (
      <div>
        <div style={{ marginBottom: "12px" }}>
          <el-button type="primary" size="small" onClick={() => props.onAdd()}>
            新增版本
          </el-button>
        </div>
        <el-table data={props.versionList} v-loading={props.loading} border size="small">
          <el-table-column prop="name" label="版本名称" min-width="120" />
          <el-table-column prop="status" label="状态" width="80" align="center">
            {{
              default: ({ row }: any) => (
                <el-tag type={row.status === 1 ? "success" : "info"} size="small">
                  {row.status === 1 ? "启用" : "禁用"}
                </el-tag>
              )
            }}
          </el-table-column>
          <el-table-column prop="remark" label="备注" min-width="150" showOverflowTooltip />
          <el-table-column label="操作" width="130" align="center">
            {{
              default: ({ row }: any) => (
                <>
                  <el-button link type="primary" size="small" onClick={() => props.onEdit(row)}>
                    编辑
                  </el-button>
                  <el-popconfirm
                    title="确认删除该版本？"
                    onConfirm={() => props.onDelete(row)}
                  >
                    {{
                      reference: () => (
                        <el-button link type="danger" size="small">
                          删除
                        </el-button>
                      )
                    }}
                  </el-popconfirm>
                </>
              )
            }}
          </el-table-column>
        </el-table>
      </div>
    );
  }
});
