import API from "./axios";

export const generateReport = async (payload) => {
  const res = await API.post("/reports/generate", payload);
  return res.data;
};

export const getReports = async (params = {}) => {
  const res = await API.get("/reports", { params });
  return res.data;
};

export const getReport = async (id) => {
  const res = await API.get(`/reports/${id}`);
  return res.data;
};

/**
 * Downloads a report PDF as a blob and triggers a browser save-as via a
 * temporary anchor element (the API route requires auth headers, so a plain
 * <a href> to the endpoint would not carry the Authorization bearer token).
 */
export const downloadReport = async (id, fileName) => {
  const res = await API.get(`/reports/${id}/download`, {
    responseType: "blob",
  });
  const url = window.URL.createObjectURL(
    new Blob([res.data], { type: "application/pdf" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName || "report.pdf";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const emailReport = async (id, data) => {
  const res = await API.post(`/reports/${id}/email`, data);
  return res.data;
};

export const deleteReport = async (id) => {
  const res = await API.delete(`/reports/${id}`);
  return res.data;
};
