import { message } from "@/utils/message";
import { addDialog } from "@/components/ReDialog";
import {
  getRentGameList,
  createRentGame,
  updateRentGame,
  deleteRentGame
} from "@/api/rent";
import { ref, reactive, onMounted, h, defineComponent } from "vue";
import type { PaginationProps } from "@pureadmin/table";

export function useRentGame() {
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
      width: 160,
      slot: "operation"
    }
  ];

  async function onSearch() {
    loading.value = true;
    try {
      const { code, data } = await getRentGameList({
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
              const { code } = await updateRentGame(row.id, curData);
              if (code === 0) {
                message("修改成功", { type: "success" });
                done();
                onSearch();
              }
            } else {
              const { code } = await createRentGame(curData);
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
    const { code } = await deleteRentGame(row.id);
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

/** Game form component for dialog */
const GameFormComponent = defineComponent({
  name: "RentGameForm",
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
