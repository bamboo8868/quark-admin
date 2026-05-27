import { http } from "@/utils/http";

type Result = {
  code: number;
  message: string;
  data?: Array<any>;
};

type ResultTable = {
  code: number;
  message: string;
  data?: {
    list: Array<any>;
    total?: number;
    pageSize?: number;
    currentPage?: number;
    accountId?: number;
    accountName?: string;
  };
};

// ==================== Email Accounts ====================

/** Get email accounts for current user */
export const getEmailAccounts = () => {
  return http.request<Result>("get", "/api/email/accounts");
};

/** Get single email account */
export const getEmailAccount = (id: number) => {
  return http.request<Result>("get", `/api/email/accounts/${id}`);
};

/** Create email account */
export const createEmailAccount = (data?: object) => {
  return http.request<Result>("post", "/api/email/accounts", { data });
};

/** Update email account */
export const updateEmailAccount = (id: number, data?: object) => {
  return http.request<Result>("put", `/api/email/accounts/${id}`, { data });
};

/** Delete email account */
export const deleteEmailAccount = (id: number) => {
  return http.request<Result>("delete", `/api/email/accounts/${id}`);
};

// ==================== Email List ====================

/** Fetch email list via IMAP */
export const getEmails = (data?: object) => {
  return http.request<ResultTable>("post", "/api/email/list", { data });
};

// ==================== Email Detail ====================

type ResultDetail = {
  code: number;
  message: string;
  data?: {
    id: number;
    subject: string;
    bodyHtml: string | null;
    bodyText: string | null;
    gameAccount: string | null;
    code: string | null;
  };
};

/** Get email detail with HTML body */
export const getEmailDetail = (id: number) => {
  return http.request<ResultDetail>("get", `/api/email/detail/${id}`);
};
