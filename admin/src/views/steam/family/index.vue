<script setup lang="ts">
import { ref, reactive, computed, nextTick, onBeforeUnmount } from "vue";
import { message } from "@/utils/message";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import {
  startCreateFamily,
  getFamilyJobStatus,
  type SteamAccount
} from "@/api/steamFamily";

import AddFill from "~icons/ri/add-circle-line";
import Delete from "~icons/ep/delete";
import Refresh from "~icons/ep/refresh";
import Upload from "~icons/ri/upload-2-line";

defineOptions({
  name: "SteamFamily"
});

const MAX_FAMILY_ACCOUNTS = 5;

const emptyAccount = (type?: "adult" | "child"): SteamAccount => ({
  username: "",
  password: "",
  shared_secret: "",
  identity_secret: "",
  ...(type ? { type } : {})
});

// 主账号
const primary = reactive<SteamAccount>(emptyAccount());
// 家庭账号
const family = reactive<SteamAccount[]>([]);
// 家庭组名称
const familyName = ref("SteamFamily");
// 代理设置（可选）
const proxy = reactive({
  enabled: false,
  protocol: "http",
  host: "",
  port: "10808"
});

const canAddFamily = computed(() => family.length < MAX_FAMILY_ACCOUNTS);

function addFamilyAccount() {
  if (!canAddFamily.value) return;
  family.push(emptyAccount("child"));
}

function removeFamilyAccount(index: number) {
  family.splice(index, 1);
}

// ==================== SDA / maFile 导入 ====================

// account_name(小写) -> { shared_secret, identity_secret }
const sdaMap = ref<
  Record<string, { shared_secret: string; identity_secret: string }>
>({});

/** 按用户名从已导入的 maFile 中匹配并填充密钥 */
function matchSda(acc: SteamAccount) {
  const key = (acc.username || "").trim().toLowerCase();
  if (!key) return false;
  const hit = sdaMap.value[key];
  if (!hit) return false;
  acc.shared_secret = hit.shared_secret;
  acc.identity_secret = hit.identity_secret;
  return true;
}

function hasShared(acc: SteamAccount) {
  return !!(acc.shared_secret && acc.shared_secret.trim());
}

function hasIdentity(acc: SteamAccount) {
  return !!(acc.identity_secret && acc.identity_secret.trim());
}

/** 为单个账号选择并解析 SDA/maFile，直接填充其 shared_secret / identity_secret */
function handleImportSdaForAccount(acc: SteamAccount) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json,.mafile";
  input.onchange = async (e: Event) => {
    const files = (e.target as HTMLInputElement).files;
    if (!files || files.length === 0) return;
    const file = files[0];
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const rawItems = Array.isArray(json) ? json : json.accounts || [json];
      const items = rawItems.filter(it => String(it.account_name || "").trim());
      if (items.length === 0) {
        message("文件中没有有效的 account_name 数据", { type: "warning" });
        return;
      }
      // 若已填用户名则优先按 account_name 匹配，否则取第一个
      const uname = (acc.username || "").trim().toLowerCase();
      const hit =
        (uname &&
          items.find(
            it => String(it.account_name).trim().toLowerCase() === uname
          )) ||
        items[0];

      const name = String(hit.account_name).trim();
      acc.shared_secret = String(hit.shared_secret || "").trim();
      acc.identity_secret = String(hit.identity_secret || "").trim();
      if (!acc.username) acc.username = name;

      // 同步进全局映射，便于用户名变更时再次自动匹配
      sdaMap.value[name.toLowerCase()] = {
        shared_secret: acc.shared_secret,
        identity_secret: acc.identity_secret
      };
      message(`已导入 ${name} 的密钥`, { type: "success" });
    } catch (err: any) {
      message(err?.message || "文件解析失败", { type: "error" });
    }
  };
  input.click();
}

// ==================== 任务状态 / 日志 ====================

type LogLine = { time: string; msg: string; type: string };

