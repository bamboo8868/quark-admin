import { message } from "@/utils/message";
import { addDialog } from "@/components/ReDialog";
import {
  getMemberCdkGroupList,
  createMemberCdkGroup,
  updateMemberCdkGroup,
  deleteMemberCdkGroup,
  getMemberCdkList
} from "@/api/memberCdk";
import { ref, reactive, onMounted, h, defineComponent } from "vue";
import type { PaginationProps } from "@pureadmin/table";

/** Member level map */
const levelMap: Record<number, { label: string; type: string }> = {
  1: { label: "青铜", type: "warning" },
  2: { label: "黄金", type: "success" }
};

/** Duration options */
const durationOptions = [
  { label: "3个月", value: 3 },
  { label: "6个月", value: 6 },
  { label: "9个月", value: 9 },
  { label: "12个月", value: 12 }
];

const statusMap: Record<number, { label: string; type: string }> = {
  0: { label: "禁用", type: "info" },
  1: { label: "启用", type: "success" }
};

const cdkStatusMap: Record<number, { label: string; type: string }> = {
  0: { label: "禁用", type: "info" },
  1: { label: "可用", type: "success" },
  2: { label: "已使用", type: "danger" }
};

export function useMemberCdkGroup() {
  const loading = ref(false);
  const formRef = ref();
  const groupFormRef = ref();

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

  /** CDK detail list for view dialog */
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
      minWidth: 200
    },
    {
      label: "会员等级",
      prop: "member_level",
      minWidth: 100,
      cellRenderer: ({ row }: any) => {
        const info = levelMap[row.member_level] || { label: "未知", type: "info" };
        return <el-tag type={info.type as any}>{info.label}</el-tag>;
      }
    },
    {
      label: "时长(月)",
      prop: "duration_months",
      minWidth: 90
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

  /** CDK detail columns */
  const cdkColumns: TableColumnList = [
    {
      label: "ID",
      prop: "id",
      minWidth: 60
    },
    {
      label: "CDK码",
      prop: "cdk_code",
      minWidth: 200
    },
    {
      label: "会员等级",
      prop: "member_level",
      minWidth: 90,
      cellRenderer: ({ row }: any) => {
        const info = levelMap[row.member_level] || { label: "未知", type: "info" };
        return <el-tag size="small" type={info.type as any}>{info.label}</el-tag>;
      }
    },
    {
      label: "时长(月)",
      prop: "duration_months",
      minWidth: 80
    },
    {
      label: "状态",
      prop: "status",
      minWidth: 80,
      cellRenderer: ({ row }: any) => {
        const info = cdkStatusMap[row.status] || { label: "未知", type: "info" };
        return <el-tag size="small" type={info.type as any}>{info.label}</el-tag>;
      }
    },
    {
      label: "使用者",
      prop: "used_by",
      minWidth: 90,
      cellRenderer: ({ row }: any) => <span>{row.used_by || "-"}</span>
    },
    {
      label: "使用时间",
      prop: "used_at",
      minWidth: 160,
      formatter: ({ used_at }) =>
        used_at ? new Date(used_at).toLocaleString("zh-CN") : ""
    }
  ];

  async function onSearch() {
    loading.value = true;
    try {
      const { code, data } = await getMemberCdkGroupList({
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
    form.member_level = null;
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
      title: "创建会员CDK组",
      props: {
        formInline: {
          member_level: 1,
          duration_months: 3,
          count: 100,
          remark: ""
        }
      },
      width: "30%",
      draggable: true,
      closeOnClickModal: false,
      contentRenderer: () =>
        h(GroupFormComponent, {
          ref: groupFormRef,
          formInline: null
        }),
      beforeSure: async (done, { options }) => {
        const FormRef = groupFormRef.value.getRef();
        const curData = options.props.formInline;
        FormRef.validate(async (valid: boolean) => {
          if (valid) {
            const { code, message: errMsg } = await createMemberCdkGroup(curData);
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
            const { code } = await updateMemberCdkGroup(row.id, curData);
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
          }
        })
    });
  }

  async function loadGroupCdks(groupId: number) {
    cdkDetailLoading.value = true;
    try {
      const { code, data } = await getMemberCdkList({
        group_id: groupId,
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

  /** Export CDKs from a group */
  async function exportGroupCdks(row: any) {
    const { code, data } = await getMemberCdkList({
      group_id: row.id,
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
    const { code, message: errMsg } = await deleteMemberCdkGroup(row.id);
    if (code === 0) {
      message("删除成功", { type: "success" });
      onSearch();
    } else {
      message(errMsg || "删除失败", { type: "error" });
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
    levelMap,
    durationOptions,
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

/** Create group form component */
const GroupFormComponent = defineComponent({
  name: "MemberCdkGroupForm",
  props: {
    formInline: {
      type: Object,
      default: () => ({})
    }
  },
  setup(props, { expose }) {
    const formRef = ref();
    const rules = {
      member_level: [{ required: true, message: "请选择会员等级", trigger: "change" }],
      duration_months: [{ required: true, message: "请选择会员时长", trigger: "change" }],
      count: [{ required: true, message: "请输入生成数量", trigger: "blur" }]
    };

    const getRef = () => formRef.value;
    expose({ getRef });

    return () => (
      <el-form ref={formRef} model={props.formInline} rules={rules} label-width="90px">
        <el-form-item label="会员等级" prop="member_level">
          <el-select
            v-model={props.formInline.member_level}
            placeholder="请选择会员等级"
            style="width: 100%"
          >
            {Object.entries(levelMap).map(([val, info]) => (
              <el-option key={val} label={info.label} value={Number(val)} />
            ))}
          </el-select>
        </el-form-item>
        <el-form-item label="会员时长" prop="duration_months">
          <el-select
            v-model={props.formInline.duration_months}
            placeholder="请选择时长"
            style="width: 100%"
          >
            {durationOptions.map(opt => (
              <el-option key={opt.value} label={opt.label} value={opt.value} />
            ))}
          </el-select>
        </el-form-item>
        <el-form-item label="生成数量" prop="count">
          <el-input-number
            v-model={props.formInline.count}
            min={1}
            max={500}
            step={10}
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input
            v-model={props.formInline.remark}
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
  name: "MemberCdkGroupEditForm",
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
          <el-input v-model={props.formInline.name} placeholder="请输入组名称" />
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

/** CDK detail component */
const CdkDetailComponent = defineComponent({
  name: "MemberCdkDetail",
  props: {
    cdkList: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    pagination: { type: Object, default: () => ({}) },
    groupId: { type: Number, default: 0 }
  },
  emits: ["onPageChange", "onSizeChange"],
  setup(props, { emit }) {
    return () => (
      <pure-table
        align-whole="center"
        showOverflowTooltip
        table-layout="auto"
        loading={props.loading}
        size="small"
        data={props.cdkList}
        columns={[
          { label: "ID", prop: "id", minWidth: 60 },
          { label: "CDK码", prop: "cdk_code", minWidth: 200 },
          {
            label: "会员等级",
            prop: "member_level",
            minWidth: 90,
            cellRenderer: ({ row }: any) => {
              const info = levelMap[row.member_level] || { label: "未知", type: "info" };
              return <el-tag size="small" type={info.type as any}>{info.label}</el-tag>;
            }
          },
          { label: "时长(月)", prop: "duration_months", minWidth: 80 },
          {
            label: "状态",
            prop: "status",
            minWidth: 80,
            cellRenderer: ({ row }: any) => {
              const info = cdkStatusMap[row.status] || { label: "未知", type: "info" };
              return <el-tag size="small" type={info.type as any}>{info.label}</el-tag>;
            }
          },
          {
            label: "使用者",
            prop: "used_by",
            minWidth: 90,
            cellRenderer: ({ row }: any) => <span>{row.used_by || "-"}</span>
          },
          {
            label: "使用时间",
            prop: "used_at",
            minWidth: 160,
            formatter: ({ used_at }: any) =>
              used_at ? new Date(used_at).toLocaleString("zh-CN") : ""
          }
        ]}
        pagination={props.pagination}
        header-cell-style={{
          background: "var(--el-fill-color-light)",
          color: "var(--el-text-color-primary)"
        }}
        onPage-size-change={(size: number) => emit("onSizeChange", size)}
        onPage-current-change={(page: number) => emit("onPageChange", page)}
      />
    );
  }
});

/** CDK export component with textarea and copy button */
const CdkExportComponent = defineComponent({
  name: "CdkExport",
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
        setTimeout(() => {
          copyBtnText.value = "复制全部";
        }, 2000);
      } catch {
        message("复制失败，请手动复制", { type: "error" });
      }
    }

    return () => (
      <div class="flex flex-col gap-3">
        <el-input
          type="textarea"
          rows={12}
          model-value={props.cdkText}
          readonly
          class="w-full"
        />
        <div class="flex justify-end">
          <el-button type="primary" onClick={handleCopy}>
            {copyBtnText.value}
          </el-button>
        </div>
      </div>
    );
  }
});
