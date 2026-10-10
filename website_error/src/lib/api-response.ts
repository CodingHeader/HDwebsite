export interface ApiResponse<T = unknown> {
  code: number;
  data: T;
  message: string;
}

export function success<T>(data: T, message = '操作成功'): ApiResponse<T> {
  return {
    code: 200,
    data,
    message,
  };
}

export function error(message: string, code = 400): ApiResponse<null> {
  return {
    code,
    data: null,
    message,
  };
}

export function unauthorized(message = '未授权访问'): ApiResponse<null> {
  return {
    code: 401,
    data: null,
    message,
  };
}

export function notFound(message = '资源不存在'): ApiResponse<null> {
  return {
    code: 404,
    data: null,
    message,
  };
}

export function forbidden(message = '权限不足'): ApiResponse<null> {
  return {
    code: 403,
    data: null,
    message,
  };
}

export function serverError(message = '服务器错误'): ApiResponse<null> {
  return {
    code: 500,
    data: null,
    message,
  };
}
