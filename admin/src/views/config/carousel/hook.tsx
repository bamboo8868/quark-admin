import { message } from "@/utils/message";
import { addDialog } from "@/components/ReDialog";
import {
  getCarouselList,
  createCarousel,
  updateCarousel,
  deleteCarousel
} from "@/api/config";
import { ref, reactive, onMounted, h, defineComponent } from "vue";
import type { PaginationProps } from "@pureadmin/table";

export function useConfigCarousel() {
  const loading = ref(false);
  const formRef = ref();
  const carouselFormRef = ref();

  /** Search form */
  const form = reactive({
    title: "",
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
      label: "图片",
      prop: "image",
      width: 150,
      slot: "image",
      showOverflowTooltip: false
    },
    {
      label: "标题",
      prop: "title",
      minWidth: 140
    },
    {
      label: "链接",
      prop: "link",
      minWidth: 220,
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
      const { code, data } = await getCarouselList({
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
    form.title = "";
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
      title: `${title}轮播图`,
      props: {
        formInline: {
          title: row?.title ?? "",
          image: row?.image ?? "",
          link: row?.link ?? "",
          sort: row?.sort ?? 0,
          status: row?.status ?? 1
        }
      },
      width: "42%",
      draggable: true,
      closeOnClickModal: false,
      contentRenderer: () =>
        h(CarouselFormComponent, {
          ref: carouselFormRef,
          formInline: null
        }),
      beforeSure: async (done, { options }) => {
        const FormRef = carouselFormRef.value.getRef();
        const curData = options.props.formInline;
        FormRef.validate(async (valid: boolean) => {
          if (valid) {
            if (isEdit) {
              const { code } = await updateCarousel(row.id, curData);
              if (code === 0) {
                message("修改成功", { type: "success" });
                done();
                onSearch();
              }
            } else {
              const { code } = await createCarousel(curData);
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
    const { code } = await deleteCarousel(row.id);
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

/** Carousel form component for dialog (base64 image + title + link + sort + status) */
const CarouselFormComponent = defineComponent({
  name: "ConfigCarouselForm",
  props: {
    formInline: {
      type: Object,
      default: () => ({})
    }
  },
  setup(props, { expose }) {
    const formRef = ref();
    const rules = {
      image: [{ required: true, message: "请上传轮播图片", trigger: "change" }],
      link: [{ required: true, message: "请输入跳转链接", trigger: "blur" }]
    };

    const getRef = () => formRef.value;
    expose({ getRef });

    /** Read the picked file as a base64 data URL; never auto-upload */
    const handleBeforeUpload = (file: File) => {
      if (!file.type.startsWith("image/")) {
        message("只能上传图片文件", { type: "warning" });
        return false;
      }
      if (file.size / 1024 / 1024 >= 2) {
        message("图片大小不能超过 2MB", { type: "warning" });
        return false;
      }
      const reader = new FileReader();
      reader.onload = e => {
        props.formInline.image = e.target?.result as string;
      };
      reader.readAsDataURL(file);
      return false;
    };

    return () => (
      <el-form
        ref={formRef}
        model={props.formInline}
        rules={rules}
        label-width="90px"
      >
        <el-form-item label="轮播图片" prop="image">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <el-upload
              accept="image/*"
              show-file-list={false}
              before-upload={handleBeforeUpload}
            >
              <el-button type="primary" plain>
                {props.formInline.image ? "更换图片" : "选择图片"}
              </el-button>
            </el-upload>
            {props.formInline.image ? (
              <>
                <el-image
                  src={props.formInline.image}
                  fit="cover"
                  preview-src-list={[props.formInline.image]}
                  preview-teleported
                  style={{
                    width: "160px",
                    height: "80px",
                    borderRadius: "4px",
                    border: "1px solid var(--el-border-color)"
                  }}
                />
                <el-button
                  link
                  type="danger"
                  onClick={() => (props.formInline.image = "")}
                >
                  移除
                </el-button>
              </>
            ) : null}
          </div>
        </el-form-item>
        <el-form-item label="标题" prop="title">
          <el-input
            v-model={props.formInline.title}
            placeholder="请输入标题（可选）"
          />
        </el-form-item>
        <el-form-item label="跳转链接" prop="link">
          <el-input
            v-model={props.formInline.link}
            placeholder="请输入跳转链接，如 https://example.com"
          />
        </el-form-item>
        <el-form-item label="排序" prop="sort">
          <el-input-number v-model={props.formInline.sort} min={0} />
          <span style={{ marginLeft: "8px", color: "var(--el-text-color-secondary)" }}>
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
