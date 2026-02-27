import apiClient from "@/api/auth/axios";

export const amendContract = async (payload: {
  purchaseOrderLineId: string;
  newContractAmount: number;
  reason: string;
}) => {
  const { data } = await apiClient.post("/contract-amendments", payload);
  return data; // Returns { amendment, updatedPoLine }
};
