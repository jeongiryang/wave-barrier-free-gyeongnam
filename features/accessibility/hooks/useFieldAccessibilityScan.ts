"use client";

import { useCallback, useRef, useState } from "react";
import { plannerJson, PlannerRequestError } from "../../planner/services/api";
import type { Place } from "../../planner/types";
import { preparePhotoForScan } from "../prepare-photo";
import type { FieldScanResponse, FieldScanState } from "../types";

/**
 * 현장 사진 판독 흐름의 상태를 관리한다.
 *
 * 서버로 보내는 것은 캔버스로 다시 그린 픽셀과 관광지 식별자뿐이다.
 * 원본 파일과 EXIF는 이 훅 밖으로 나가지 않는다.
 */
export function useFieldAccessibilityScan(place: Place | null, profiles: string[]) {
  const [state, setState] = useState<FieldScanState>("idle");
  const [result, setResult] = useState<FieldScanResponse | null>(null);
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState("");
  const requestRef = useRef(0);

  const reset = useCallback(() => {
    requestRef.current += 1;
    setState("idle");
    setResult(null);
    setMessage("");
    setPreview("");
  }, []);

  const scan = useCallback(async (file: File) => {
    if (!place) return;
    const ticket = requestRef.current + 1;
    requestRef.current = ticket;
    setResult(null);
    setMessage("");
    setState("preparing");

    let prepared;
    try {
      prepared = await preparePhotoForScan(file);
    } catch (error) {
      if (requestRef.current !== ticket) return;
      setState("error");
      setMessage(error instanceof Error ? error.message : "사진을 준비하지 못했습니다.");
      return;
    }

    if (requestRef.current !== ticket) return;
    setPreview(prepared.dataUrl);
    setState("analyzing");

    try {
      const response = await plannerJson<FieldScanResponse>("/api/accessibility/scan", {
        method: "POST",
        timeoutMs: 30000,
        body: {
          placeId: place.id,
          placeName: place.name,
          image: prepared.dataUrl,
          mimeType: prepared.mimeType,
          profiles,
          official: {
            name: place.name,
            source: place.source,
            features: place.features,
            details: place.details,
            knownFields: place.knownFields,
            unknownFields: place.unknownFields,
          },
        },
      });
      if (requestRef.current !== ticket) return;
      setResult(response);
      if (!response.analysis?.usable) {
        setState("retake");
        setMessage(response.retakeGuidance || response.analysis?.retakeGuidance || "사진을 다시 촬영해 주세요.");
        return;
      }
      setState("done");
    } catch (error) {
      if (requestRef.current !== ticket) return;
      setState("error");
      setMessage(error instanceof PlannerRequestError ? error.message : "현장 분석을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
  }, [place, profiles]);

  return { state, result, message, preview, scan, reset };
}
