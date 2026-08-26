"use client";

import { useCallback, useRef, useState } from "react";
import { buildPhotoCourse } from "../../lib/photo-course.js";
import { readPhotoExif } from "../../lib/photo-exif.js";
import type { PhotoCourse, PhotoCourseApplied } from "./types";

export const MAX_PHOTOS = 200;
/** EXIF는 파일 앞쪽에만 있다. 사진 전체를 메모리에 올리지 않는다. */
const EXIF_HEAD_BYTES = 256 * 1024;

type ApplyInput = { region: string; travelStart: string; travelEnd: string };

export function usePhotoCourse(onApply: (input: ApplyInput) => void) {
  const [course, setCourse] = useState<PhotoCourse | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [reading, setReading] = useState(false);
  const [notice, setNotice] = useState("");
  const [applied, setApplied] = useState<PhotoCourseApplied | null>(null);
  const runId = useRef(0);

  const readFiles = useCallback(async (fileList: FileList | null) => {
    const files = Array.from(fileList || []).slice(0, MAX_PHOTOS);
    if (!files.length) return;
    const run = runId.current + 1;
    runId.current = run;
    setReading(true);
    setNotice("");
    setApplied(null);

    const photos = [];
    let unreadable = 0;
    for (const file of files) {
      if (runId.current !== run) return;
      try {
        // 앞부분만 읽는다. 사진 본문은 브라우저 메모리에도 오래 남지 않는다.
        const head = await file.slice(0, EXIF_HEAD_BYTES).arrayBuffer();
        const { takenAt, point } = readPhotoExif(head);
        photos.push({ name: file.name, takenAt, point });
      } catch {
        unreadable += 1;
      }
    }
    if (runId.current !== run) return;

    const next = buildPhotoCourse(photos) as PhotoCourse;
    setCourse(next);
    setNames({});
    setReading(false);
    if (!next.days.length) {
      setNotice(files.length === next.skipped.withoutDate
        ? "선택한 사진에서 촬영 날짜를 찾지 못했습니다. 촬영 정보가 남아 있는 원본 사진을 사용해 주세요."
        : "코스를 만들 수 있는 사진이 없습니다.");
      return;
    }
    const parts = [`사진 ${next.photoCount}장에서 ${next.days.length}일치 코스를 만들었습니다.`];
    if (next.skipped.withoutDate) parts.push(`촬영 날짜가 없는 ${next.skipped.withoutDate}장은 제외했습니다.`);
    if (next.skipped.withoutPoint) parts.push(`위치 정보가 없는 ${next.skipped.withoutPoint}장은 시간만으로 묶었습니다.`);
    if (unreadable) parts.push(`읽을 수 없는 파일 ${unreadable}개는 건너뛰었습니다.`);
    setNotice(parts.join(" "));
  }, []);

  const renameStop = useCallback((id: string, value: string) => {
    setNames((current) => ({ ...current, [id]: value.slice(0, 80) }));
  }, []);

  const clear = useCallback(() => {
    runId.current += 1;
    setCourse(null);
    setNames({});
    setReading(false);
    setNotice("");
    setApplied(null);
  }, []);

  const apply = useCallback(() => {
    if (!course?.days.length) return;
    const dates = course.days.map((day) => day.date);
    const region = course.regions[0] || "";
    const input = { region, travelStart: dates[0], travelEnd: dates[dates.length - 1] };
    onApply(input);
    setApplied({
      ...input,
      dayCount: course.days.length,
      stopCount: course.days.reduce((sum, day) => sum + day.stops.length, 0),
    });
  }, [course, onApply]);

  return { course, names, reading, notice, applied, readFiles, renameStop, clear, apply };
}
