export interface PaginationMeta {
  currentPage?: number;
  numberOfPages?: number;
  limit?: number;
  nextPage?: number | null;
  total?: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  meta?: {
    pagination?: PaginationMeta;
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
    [key: string]: any;
  };
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: string | string[] | Record<string, string>;
}

export interface User {
  _id: string;
  name: string;
  username: string;
  email: string;
  photo?: string;
  cover?: string;
  followersCount?: number;
  followingCount?: number;
  bio?: string;
  createdAt?: string;
  isFollowing?: boolean;
  followers?: any[];
  following?: any[];
  bookmarks?: string[];
  [key: string]: any;
}

export interface AuthData {
  token: string;
  tokenType: string;
  expiresIn: string;
  user: User;
}
