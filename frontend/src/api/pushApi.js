import API from "./axios";

export const subscribePush = async (subscription) => {
  const res = await API.post("/push/subscribe", subscription.toJSON());
  return res.data;
};

export const unsubscribePush = async (endpoint) => {
  const res = await API.delete("/push/subscribe", { data: { endpoint } });
  return res.data;
};
