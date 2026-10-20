import { http } from "@/utils/http";

type Result = {
  code: number;
  message: string;
  data?: any;
};

export type SteamAccount = {
  username: string;
  password: string;
  shared_secret?: string;
  identity_secret?: string;
  type?: "adult" | "child";
};

export type FamilyProxy = {
  protocol: string;
  host: string;
  port: string | number;
};

export type CreateFamilyPayload = {
  primary: SteamAccount;
  family: SteamAccount[];
  familyName?: string;
  proxy?: FamilyProxy | null;
};

export type FamilyJobStatus = {
  jobId: string;
  status: "running" | "success" | "failed";
  logs: Array<{ time: string; msg: string; type: string }>;
  result?: any;
};

/** 开始组建家庭组（异步任务，返回 jobId） */
export const startCreateFamily = (data: CreateFamilyPayload) => {
  return http.request<Result>("post", "/api/steam/family/create", { data });
};

/** 轮询家庭组任务状态与日志 */
export const getFamilyJobStatus = (jobId: string) => {
  return http.request<Result>("get", `/api/steam/family/status/${jobId}`);
};
