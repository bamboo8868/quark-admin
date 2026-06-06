import { message } from "@/utils/message";
import { addDialog } from "@/components/ReDialog";
import {
  getGameList,
  createGame,
  updateGame,
  deleteGame
} from "@/api/game";
import {
  getGameCategoryList
} from "@/api/gameCategory";
import {
  getGameTagList
} from "@/api/gameTag";
import { ref, reactive, onMounted, h, defineComponent } from "vue";
import type { PaginationProps } from "@pureadmin/table";

export function useGame() {
  const loading = ref(false);
  const formRef = ref();
  const gameFormRef = ref();

  /** Category and tag options for dropdowns */
  const categoryOptions = ref([]);
  const tagOptions = ref([]);

  /** Search form */
  const form = reactive({
    name: "",
    category_id: null as number | null
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
      label: "游戏名称",
      prop: "name",
      minWidth: 150
    },
    {
      label: "描述",
      prop: "desc",
      minWidth: 200,
      showOverflowTooltip: true
    },
    {
      label: "图片",
      prop: "img_url",
      minWidth: 120
    },
    {
      label: "分类",
      prop: "category_name",
      minWidth: 120
    },
    {
      label: "标签",
      prop: "tag_names",
      minWidth: 180,
      cellRenderer: ({ row }) => (
        <div class="flex flex-wrap gap-1 justify-center">
          {(row.tag_names || []).map((name: string, idx: number) => (
            <el-tag key={idx} size="small" type="info" effect="plain">
              {name}
            </el-tag>
          ))}
        </div>
      )
    },
    {
      label: "会员等级",
      prop: "member_level",
      minWidth: 90,
      cellRenderer: ({ row }) => (
        <el-tag type={row.member_level > 0 ? "warning" : "info"} effect="plain">
          {row.member_level === 0 ? "免费" : `Lv.${row.member_level}`}
        </el-tag>
      )
    },
    {
      label: "详情页",
      prop: "detail_url",
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
      width: 160,
      slot: "operation"
    }
  ];

  /** Fetch games */
  async function onSearch() {
    loading.value = true;
    try {
      const { code, data } = await getGameList({
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

  /** Load categories and tags for dropdowns */
  async function loadOptions() {
    try {
      const [catRes, tagRes] = await Promise.all([
        getGameCategoryList({ page: 1, limit: 200 }),
        getGameTagList({ page: 1, limit: 200 })
      ]);
      if (catRes.code === 0) {
        categoryOptions.value = (catRes.data?.list || []).map(c => ({
          label: c.name,
          value: c.id
        }));
      }
      if (tagRes.code === 0) {
        tagOptions.value = (tagRes.data?.list || []).map(t => ({
          label: t.name,
          value: t.id
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
      title: `${title}游戏`,
      props: {
        formInline: {
          name: row?.name ?? "",
          desc: row?.desc ?? "",
          img_url: row?.img_url ?? "",
          category_id: row?.category_id ?? null,
          tag_ids: row?.tag_ids ?? [],
          member_level: row?.member_level ?? 0,
          detail_url: row?.detail_url ?? ""
        }
      },
      width: "50%",
      draggable: true,
      closeOnClickModal: false,
      contentRenderer: () =>
        h(GameFormComponent, {
          ref: gameFormRef,
          formInline: null,
          categoryOptions: categoryOptions.value,
          tagOptions: tagOptions.value
        }),
      beforeSure: async (done, { options }) => {
        const FormRef = gameFormRef.value.getRef();
        const curData = options.props.formInline;
        FormRef.validate(async (valid: boolean) => {
          if (valid) {
            if (isEdit) {
              const { code } = await updateGame(row.id, curData);
              if (code === 0) {
                message("修改成功", { type: "success" });
                done();
                onSearch();
              }
            } else {
              const { code } = await createGame(curData);
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
    const { code } = await deleteGame(row.id);
    if (code === 0) {
      message("删除成功", { type: "success" });
      onSearch();
    }
  }

  onMounted(() => {
    loadOptions();
    onSearch();
  });

  return {
    loading,
    form,
    formRef,
    dataList,
    columns,
    pagination,
    categoryOptions,
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
  name: "GameForm",
  props: {
    formInline: {
      type: Object,
      default: () => ({})
    },
    categoryOptions: {
      type: Array,
      default: () => []
    },
    tagOptions: {
      type: Array,
      default: () => []
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
        <el-form-item label="描述" prop="desc">
          <el-input
            v-model={props.formInline.desc}
            type="textarea"
            rows={3}
            placeholder="请输入游戏描述"
          />
        </el-form-item>
        <el-form-item label="图片地址" prop="img_url">
          <el-input
            v-model={props.formInline.img_url}
            placeholder="请输入图片地址"
          />
        </el-form-item>
        <el-form-item label="游戏分类" prop="category_id">
          <el-select
            v-model={props.formInline.category_id}
            placeholder="请选择分类"
            clearable
            style="width: 100%"
          >
            {props.categoryOptions.map((opt: any) => (
              <el-option key={opt.value} label={opt.label} value={opt.value} />
            ))}
          </el-select>
        </el-form-item>
        <el-form-item label="游戏标签" prop="tag_ids">
          <el-select
            v-model={props.formInline.tag_ids}
            multiple
            placeholder="请选择标签"
            clearable
            style="width: 100%"
          >
            {props.tagOptions.map((opt: any) => (
              <el-option key={opt.value} label={opt.label} value={opt.value} />
            ))}
          </el-select>
        </el-form-item>
        <el-form-item label="会员等级" prop="member_level">
          <el-input-number
            v-model={props.formInline.member_level}
            min={0}
            max={10}
            placeholder="0=免费"
          />
        </el-form-item>
        <el-form-item label="详情页" prop="detail_url">
          <el-input
            v-model={props.formInline.detail_url}
            placeholder="请输入详情页地址"
          />
        </el-form-item>
      </el-form>
    );
  }
});
