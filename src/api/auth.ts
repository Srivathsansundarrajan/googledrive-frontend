import api from "./axios";

export interface LoginPayload {
  email: string;
  password: string;
}

export const loginApi = (data: LoginPayload) =>
  api.post("/auth/login", data);

export interface RegisterPayload {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

export const registerApi = (data: RegisterPayload) =>
  api.post("/auth/register", data);

export const activateApi = (token: string) =>
  api.get(`/auth/activate/${token}`);

export const forgotPasswordApi = (email: string) =>
  api.post("/auth/forgot-password", { email });

export const resetPasswordApi = (token: string, password: string) =>
  api.post(`/auth/reset-password/${token}`, { password });
