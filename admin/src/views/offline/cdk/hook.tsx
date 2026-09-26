import { message } from "@/utils/message";
import { addDialog } from "@/components/ReDialog";
import {
  getOfflineCdkGroupList,
  createOfflineCdkGroup,
  updateOfflineCdkGroup,
  deleteOfflineCdkGroup,
  getOfflineCdksByGroup,
  getAllOfflineGames,
  getAllOfflineVersions,
  updateOfflineCdk
} from "@/api/offline";
import { ref, reactive, onMounted, h, defineComponent } from "vue";
import type { PaginationProps } from "@pureadmin/table";

const statusMap: Record<number, { label: string; type: string }> = {
  0: { label: "禁用", type: "info" },
  1: { label: "启用", type: "success" }
};

const cdkStatusMap: Record<number, { label: string; type: string }> = {
  0: { label: "未使用", type: "success" },
  1: { label: "已使用", type: "warning" },
  2: { label: "已过期", type: "danger" },
  3: { label: "已禁用", type: "info" }
};

export function useOfflineCdk() {
  const loading = ref(false);
  const formRef = ref();
  const groupFormRef = ref();

  /** Game & version options */
  const gameOptions = ref([]);
  const versionOptions = ref([]);

  /** Search form */
  const form = reactive({
    name: "",
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

  /** CDK detail list */
  const cdkDetailList = ref([]);
  const cdkDetailLoading = ref(false);
  const cdkDetailPagination = reactive<PaginationProps>({
    total: 0,
    pageSize: 50,
    currentPage: 1,
    background: true
  });

  /** Table columns for CDK groups */
  const columns: TableColumnList = [
    {
      label: "ID",
      prop: "id",
      minWidth: 60
    },
    {
      label: "组名称",
      prop: "name",
      minWidth: 180
    },
    {
      label: "所属游戏",
      prop: "game_name",
      minWidth: 130
    },
    {
      label: "所属版本",
      prop: "version_name",
      minWidth: 120
    },
    {
      label: "总数",
      prop: "count",
      minWidth: 70
    },
    {
      label: "已使用",
      prop: "used_count",
      minWidth: 70,
      cellRenderer: ({ row }: any) => (
        <span class={row.used_count > 0 ? "text-orange-500 font-bold" : ""}>
          {row.used_count}
        </span>
      )
    },
    {
      label: "未使用",
      prop: "unused_count",
      minWidth: 70,
      cellRenderer: ({ row }: any) => (
        <span class="text-green-600">{(row.count || 0) - (row.used_count || 0)}</span>
      )
    },
    {
      label: "状态",
      prop: "status",
      minWidth: 80,
      cellRenderer: ({ row }: any) => {
        const info = statusMap[row.status] || { label: "未知", type: "info" };
        return <el-tag type={info.type as any}>{info.label}</el-tag>;
      }
    },
    {
      label: "备注",
      prop: "remark",
      minWidth: 120,
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
      width: 260,
      slot: "operation"
    }
  ];

  async function loadGameOptions() {
    try {
      const { code, data } = await getAllOfflineGames();
      if (code === 0) {
        gameOptions.value = (data || []).map((g: any) => ({
          label: g.name,
          value: g.id
        }));
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function onSearch() {
    loading.value = true;
    try {
      const { code, data } = await getOfflineCdkGroupList({
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
    form.game_id = null;
    form.status = null;
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

  /** Create CDK group dialog */
  function openCreateDialog() {
    addDialog({
      title: "创建CDK组",
      props: {
        formInline: {
          game_id: null,
          version_id: null,
          count: 100,
          remark: ""
        }
      },
      width: "35%",
      draggable: true,
      closeOnClickModal: false,
      contentRenderer: () =>
        h(GroupFormComponent, {
          ref: groupFormRef,
          formInline: null,
          gameOptions: gameOptions.value
        }),
      beforeSure: async (done, { options }) => {
        const FormRef = groupFormRef.value.getRef();
        const curData = options.props.formInline;
        FormRef.validate(async (valid: boolean) => {
          if (valid) {
            const { code, message: errMsg } = await createOfflineCdkGroup(curData);
            if (code === 0) {
              message(`成功生成 ${curData.count} 个CDK`, { type: "success" });
              done();
              onSearch();
            } else {
              message(errMsg || "创建失败", { type: "error" });
            }
          }
        });
      }
    });
  }

  /** Edit group dialog */
  function openEditDialog(row: any) {
    addDialog({
      title: "编辑CDK组",
      props: {
        formInline: {
          name: row.name || "",
          status: row.status ?? 1,
          remark: row.remark || ""
        }
      },
      width: "30%",
      draggable: true,
      closeOnClickModal: false,
      contentRenderer: () =>
        h(GroupEditFormComponent, {
          ref: groupFormRef,
          formInline: null
        }),
      beforeSure: async (done, { options }) => {
        const FormRef = groupFormRef.value.getRef();
        const curData = options.props.formInline;
        FormRef.validate(async (valid: boolean) => {
          if (valid) {
            const { code } = await updateOfflineCdkGroup(row.id, curData);
            if (code === 0) {
              message("修改成功", { type: "success" });
              done();
              onSearch();
            }
          }
        });
      }
    });
  }

  /** View CDK details in group */
  async function viewGroupCdks(row: any) {
    cdkDetailList.value = [];
    cdkDetailPagination.currentPage = 1;
    cdkDetailPagination.total = 0;
    await loadGroupCdks(row.id);

    addDialog({
      title: `CDK详情 - ${row.name}`,
      width: "70%",
      draggable: true,
      closeOnClickModal: false,
      footerRenderer: () => <span></span>,
      contentRenderer: () =>
        h(CdkDetailComponent, {
          cdkList: cdkDetailList.value,
          loading: cdkDetailLoading.value,
          pagination: cdkDetailPagination,
          groupId: row.id,
          onPageChange: async (page: number) => {
            cdkDetailPagination.currentPage = page;
            await loadGroupCdks(row.id);
          },
          onSizeChange: async (size: number) => {
            cdkDetailPagination.pageSize = size;
            cdkDetailPagination.currentPage = 1;
            await loadGroupCdks(row.id);
          },
          onToggleStatus: async (cdkId: number, currentStatus: number, usedBy?: string) => {
            await toggleCdkStatus(cdkId, currentStatus, row.id, usedBy);
          }
        })
    });
  }

  async function loadGroupCdks(groupId: number) {
    cdkDetailLoading.value = true;
    try {
      const { code, data } = await getOfflineCdksByGroup(groupId, {
        page: cdkDetailPagination.currentPage,
        limit: cdkDetailPagination.pageSize
      });
      if (code === 0) {
        cdkDetailList.value = data?.list || [];
        cdkDetailPagination.total = data?.total || 0;
      }
    } finally {
      cdkDetailLoading.value = false;
    }
  }

  /** Toggle CDK status */
  async function toggleCdkStatus(cdkId: number, currentStatus: number, groupId: number, usedBy?: string) {
    const isDisabling = currentStatus !== 3;
    const newStatus = isDisabling ? 3 : (usedBy ? 1 : 0);
    const actionText = isDisabling ? "禁用" : "启用";
    try {
      const { code } = await updateOfflineCdk(cdkId, { status: newStatus });
      if (code === 0) {
        message(`CDK${actionText}成功`, { type: "success" });
        await loadGroupCdks(groupId);
      }
    } catch (err: any) {
      message(err?.message || `${actionText}失败`, { type: "error" });
    }
  }

  /** Export CDKs from a group */
  async function exportGroupCdks(row: any) {
    const { code, data } = await getOfflineCdksByGroup(row.id, {
      page: 1,
      limit: 9999
    });
    if (code !== 0) {
      message("加载CDK数据失败", { type: "error" });
      return;
    }
    const cdks = data?.list || [];
    const cdkText = cdks.map((c: any) => c.cdk_code).join("\n");

    addDialog({
      title: `导出CDK - ${row.name}（共 ${cdks.length} 个）`,
      width: "50%",
      draggable: true,
      closeOnClickModal: false,
      footerRenderer: () => <span></span>,
      contentRenderer: () =>
        h(CdkExportComponent, {
          cdkText,
          count: cdks.length
        })
    });
  }

  /** Delete group */
  async function handleDelete(row: any) {
    const { code, message: errMsg } = await deleteOfflineCdkGroup(row.id);
    if (code === 0) {
      message("删除成功", { type: "success" });
      onSearch();
    } else {
      message(errMsg || "删除失败", { type: "error" });
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
    statusMap,
    onSearch,
    resetForm,
    handleSizeChange,
    handleCurrentChange,
    openCreateDialog,
    openEditDialog,
    viewGroupCdks,
    exportGroupCdks,
    handleDelete
  };
}

/** Create group form component with game->version cascade */
const GroupFormComponent = defineComponent({
  name: "OfflineCdkGroupForm",
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
    const localVersionOptions = ref<any[]>([]);

    const rules = {
      game_id: [{ required: true, message: "请选择所属游戏", trigger: "change" }],
      version_id: [{ required: true, message: "请选择所属版本", trigger: "change" }],
      count: [{ required: true, message: "请输入生成数量", trigger: "blur" }]
    };

    async function onGameChange(gameId: number | null) {
      (props.formInline as any).version_id = null;
      localVersionOptions.value = [];
      if (gameId) {
        const { code, data } = await getAllOfflineVersions(gameId);
        if (code === 0) {
          localVersionOptions.value = (data || []).map((v: any) => ({
            label: v.name,
            value: v.id
          }));
        }
      }
    }

    const getRef = () => formRef.value;
    expose({ getRef });

    return () => (
      <el-form ref={formRef} model={props.formInline} rules={rules} label-width="90px">
        <el-form-item label="所属游戏" prop="game_id">
          <el-select
            v-model={(props.formInline as any).game_id}
            placeholder="请选择游戏"
            filterable
            style="width: 100%"
            onChange={onGameChange}
          >
            {(props.gameOptions as any[]).map((opt: any) => (
              <el-option key={opt.value} label={opt.label} value={opt.value} />
            ))}
          </el-select>
        </el-form-item>
        <el-form-item label="所属版本" prop="version_id">
          <el-select
            v-model={(props.formInline as any).version_id}
            placeholder="请选择版本"
            filterable
            style="width: 100%"
          >
            {localVersionOptions.value.map((opt: any) => (
              <el-option key={opt.value} label={opt.label} value={opt.value} />
            ))}
          </el-select>
        </el-form-item>
        <el-form-item label="生成数量" prop="count">
          <el-input-number
            v-model={(props.formInline as any).count}
            min={1}
            max={500}
            step={10}
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input
            v-model={(props.formInline as any).remark}
            type="textarea"
            rows={2}
            placeholder="请输入备注(可选)"
          />
        </el-form-item>
      </el-form>
    );
  }
});

/** Edit group form component */
const GroupEditFormComponent = defineComponent({
  name: "OfflineCdkGroupEditForm",
  props: {
    formInline: {
      type: Object,
      default: () => ({})
    }
  },
  setup(props, { expose }) {
    const formRef = ref();
    const rules = {
      name: [{ required: true, message: "请输入组名称", trigger: "blur" }]
    };

    const getRef = () => formRef.value;
    expose({ getRef });

    return () => (
      <el-form ref={formRef} model={props.formInline} rules={rules} label-width="90px">
        <el-form-item label="组名称" prop="name">
          <el-input v-model={(props.formInline as any).name} placeholder="请输入组名称" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model={(props.formInline as any).status}>
            <el-radio value={1}>启用</el-radio>
            <el-radio value={0}>禁用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input
            v-model={(props.formInline as any).remark}
            type="textarea"
            rows={2}
            placeholder="请输入备注"
          />
        </el-form-item>
      </el-form>
    );
  }
});

/** CDK export component */
const CdkExportComponent = defineComponent({
  name: "OfflineCdkExport",
  props: {
    cdkText: { type: String, default: "" },
    count: { type: Number, default: 0 }
  },
  setup(props) {
    const copyBtnText = ref("复制全部");

    async function handleCopy() {
      try {
        await navigator.clipboard.writeText(props.cdkText);
        copyBtnText.value = "已复制!";
        setTimeout(() => { copyBtnText.value = "复制全部"; }, 2000);
      } catch {
        const textarea = document.createElement("textarea");
        textarea.value = props.cdkText;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        copyBtnText.value = "已复制!";
        setTimeout(() => { copyBtnText.value = "复制全部"; }, 2000);
      }
    }

    return () => (
      <div>
        <div class="flex justify-between items-center mb-2">
          <span class="text-sm text-gray-500">共 {props.count} 个CDK码，每行一个</span>
          <el-button type="primary" size="small" onClick={handleCopy}>
            {copyBtnText.value}
          </el-button>
        </div>
        <el-input
          type="textarea"
          modelValue={props.cdkText}
          readonly
          rows={15}
          style="font-family: monospace;"
        />
      </div>
    );
  }
});

/** CDK detail component */
const CdkDetailComponent = defineComponent({
  name: "OfflineCdkDetail",
  props: {
    cdkList: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    pagination: { type: Object, default: () => ({}) },
    groupId: { type: Number, default: 0 },
    onPageChange: { type: Function, default: () => {} },
    onSizeChange: { type: Function, default: () => {} },
    onToggleStatus: { type: Function, default: () => {} }
  },
  setup(props) {
    return () => (
      <div>
        <el-table
          data={props.cdkList as any[]}
          v-loading={props.loading}
          stripe
          border
          size="small"
          max-height="400"
        >
          <el-table-column prop="id" label="ID" width="60" />
          <el-table-column prop="cdk_code" label="CDK码" min-width="180" />
          <el-table-column prop="status" label="状态" width="80">
            {{
              default: ({ row }: any) => {
                const info = cdkStatusMap[row.status] || { label: "未知", type: "info" };
                return <el-tag size="small" type={info.type as any}>{info.label}</el-tag>;
              }
            }}
          </el-table-column>
          <el-table-column prop="game_account" label="关联账号" min-width="130">
            {{
              default: ({ row }: any) => <span>{row.game_account || "-"}</span>
            }}
          </el-table-column>
          <el-table-column prop="used_by" label="使用者" width="90">
            {{
              default: ({ row }: any) => <span>{row.used_by || "-"}</span>
            }}
          </el-table-column>
          <el-table-column prop="used_at" label="使用时间" min-width="160">
            {{
              default: ({ row }: any) =>
                row.used_at ? new Date(row.used_at).toLocaleString("zh-CN") : ""
            }}
          </el-table-column>
          <el-table-column label="操作" width="90" fixed="right">
            {{
              default: ({ row }: any) => {
                if (row.status === 0 || row.status === 1 || row.status === 3) {
                  const isDisabled = row.status === 3;
                  return (
                    <el-button
                      type={isDisabled ? "success" : "danger"}
                      size="small"
                      link
                      onClick={() => (props.onToggleStatus as Function)(row.id, row.status, row.used_by)}
                    >
                      {isDisabled ? "启用" : "禁用"}
                    </el-button>
                  );
                }
                return "-";
              }
            }}
          </el-table-column>
        </el-table>
        <div class="flex justify-end mt-3">
          <el-pagination
            small
            layout="total, sizes, prev, pager, next"
            total={(props.pagination as any).total || 0}
            current-page={(props.pagination as any).currentPage || 1}
            page-size={(props.pagination as any).pageSize || 50}
            page-sizes={[20, 50, 100]}
            onCurrentChange={(page: number) => (props.onPageChange as Function)(page)}
            onSizeChange={(size: number) => (props.onSizeChange as Function)(size)}
          />
        </div>
      </div>
    );
  }
});
