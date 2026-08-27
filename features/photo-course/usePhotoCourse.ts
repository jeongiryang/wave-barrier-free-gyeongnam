"use client";

import { useCallback, useRef, useState } from "react";
import {
  buildPhotoCourse,
  changePhotoCourseDayDate,
  movePhotoCourseStop,
  photoCourseShareText,
  portablePhotoCourseExport,
} from "../../lib/photo-course.js";
import { MAX_PHOTOS, readPhotoMetadataFiles } from "../../lib/photo-import.js";
import type { PhotoCourse, PhotoCourseApplied, PhotoCourseDay, PhotoCourseEnrichment, PhotoCourseStop } from "./types";

export { MAX_PHOTOS };

type ApplyInput = { region: string; travelStart: string; travelEnd: string };
type EnrichmentResponse = Partial<PhotoCourseEnrichment> & { status?: string };

function courseWithDays(course: PhotoCourse, days: PhotoCourseDay[]): PhotoCourse {
  return {
    ...course,
    days,
    regions: [...new Set(days.flatMap((day) => day.regions).filter(Boolean))],
  };
}

function normalizedDay(day: PhotoCourseDay): PhotoCourseDay {
  const stops = day.stops.map((stop, order) => ({ ...stop, order }));
  const regions = [...new Set(stops.map((stop) => stop.region).filter(Boolean))];
  return { ...day, region: regions[0] || "", regions, stops };
}

