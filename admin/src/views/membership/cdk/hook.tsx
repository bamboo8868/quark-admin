import { message } from "@/utils/message";
import { addDialog } from "@/components/ReDialog";
import {
  getMemberCdkList,
  createMemberCdk,
  batchCreateMemberCdks,
  updateMemberCdk,
  deleteMemberCdk,
  batchDeleteMemberCdks
} from "@/api/memberCdk";
import { ref, reactive, onMounted, h, defineComponent } from "vue";
import type { PaginationProps } from "@pureadmin/table";

import Refresh from "~icons/ep/refresh";
import Delete from "~icons/ep/delete";
import EditPen from "~icons/ep/edit-pen";
import Plus from "~icons/ep/plus";

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

/** Status map */
const statusMap: Record<number, { label: string; type: string }> = {
  0: { label: "禁用", type: "info" },
  1: { label: "可用", type: "success" },
  2: { label: "已使用", type: "danger" }
};

export function useMemberCdkList() {
  const loading = ref(false);
  const formRef = ref();
  const cdkFormRef = ref();

  /** Selected rows for batch delete */
  const selectedRows = ref([]);

  /** Search form */
  const form = reactive({
    cdk_code: "",
    member_level: null as number | null,
    duration_months: null as number | null,
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
      label: "CDK码",
      prop: "cdk_code",
      minWidth: 220
    },
    {
      label: "会员等级",
      prop: "member_level",
      minWidth: 100,
      cellRenderer: ({ row }: any) => {
        const info = levelMap[row.member_level] || {
          label: "未知",
          type: "info"
        };
        return <el-tag type={info.type as any}>{info.label}</el-tag>;
      }
    },
    {
      label: "时长(月)",
      prop: "duration_months",
      minWidth: 90
    },
    {
      label: "状态",
      prop: "status",
      minWidth: 90,
      cellRenderer: ({ row }: any) => {
        const info = statusMap[row.status] || {
          label: "未知",
          type: "info"
        };
        return <el-tag type={info.type as any}>{info.label}</el-tag>;
      }
    },
    {
      label: "批次号",
      prop: "batch_no",
      minWidth: 140
    },
    {
      label: "使用者",
      prop: "used_by",
      minWidth: 90,
      cellRenderer: ({ row }: any) => {
        return row.used_by ? <span>{row.used_by}</span> : <span>-</span>;
      }
    },
    {
      label: "使用时间",
      prop: "used_at",
      minWidth: 170
    },
    {
      label: "备注",
      prop: "remark",
      minWidth: 120
    },
    {
      label: "创建时间",
      prop: "created_at",
      minWidth: 170
    },
    {
      label: "操作",
      fixed: "right",
      width: 180,
      slot: "operation"
    }
  ];

  /** Fetch data */
  async function onSearch() {
    loading.value = true;
    try {
      const { data } = await getMemberCdkList({
        ...form,
        page: pagination.currentPage,
        limit: pagination.pageSize
      });
      if (data) {
        dataList.value = data.list || [];
        pagination.total = data.total || 0;
      }
    } finally {
      loading.value = false;
    }
  }

  function resetForm(formEl: any) {
    if (!formEl) return;
    formEl.resetFields();
    form.cdk_code = "";
    form.member_level = null;
    form.duration_months = null;
    form.status = null;
    onSearch();
  }

  function handleSizeChange(val: number) {
    pagination.pageSize = val;
    onSearch();
  }

  function handleCurrentChange(val: number) {
    pagination.currentPage = val;
    onSearch();
  }

  function handleSelectionChange(rows: any[]) {
    selectedRows.value = rows;
  }

  /** Batch delete */
  async function handleBatchDelete() {
    if (selectedRows.value.length === 0) {
      message("请选择要删除的CDK", { type: "warning" });
      return;
    }
    const ids = selectedRows.value.map((r: any) => r.id);
    const { code } = await batchDeleteMemberCdks(ids);
    if (code === 0) {
      message("批量删除成功", { type: "success" });
      onSearch();
    }
  }

  /** Edit/Create dialog */
  function openDialog(title = "编辑", row?: any) {
    const isEdit = title === "编辑";
    addDialog({
      title: `${title}CDK`,
      props: {
        formInline: {
          cdk_code: row?.cdk_code ?? "",
          member_level: row?.member_level ?? 1,
          duration_months: row?.duration_months ?? 3,
          status: row?.status ?? 1,
          remark: row?.remark ?? ""
        }
      },
      width: "40%",
      draggable: true,
      closeOnClickModal: false,
      contentRenderer: () =>
        h(CdkFormComponent, {
          ref: cdkFormRef,
          formInline: null
        }),
      beforeSure: async (done, { options }) => {
        const FormRef = cdkFormRef.value.getRef();
        const curData = options.props.formInline;
        FormRef.validate(async (valid: boolean) => {
          if (valid) {
            if (isEdit) {
              const { code } = await updateMemberCdk(row.id, curData);
              if (code === 0) {
                message("修改成功", { type: "success" });
                done();
                onSearch();
              }
            } else {
              const { code } = await createMemberCdk(curData);
              if (code === 0) {
                message("创建成功", { type: "success" });
                done();
                onSearch();
              }
            }
          }
        });
      }
    });
  }

  /** Batch generate dialog */
  function openBatchDialog() {
    addDialog({
      title: "批量生成CDK",
      props: {
        formInline: {
          member_level: 1,
          duration_months: 3,
          count: 10,
          remark: ""
        }
      },
      width: "40%",
      draggable: true,
      closeOnClickModal: false,
      contentRenderer: () =>
        h(BatchFormComponent, {
          ref: cdkFormRef,
          formInline: null
        }),
      beforeSure: async (done, { options }) => {
        const FormRef = cdkFormRef.value.getRef();
        const curData = options.props.formInline;
        FormRef.validate(async (valid: boolean) => {
          if (valid) {
            const { code, data } = await batchCreateMemberCdks(curData);
            if (code === 0) {
              message(
                `成功生成 ${data?.count || curData.count} 个CDK (批次: ${data?.batch_no})`,
                { type: "success" }
              );
              done();
              onSearch();
            }
          }
        });
      }
    });
  }

  /** Delete */
  async function handleDelete(row: any) {
    const { code } = await deleteMemberCdk(row.id);
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
    openBatchDialog,
    handleDelete,
    levelMap,
    statusMap,
    durationOptions
  };
}

