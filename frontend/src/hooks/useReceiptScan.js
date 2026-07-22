import { useState, useCallback, useRef, useEffect } from "react";
import {
  scanReceipt as scanReceiptAPI,
  updateReceiptFields as updateReceiptFieldsAPI,
  confirmReceipt as confirmReceiptAPI,
  fetchReceiptImageBlob,
} from "../api/receiptApi";

/**
 * useReceiptScan
 *
 * Drives the full scan → preview → edit → confirm lifecycle for a single
 * receipt. Follows the same load/error/loading shape used throughout the
 * app's other feature hooks (useRecurring, useReports, etc.).
 */
const useReceiptScan = () => {
  const [receipt, setReceipt] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  const imageUrlRef = useRef(null);

  useEffect(() => {
    return () => {
      if (imageUrlRef.current) URL.revokeObjectURL(imageUrlRef.current);
    };
  }, []);

  const scan = useCallback(async (file) => {
    setScanning(true);
    setError("");
    setReceipt(null);

    try {
      const result = await scanReceiptAPI(file);
      setReceipt(result);

      try {
        const url = await fetchReceiptImageBlob(result._id);
        imageUrlRef.current = url;
        setImageUrl(url);
      } catch {
        // Non-fatal — extracted fields remain usable without the preview image.
      }

      return result;
    } catch (err) {
      const message =
        err?.response?.data?.message || "Failed to process receipt image.";
      setError(message);
      throw new Error(message);
    } finally {
      setScanning(false);
    }
  }, []);

  const updateFields = useCallback(
    async (patch) => {
      if (!receipt?._id) return;
      setSaving(true);
      setError("");
      try {
        const updated = await updateReceiptFieldsAPI(receipt._id, patch);
        setReceipt(updated);
        return updated;
      } catch (err) {
        const message =
          err?.response?.data?.message || "Failed to update receipt fields.";
        setError(message);
        throw new Error(message);
      } finally {
        setSaving(false);
      }
    },
    [receipt],
  );

  const confirm = useCallback(
    async (payload) => {
      if (!receipt?._id) return;
      setConfirming(true);
      setError("");
      try {
        const result = await confirmReceiptAPI(receipt._id, payload);
        setReceipt(result.receipt);
        return result;
      } catch (err) {
        const message =
          err?.response?.data?.message || "Failed to create transaction.";
        setError(message);
        throw new Error(message);
      } finally {
        setConfirming(false);
      }
    },
    [receipt],
  );

  const reset = useCallback(() => {
    if (imageUrlRef.current) URL.revokeObjectURL(imageUrlRef.current);
    imageUrlRef.current = null;
    setReceipt(null);
    setImageUrl(null);
    setError("");
  }, []);

  return {
    receipt,
    imageUrl,
    scanning,
    saving,
    confirming,
    error,
    setError,
    scan,
    updateFields,
    confirm,
    reset,
  };
};

export default useReceiptScan;
