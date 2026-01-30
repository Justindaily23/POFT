import type { RoleName } from "@/enums/roles";

export interface LoginResponse {
  access_token: string;
  role: RoleName;
  permissions: string[];
  mustChangePassword: boolean;
}

export interface User {
  role: RoleName;
  permissions: string[];
  mustChangePassword: boolean;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface User {
  role: RoleName;
  permissions: string[];
  mustChangePassword: boolean;
}

export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
}

export interface Permission {
  id: string;
  code: string;
}

export interface PurchaseOrder {
  id: string;
  duid: string;
  projectName: string;
  projectCode: string;
  poTypeId: string;
  poType: POType;
  prNumber: string;
  poNumber: string;
  poIssuedDate: string;
  pm: string;
  poLines: PurchaseOrderLine[];
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderLine {
  id: string;
  purchaseOrderId: string;
  poLineNumber: string;
  itemCode: string;
  itemDescription: string;
  unitPrice: number;
  requestedQuantity: number;
  poLineAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface POType {
  id: string;
  code: string;
  name: string;
  description?: string;
}
