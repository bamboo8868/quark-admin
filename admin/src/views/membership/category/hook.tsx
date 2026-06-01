import { message } from "@/utils/message";
import { addDialog } from "@/components/ReDialog";
import {
  getGameCategoryList,
  createGameCategory,
  updateGameCategory,
  deleteGameCategory
} from "@/api/gameCategory";
import { ref, reactive, onMounted, h, defineComponent } from "vue";
import type { PaginationProps } from "@pureadmin/table";

import Refresh from "~icons/ep/refresh";
import Delete from "~icons/ep/delete";
import EditPen from "~icons/ep/edit-pen";
import AddFill from "~icons/ri/add-circle-line";

export function useGameCategory() {
  const loading = ref(false);
  const formRef = ref();
  const categoryFormRef = ref();

  /** Search form */
  const form = reactive({
    name: "",
    visible: null as number | null
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
      label: "分类名称",
      prop: "name",
      minWidth: 150
    },
    {
      label: "图标",
      prop: "icon",
      minWidth: 100
    },
    {
      label: "排序",
      prop: "sort_order",
      minWidth: 80
    },
    {
      label: "是否显示",
      prop: "visible",
      minWidth: 100,
      cellRenderer: ({ row }) => (
        <el-tag type={row.visible === 1 ? "success" : "danger"} effect="plain">
          {row.visible === 1 ? "是" : "否"}
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

  /** Fetch categories */
  async function onSearch() {
    loading.value = true;
    try {
      const { code, data } = await getGameCategoryList({
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
      title: `${title}游戏分类`,
      props: {
        formInline: {
          name: row?.name ?? "",
          icon: row?.icon ?? "",
          sort_order: row?.sort_order ?? 0,
          visible: row?.visible ?? 1
        }
      },
      width: "40%",
      draggable: true,
      closeOnClickModal: false,
      contentRenderer: () =>
        h(CategoryFormComponent, {
          ref: categoryFormRef,
          formInline: null
        }),
      beforeSure: async (done, { options }) => {
        const FormRef = categoryFormRef.value.getRef();
        const curData = options.props.formInline;
        FormRef.validate(async (valid: boolean) => {
          if (valid) {
            if (isEdit) {
              const { code } = await updateGameCategory(row.id, curData);
              if (code === 0) {
                message("修改成功", { type: "success" });
                done();
                onSearch();
              }
            } else {
              const { code } = await createGameCategory(curData);
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
    const { code } = await deleteGameCategory(row.id);
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

/** Category form component for dialog */
const CategoryFormComponent = defineComponent({
  name: "GameCategoryForm",
  props: {
    formInline: {
      type: Object,
      default: () => ({})
    }
  },
  setup(props, { expose }) {
    const formRef = ref();
    const rules = {
      name: [{ required: true, message: "请输入分类名称", trigger: "blur" }],
      sort_order: [{ required: true, message: "请输入排序", trigger: "blur" }]
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
        <el-form-item label="分类名称" prop="name">
          <el-input
            v-model={props.formInline.name}
            placeholder="请输入分类名称"
          />
        </el-form-item>
        <el-form-item label="图标地址" prop="icon">
          <el-input
            v-model={props.formInline.icon}
            placeholder="请输入图标地址"
          />
        </el-form-item>
        <el-form-item label="排序" prop="sort_order">
          <el-input-number
            v-model={props.formInline.sort_order}
            min={0}
            max={9999}
            placeholder="请输入排序值"
          />
        </el-form-item>
        <el-form-item label="是否显示" prop="visible">
          <el-radio-group v-model={props.formInline.visible}>
            <el-radio value={1}>是</el-radio>
            <el-radio value={0}>否</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
    );
  }
});