export function usePhotoCourse(onApply: (input: ApplyInput) => void) {
  const [course, setCourse] = useState<PhotoCourse | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [enrichments, setEnrichments] = useState<Record<string, PhotoCourseEnrichment>>({});
  const [reading, setReading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [notice, setNotice] = useState("");
  const [applied, setApplied] = useState<PhotoCourseApplied | null>(null);
  const [exportNotice, setExportNotice] = useState("");
  const runId = useRef(0);

  const readFiles = useCallback(async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    const run = runId.current + 1;
    runId.current = run;
    setReading(true);
    setProgress(0);
    setNotice("");
    setApplied(null);
    setExportNotice("");
    setEnrichments({});

    const result = await readPhotoMetadataFiles(fileList, {
      onProgress: (done: number, total: number) => {
        if (runId.current === run) setProgress(total ? Math.round((done / total) * 100) : 0);
      },
    });
    if (runId.current !== run) return;

    const next = buildPhotoCourse(result.photos) as PhotoCourse;
    setCourse(next);
    setNames({});
    setReading(false);
    setProgress(100);

    if (!next.days.length) {
      setNotice(result.selectedCount === next.skipped.withoutDate
        ? "선택한 사진에서 촬영 날짜를 찾지 못했습니다. 촬영 정보가 남아 있는 JPEG 원본을 사용해 주세요."
        : "코스를 만들 수 있는 사진이 없습니다.");
      return;
    }
    const parts = [`사진 ${next.photoCount}장에서 ${next.days.length}일치 코스를 만들었습니다.`];
    if (next.skipped.withoutDate) parts.push(`촬영 날짜가 없는 ${next.skipped.withoutDate}장은 제외했습니다.`);
    if (next.skipped.withoutPoint) parts.push(`위치 정보가 없는 ${next.skipped.withoutPoint}장은 시간만으로 묶었습니다.`);
    if (result.unreadable) parts.push(`읽을 수 없는 파일 ${result.unreadable}개는 건너뛰었습니다.`);
    if (result.truncated) parts.push(`한 번에 ${MAX_PHOTOS}장까지만 읽어 ${result.truncated}장은 이번 분석에서 제외했습니다.`);
    setNotice(parts.join(" "));
  }, []);

  const renameStop = useCallback((id: string, value: string) => {
    setNames((current) => ({ ...current, [id]: value.slice(0, 80) }));
    setEnrichments((current) => {
      if (!current[id]) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
  }, []);

  const changeDayDate = useCallback((dayIndex: number, date: string) => {
    setCourse((current) => current ? courseWithDays(current, changePhotoCourseDayDate(current.days, dayIndex, date) as PhotoCourseDay[]) : current);
  }, []);

  const moveStop = useCallback((dayIndex: number, stopIndex: number, direction: -1 | 1) => {
    setCourse((current) => current ? courseWithDays(current, movePhotoCourseStop(current.days, dayIndex, stopIndex, direction) as PhotoCourseDay[]) : current);
  }, []);

  const changeStopRegion = useCallback((dayIndex: number, stopId: string, region: string) => {
    setCourse((current) => {
      if (!current) return current;
      const days = current.days.map((day, index) => {
        if (index !== dayIndex) return day;
        return normalizedDay({ ...day, stops: day.stops.map((stop) => stop.id === stopId ? { ...stop, region } : stop) });
      });
      return courseWithDays(current, days);
    });
    setEnrichments((current) => {
      if (!current[stopId]) return current;
      const next = { ...current };
      delete next[stopId];
      return next;
    });
  }, []);

  const requestEnrichment = useCallback(async (day: PhotoCourseDay, stop: PhotoCourseStop) => {
    const region = stop.region || day.region;
    const title = String(names[stop.id] ?? stop.suggestedName ?? "").trim().slice(0, 80);
    if (!region) {
      setEnrichments((current) => ({ ...current, [stop.id]: {
        status: "empty", image: "", source: "", matchedTitle: title, contentId: "", address: "", query: "",
      } }));
      return;
    }
    setEnrichments((current) => ({ ...current, [stop.id]: {
      status: "loading", image: "", source: "", matchedTitle: title, contentId: "", address: "", query: "",
    } }));
    try {
      // EXIF 좌표는 이미 course 구조에서 제거됐다. 서버에는 사용자가 확인한 지역·장소명만 보낸다.
      const query = new URLSearchParams({ action: "spot-photo", region, title, strict: "1" });
      const response = await fetch(`/api/wave?${query.toString()}`, { headers: { accept: "application/json" } });
      const data = await response.json() as EnrichmentResponse;
      const status = response.ok && data.status === "live" ? "live" : response.ok && data.status === "empty" ? "empty" : "error";
      setEnrichments((current) => ({ ...current, [stop.id]: {
        status,
        image: typeof data.image === "string" ? data.image : "",
        source: typeof data.source === "string" ? data.source : "",
        matchedTitle: typeof data.matchedTitle === "string" ? data.matchedTitle : title,
        contentId: typeof data.contentId === "string" ? data.contentId : "",
        address: typeof data.address === "string" ? data.address : "",
        query: typeof data.query === "string" ? data.query : "",
      } }));
    } catch {
      setEnrichments((current) => ({ ...current, [stop.id]: {
        status: "error", image: "", source: "", matchedTitle: title, contentId: "", address: "", query: "",
      } }));
    }
  }, [names]);

  const enrichStop = useCallback((day: PhotoCourseDay, stop: PhotoCourseStop) => {
    void requestEnrichment(day, stop);
  }, [requestEnrichment]);

  const enrichAll = useCallback(async () => {
    if (!course) return;
    for (const day of course.days) {
      for (const stop of day.stops) await requestEnrichment(day, stop);
    }
  }, [course, requestEnrichment]);

  const clear = useCallback(() => {
    runId.current += 1;
    setCourse(null);
    setNames({});
    setEnrichments({});
    setReading(false);
    setProgress(0);
    setNotice("");
    setApplied(null);
    setExportNotice("");
  }, []);

  const apply = useCallback(() => {
    if (!course?.days.length) return;
    const dates = course.days.map((day) => day.date).sort();
    const region = course.regions[0] || "";
    const input = { region, travelStart: dates[0], travelEnd: dates[dates.length - 1] };
    onApply(input);
    setApplied({ ...input, dayCount: course.days.length, stopCount: course.days.reduce((sum, day) => sum + day.stops.length, 0) });
  }, [course, onApply]);

  const saveToDevice = useCallback(() => {
    if (!course) return;
    const payload = portablePhotoCourseExport(course.days, names, enrichments);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `wave-photo-course-${course.days[0]?.date || "trip"}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(href);
    setExportNotice("좌표가 제거된 코스 JSON을 기기에 저장했습니다.");
  }, [course, enrichments, names]);

  const share = useCallback(async () => {
    if (!course) return;
    const text = photoCourseShareText(course.days, names, enrichments);
    try {
      if (navigator.share) await navigator.share({ title: "W.A.V.E 여행 코스", text });
      else await navigator.clipboard.writeText(text);
      setExportNotice(navigator.share ? "기기의 공유 화면을 열었습니다." : "좌표가 제거된 코스를 클립보드에 복사했습니다.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setExportNotice("공유하지 못했습니다. 기기 저장을 이용해 주세요.");
    }
  }, [course, enrichments, names]);

  return {
    course, names, enrichments, reading, progress, notice, applied, exportNotice,
    readFiles, renameStop, changeDayDate, moveStop, changeStopRegion,
    enrichStop, enrichAll, clear, apply, saveToDevice, share,
  };
}