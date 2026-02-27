import type { POLineSearchResponseData } from "../../types/fund-request/fundRequest.type";
import type { CreateFundRequestInput } from "./schema";

export function mapPOLineToCreateFundRequest(
  poLine: POLineSearchResponseData,
  formValues: CreateFundRequestInput,
) {
  return {
    duid: poLine.duid,
    poNumber: poLine.poNumber || undefined,
    prNumber: poLine.prNumber || undefined,
    poLineNumber: poLine.poLineNumber || undefined,
    itemDescription: poLine.itemDescription || undefined,
    requestPurpose: formValues.requestPurpose, // user input
    poTypeId: poLine.poTypeId || undefined,
    projectName: poLine.projectName || undefined,
    projectCode: poLine.projectCode || undefined,
    itemCode: poLine.itemCode || undefined,
    unitPrice: poLine.unitPrice || undefined,
    requestedQuantity: poLine.requestedQuantity || undefined,
    poLineAmount: poLine.poLineAmount || undefined,
    pm: poLine.pm || undefined,
    pmId: poLine.pmId || undefined,
    requestedAmount: formValues.requestedAmount, // user input
    poIssuedDate: poLine.poIssuedDate || undefined,
    contractAmount: poLine.contractAmount || undefined,
  };
}
