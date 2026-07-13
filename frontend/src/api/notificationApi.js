import API from "./axios";

export const getNotificationPreferences = async () => {
  const res = await API.get("/notifications/preferences");
  return res.data;
};

export const updateNotificationPreferences = async (data) => {
  const res = await API.put("/notifications/preferences", data);
  return res.data;
};
