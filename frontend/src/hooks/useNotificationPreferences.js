import { useState, useEffect, useCallback } from "react";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from "../api/notificationApi";

const useNotificationPreferences = () => {
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getNotificationPreferences();
      setPreferences(data);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Failed to load notification preferences.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(async (patch) => {
    setSaving(true);
    setError("");
    try {
      const updated = await updateNotificationPreferences(patch);
      setPreferences(updated);
      return updated;
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Failed to update notification preferences.",
      );
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  return {
    preferences,
    loading,
    saving,
    error,
    setError,
    save,
    refresh: load,
  };
};

export default useNotificationPreferences;
