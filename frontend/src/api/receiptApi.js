import API from "./axios";

export const scanReceipt = async (file, { onUploadProgress } = {}) => {
  const formData = new FormData();
  formData.append("receipt", file);

  const res = await API.post("/receipts/scan", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress,
  });
  return res.data;
};

export const getReceipts = async (params = {}) => {
  const res = await API.get("/receipts", { params });
  return res.data;
};

export const getReceipt = async (id) => {
  const res = await API.get(`/receipts/${id}`);
  return res.data;
};

/**
 * The receipt image endpoint requires the Authorization bearer header, so a
 * plain <img src="..."> won't work — fetch it as a blob and hand back an
 * object URL instead (mirrors reportApi.js's downloadReport approach).
 */
export const fetchReceiptImageBlob = async (id) => {
  const res = await API.get(`/receipts/${id}/image`, {
    responseType: "blob",
  });
  return URL.createObjectURL(res.data);
};

export const updateReceiptFields = async (id, patch) => {
  const res = await API.put(`/receipts/${id}`, patch);
  return res.data;
};

export const confirmReceipt = async (id, data) => {
  const res = await API.post(`/receipts/${id}/confirm`, data);
  return res.data;
};

export const deleteReceipt = async (id) => {
  const res = await API.delete(`/receipts/${id}`);
  return res.data;
};

export const checkOCRHealth = async () => {
  const res = await API.get("/receipts/ocr-health");
  return res.data;
};