/** CDK form component for dialog */
const CdkFormComponent = defineComponent({
  name: "CdkForm",
  props: {
    formInline: {
      type: Object,
      default: () => ({})
    }
  },
  setup(props, { expose }) {
    const formRef = ref();
    const rules = {
      member_level: [
        { required: true, message: "请选择会员等级", trigger: "change" }
      ],
      duration_months: [
        { required: true, message: "请选择时长", trigger: "change" }
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
        <el-form-item label="CDK码" prop="cdk_code">
          <el-input
            v-model={props.formInline.cdk_code}
            placeholder="留空则自动生成"
          />
        </el-form-item>
        <el-form-item label="会员等级" prop="member_level">
          <el-radio-group v-model={props.formInline.member_level}>
            <el-radio value={1}>青铜</el-radio>
            <el-radio value={2}>黄金</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="时长" prop="duration_months">
          <el-select
            v-model={props.formInline.duration_months}
            placeholder="请选择"
          >
            {durationOptions.map(opt => (
              <el-option key={opt.value} label={opt.label} value={opt.value} />
            ))}
          </el-select>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model={props.formInline.status}>
            <el-radio value={1}>可用</el-radio>
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

/** Batch generate form component */
const BatchFormComponent = defineComponent({
  name: "BatchCdkForm",
  props: {
    formInline: {
      type: Object,
      default: () => ({})
    }
  },
  setup(props, { expose }) {
    const formRef = ref();
    const rules = {
      member_level: [
        { required: true, message: "请选择会员等级", trigger: "change" }
      ],
      duration_months: [
        { required: true, message: "请选择时长", trigger: "change" }
      ],
      count: [
        { required: true, message: "请输入数量", trigger: "blur" }
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
        <el-form-item label="会员等级" prop="member_level">
          <el-radio-group v-model={props.formInline.member_level}>
            <el-radio value={1}>青铜</el-radio>
            <el-radio value={2}>黄金</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="时长" prop="duration_months">
          <el-select
            v-model={props.formInline.duration_months}
            placeholder="请选择"
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
            max={200}
            step={1}
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