const running = ref(false);
const status = ref<"" | "running" | "success" | "failed">("");
const logs = ref<LogLine[]>([]);
const logBox = ref<HTMLElement | null>(null);
let pollTimer: ReturnType<typeof setInterval> | null = null;
let currentJobId = "";

function scrollLogToBottom() {
  nextTick(() => {
    if (logBox.value) logBox.value.scrollTop = logBox.value.scrollHeight;
  });
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function logTypeClass(type: string) {
  switch (type) {
    case "success":
      return "log-success";
    case "error":
      return "log-error";
    case "warn":
      return "log-warn";
    default:
      return "log-info";
  }
}

async function pollStatus() {
  if (!currentJobId) return;
  try {
    const res = await getFamilyJobStatus(currentJobId);
    const data = res.data;
    if (!data) return;
    logs.value = data.logs || [];
    status.value = data.status;
    scrollLogToBottom();
    if (data.status !== "running") {
      stopPolling();
      running.value = false;
      if (data.status === "success") {
        const gid = data.result?.familyGroupId;
        message(gid ? `家庭组创建完成 (ID: ${gid})` : "家庭组创建完成", {
          type: "success"
        });
      } else {
        message(data.result?.error || "家庭组创建失败", { type: "error" });
      }
    }
  } catch {
    // getStatus 在任务过期时会返回 code>0 并被 http 拦截器拒绝，这里静默停止轮询
    stopPolling();
    running.value = false;
  }
}

function validate(): string | null {
  if (!primary.username.trim() || !primary.password.trim()) {
    return "请填写主账号的用户名和密码";
  }
  for (let i = 0; i < family.length; i++) {
    const acc = family[i];
    if (!acc.username.trim() || !acc.password.trim()) {
      return `家庭账号 #${i + 1} 缺少用户名或密码`;
    }
  }
  return null;
}

async function handleStart() {
  const err = validate();
  if (err) {
    message(err, { type: "warning" });
    return;
  }

  running.value = true;
  status.value = "running";
  logs.value = [];
  stopPolling();

  try {
    const res = await startCreateFamily({
      primary: { ...primary },
      family: family.map(a => ({ ...a })),
      familyName: familyName.value || "SteamFamily",
      proxy:
        proxy.enabled && proxy.host.trim()
          ? { protocol: proxy.protocol, host: proxy.host, port: proxy.port }
          : null
    });
    currentJobId = res.data?.jobId || "";
    if (!currentJobId) {
      running.value = false;
      status.value = "failed";
      message("未获取到任务ID", { type: "error" });
      return;
    }
    pollTimer = setInterval(pollStatus, 2000);
    pollStatus();
  } catch {
    running.value = false;
    status.value = "failed";
  }
}

function handleReset() {
  stopPolling();
  running.value = false;
  status.value = "";
  logs.value = [];
  currentJobId = "";
  Object.assign(primary, emptyAccount());
  family.splice(0, family.length);
  familyName.value = "SteamFamily";
  proxy.enabled = false;
  proxy.protocol = "http";
  proxy.host = "";
  proxy.port = "10808";
}

const statusText = computed(() => {
  switch (status.value) {
    case "running":
      return "执行中";
    case "success":
      return "已完成";
    case "failed":
      return "失败";
    default:
      return "未开始";
  }
});

const statusTagType = computed(() => {
  switch (status.value) {
    case "running":
      return "warning";
    case "success":
      return "success";
    case "failed":
      return "danger";
    default:
      return "info";
  }
});

onBeforeUnmount(() => stopPolling());
</script>

<template>
  <div class="main">
    <el-card shadow="never" class="mb-4">
      <template #header>
        <div class="card-header">
          <span class="title">组建家庭组</span>
          <el-tag :type="statusTagType" size="small">{{ statusText }}</el-tag>
        </div>
      </template>

      <el-alert
        type="info"
        :closable="false"
        show-icon
        class="mb-4"
        title="说明"
        description="填写 1 个主账号与最多 5 个家庭账号的用户名与密码。每个账号后的“导入 SDA”按钮可选择对应的 maFile（.json / .mafile），自动填充该账号的 shared_secret / identity_secret。整个流程耗时可能数分钟，开始后请勿关闭页面。"
      />

      <!-- 主账号 -->
      <el-divider content-position="left">主账号</el-divider>
      <div class="acc-toolbar">
        <el-button
          size="small"
          type="success"
          :icon="useRenderIcon(Upload)"
          @click="handleImportSdaForAccount(primary)"
        >
          导入 SDA
        </el-button>
      </div>
      <el-form :model="primary" label-width="120px" class="acc-form">
        <el-row :gutter="16">
          <el-col :xs="24" :sm="12" :md="6">
            <el-form-item label="用户名">
              <el-input
                v-model="primary.username"
                placeholder="Steam 用户名"
                clearable
                @change="matchSda(primary)"
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6">
            <el-form-item label="密码">
              <el-input
                v-model="primary.password"
                type="password"
                show-password
                placeholder="Steam 密码"
                clearable
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6">
            <el-form-item label="shared_secret">
              <div class="secret-cell">
                <el-input
                  v-model="primary.shared_secret"
                  placeholder="导入 SDA 自动填充"
                  readonly
                />
                <el-tag
                  :type="hasShared(primary) ? 'success' : 'info'"
                  size="small"
                >
                  {{ hasShared(primary) ? "已导入" : "未导入" }}
                </el-tag>
              </div>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6">
            <el-form-item label="identity_secret">
              <div class="secret-cell">
                <el-input
                  v-model="primary.identity_secret"
                  placeholder="导入 SDA 自动填充"
                  readonly
                />
                <el-tag
                  :type="hasIdentity(primary) ? 'success' : 'info'"
                  size="small"
                >
                  {{ hasIdentity(primary) ? "已导入" : "未导入" }}
                </el-tag>
              </div>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <!-- 家庭账号 -->
      <el-divider content-position="left">
        家庭账号（{{ family.length }}/{{ MAX_FAMILY_ACCOUNTS }}）
      </el-divider>
      <div v-if="family.length === 0" class="empty-tip">
        暂未添加家庭账号，仅创建/使用主账号的家庭组。
      </div>
      <div v-for="(acc, index) in family" :key="index" class="family-box">
        <div class="family-box-header">
          <span>家庭账号 #{{ index + 1 }}</span>
          <div class="header-actions">
            <el-button
              link
              type="success"
              :icon="useRenderIcon(Upload)"
              @click="handleImportSdaForAccount(acc)"
            >
              导入 SDA
            </el-button>
            <el-button
              link
              type="danger"
              :icon="useRenderIcon(Delete)"
              @click="removeFamilyAccount(index)"
            >
              移除
            </el-button>
          </div>
        </div>
        <el-form :model="acc" label-position="top" class="acc-form">
          <el-row :gutter="16">
            <el-col :xs="24" :sm="12" :md="5">
              <el-form-item label="用户名">
                <el-input
                  v-model="acc.username"
                  placeholder="Steam 用户名"
                  clearable
                  @change="matchSda(acc)"
                />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="5">
              <el-form-item label="密码">
                <el-input
                  v-model="acc.password"
                  type="password"
                  show-password
                  placeholder="Steam 密码"
                  clearable
                />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="4">
              <el-form-item label="角色">
                <el-select v-model="acc.type" placeholder="请选择角色">
                  <el-option label="成人 (adult)" value="adult" />
                  <el-option label="儿童 (child)" value="child" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="5">
              <el-form-item label="shared_secret">
                <div class="secret-cell">
                  <el-input
                    v-model="acc.shared_secret"
                    placeholder="导入 SDA 自动填充"
                    readonly
                  />
                  <el-tag
                    :type="hasShared(acc) ? 'success' : 'info'"
                    size="small"
                  >
                    {{ hasShared(acc) ? "已导入" : "未导入" }}
                  </el-tag>
                </div>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="5">
              <el-form-item label="identity_secret">
                <div class="secret-cell">
                  <el-input
                    v-model="acc.identity_secret"
                    placeholder="导入 SDA 自动填充"
                    readonly
                  />
                  <el-tag
                    :type="hasIdentity(acc) ? 'success' : 'info'"
                    size="small"
                  >
                    {{ hasIdentity(acc) ? "已导入" : "未导入" }}
                  </el-tag>
                </div>
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </div>
      <el-button
        class="mt-2"
        :icon="useRenderIcon(AddFill)"
        :disabled="!canAddFamily"
        @click="addFamilyAccount"
      >
        添加家庭账号
      </el-button>

      <!-- 家庭组名称 + 代理 -->
      <el-divider content-position="left">其它设置</el-divider>
      <el-form label-width="120px" class="acc-form">
        <el-row :gutter="16">
          <el-col :xs="24" :sm="12" :md="8">
            <el-form-item label="家庭组名称">
              <el-input
                v-model="familyName"
                placeholder="SteamFamily"
                clearable
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8">
            <el-form-item label="使用代理">
              <el-switch v-model="proxy.enabled" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row v-if="proxy.enabled" :gutter="16">
          <el-col :xs="24" :sm="8" :md="4">
            <el-form-item label="协议">
              <el-select v-model="proxy.protocol">
                <el-option label="http" value="http" />
                <el-option label="socks5" value="socks5" />
                <el-option label="socks4" value="socks4" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="16" :md="8">
            <el-form-item label="代理地址">
              <el-input
                v-model="proxy.host"
                placeholder="127.0.0.1"
                clearable
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6">
            <el-form-item label="端口">
              <el-input v-model="proxy.port" placeholder="10808" clearable />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <div class="actions">
        <el-button type="primary" :loading="running" @click="handleStart">
          开始创建
        </el-button>
        <el-button
          :icon="useRenderIcon(Refresh)"
          :disabled="running"
          @click="handleReset"
        >
          重置
        </el-button>
      </div>
    </el-card>

    <!-- 日志 -->
    <el-card shadow="never">
      <template #header>
        <span class="title">执行日志</span>
      </template>
      <div ref="logBox" class="log-box">
        <div v-if="logs.length === 0" class="empty-tip">暂无日志</div>
        <div
          v-for="(line, i) in logs"
          :key="i"
          class="log-line"
          :class="logTypeClass(line.type)"
        >
          <span class="log-time">{{ line.time }}</span>
          <span class="log-msg">{{ line.msg }}</span>
        </div>
      </div>
    </el-card>
  </div>
</template>

<style lang="scss" scoped>
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.title {
  font-weight: 600;
}

.acc-form {
  :deep(.el-form-item) {
    margin-bottom: 12px;
  }
}

.acc-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.secret-cell {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 100%;

  :deep(.el-input) {
    flex: 1;
  }
}

.family-box {
  padding: 12px 12px 0;
  margin-bottom: 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
}

.family-box-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  font-weight: 500;
}

.empty-tip {
  padding: 8px 0;
  color: var(--el-text-color-secondary);
}

.actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.log-box {
  height: 360px;
  padding: 12px;
  overflow-y: auto;
  font-family: "Consolas", "Monaco", monospace;
  font-size: 12px;
  line-height: 1.7;
  background: var(--el-fill-color-light);
  border-radius: 6px;
}

.log-line {
  display: flex;
  gap: 8px;
}

.log-time {
  flex-shrink: 0;
  color: var(--el-text-color-secondary);
}

.log-info .log-msg {
  color: var(--el-text-color-primary);
}

.log-success .log-msg {
  color: var(--el-color-success);
}

.log-error .log-msg {
  color: var(--el-color-danger);
}

.log-warn .log-msg {
  color: var(--el-color-warning);
}
</style>
