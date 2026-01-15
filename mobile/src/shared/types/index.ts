// Common/shared types that are used across multiple domains

// UI and component types
export interface BaseComponentProps {
  testID?: string;
  style?: any;
  children?: React.ReactNode;
}

export interface LoadingStateType {
  isLoading: boolean;
  error?: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  hasNextPage: boolean;
}

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

// Navigation types (for type-safe routing)
export type RootStackParamList = {
  "(tabs)": undefined;
  "not-found": undefined;
  settings: undefined;
};

export type TabParamList = {
  index: undefined;
  timeline: undefined;
  feeds: undefined;
  "create-post": undefined;
};

// Theme and styling types
export interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  error: string;
  success: string;
  warning: string;
}

export interface Spacing {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
}

export interface BorderRadius {
  sm: number;
  md: number;
  lg: number;
  full: number;
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> &
  { [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>> }[Keys];
