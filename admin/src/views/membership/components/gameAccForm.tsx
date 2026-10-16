import { ref, defineComponent } from "vue";

/** 游戏账号表单组件（membership/game-account 与 membership/game 共用）
 *  lockGame=true 时关联游戏只读展示（从游戏管理行新增账号场景），game_id 由外部注入 */
export const GameAccFormComponent = defineComponent({
  name: "GameAccForm",
  props: {
    formInline: {
      type: Object,
      default: () => ({})
    },
    gameOptions: {
      type: Array,
      default: () => []
    },
    lockGame: {
      type: Boolean,
      default: false
    },
    gameName: {
      type: String,
      default: ""
    }
  },
  setup(props, { expose }) {
    const formRef = ref();
    const rules = {
      game_id: [{ required: true, message: "请选择游戏", trigger: "change" }],
      account: [{ required: true, message: "请输入账号", trigger: "blur" }]
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
        <el-form-item label="关联游戏" prop="game_id">
          {props.lockGame ? (
            <el-input modelValue={props.gameName} disabled />
          ) : (
            <el-select
              v-model={props.formInline.game_id}
              placeholder="请选择游戏"
              clearable
              filterable
              style="width: 100%"
            >
              {props.gameOptions.map((opt: any) => (
                <el-option key={opt.value} label={opt.label} value={opt.value} />
              ))}
            </el-select>
          )}
        </el-form-item>
        <el-form-item label="账号" prop="account">
          <el-input
            v-model={props.formInline.account}
            placeholder="请输入账号"
          />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model={props.formInline.password}
            placeholder="请输入密码"
          />
        </el-form-item>
        <el-form-item label="密钥" prop="secret">
          <el-input
            v-model={props.formInline.secret}
            placeholder="请输入密钥/令牌"
          />
        </el-form-item>
        <el-form-item label="等级" prop="level">
          <el-input-number
            v-model={props.formInline.level}
            min={0}
            max={999}
          />
        </el-form-item>
        <el-form-item label="平台" prop="platform">
          <el-input
            v-model={props.formInline.platform}
            placeholder="如 Steam/Epic"
          />
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

export default GameAccFormComponent;
