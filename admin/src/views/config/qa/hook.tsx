import { message } from "@/utils/message";
import { addDialog } from "@/components/ReDialog";
import { getQaList, createQa, updateQa, deleteQa } from "@/api/config";
import { ref, reactive, onMounted, h, defineComponent } from "vue";
import type { PaginationProps } from "@pureadmin/table";

export function useConfigQa() {
  const loading = ref(false);
  const formRef = ref();
  const qaFormRef = ref();

  /** Search form */
  const form = reactive({
    question: "",
    type: "" as string,
    status: "" as string | number
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
      label: "类型",
      prop: "type",
      width: 90,
      slot: "type"
    },
    {
      label: "问题",
      prop: "question",
      minWidth: 200,
      showOverflowTooltip: true
    },
    {
      label: "答案",
      prop: "answer",
      minWidth: 260,
      showOverflowTooltip: true
    },
    {
      label: "排序",
      prop: "sort",
      width: 80
    },
    {
      label: "状态",
      prop: "status",
      width: 90,
      slot: "status"
    },
    {
      label: "操作",
      fixed: "right",
      width: 160,
      slot: "operation"
    }
  ];

  async function onSearch() {
    loading.value = true;
    try {
      const { code, data } = await getQaList({
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
    form.question = "";
    form.type = "";
    form.status = "";
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
      title: `${title}QA`,
      props: {
        formInline: {
          type: row?.type ?? "offline",
          question: row?.question ?? "",
          answer: row?.answer ?? "",
          sort: row?.sort ?? 0,
          status: row?.status ?? 1
        }
      },
      width: "46%",
      draggable: true,
      closeOnClickModal: false,
      contentRenderer: () =>
        h(QaFormComponent, {
          ref: qaFormRef,
          formInline: null
        }),
      beforeSure: async (done, { options }) => {
        const FormRef = qaFormRef.value.getRef();
        const curData = options.props.formInline;
        FormRef.validate(async (valid: boolean) => {
          if (valid) {
            if (isEdit) {
              const { code } = await updateQa(row.id, curData);
              if (code === 0) {
                message("修改成功", { type: "success" });
                done();
                onSearch();
              }
            } else {
              const { code } = await createQa(curData);
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
    const { code } = await deleteQa(row.id);
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
    openDialog,
    handleDelete
  };
}

/** QA form component for dialog (type + question + answer + sort + status) */
const QaFormComponent = defineComponent({
  name: "ConfigQaForm",
  props: {
    formInline: {
      type: Object,
      default: () => ({})
    }
  },
  setup(props, { expose }) {
    const formRef = ref();
    const rules = {
      question: [{ required: true, message: "请输入问题", trigger: "blur" }]
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
        <el-form-item label="类型" prop="type">
          <el-select v-model={props.formInline.type} placeholder="请选择类型">
            <el-option label="离线" value="offline" />
            <el-option label="租号" value="rent" />
          </el-select>
        </el-form-item>
        <el-form-item label="问题" prop="question">
          <el-input
            v-model={props.formInline.question}
            type="textarea"
            rows={2}
            placeholder="请输入问题"
          />
        </el-form-item>
        <el-form-item label="答案" prop="answer">
          <el-input
            v-model={props.formInline.answer}
            type="textarea"
            rows={5}
            placeholder="请输入答案"
          />
        </el-form-item>
        <el-form-item label="排序" prop="sort">
          <el-input-number v-model={props.formInline.sort} min={0} />
          <span
            style={{ marginLeft: "8px", color: "var(--el-text-color-secondary)" }}
          >
            数值越小越靠前
          </span>
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
      </el-form>
    );
  }
});
