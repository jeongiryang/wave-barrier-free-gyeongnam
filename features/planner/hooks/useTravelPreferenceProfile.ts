"use client";

import { useCallback, useEffect, useState } from "react";
import { profiles } from "../constants";
import { createTravelProfile, sanitizeTravelProfile } from "../profile/travel-profile.js";

const TRAVEL_PROFILE_KEY = "wave-travel-profile-v1";
const allowedProfileIds = profiles.map((profile) => profile.id);

export type TravelPreferenceProfile = {
  version: 1;
  selectedIds: string[];
  updatedAt: number;
};

export function useTravelPreferenceProfile() {
  const [savedProfile, setSavedProfile] = useState<TravelPreferenceProfile | null>(null);
  const [profileNotice, setProfileNotice] = useState("");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const raw = window.localStorage.getItem(TRAVEL_PROFILE_KEY);
        if (!raw) return;
        const profile = sanitizeTravelProfile(JSON.parse(raw), allowedProfileIds) as TravelPreferenceProfile | null;
        if (profile) setSavedProfile(profile);
        else setProfileNotice("저장한 편의 조건이 손상되어 적용하지 않았습니다. 현재 선택은 그대로 유지됩니다.");
      } catch {
        setProfileNotice("저장한 편의 조건을 읽지 못했습니다. 현재 선택은 그대로 유지됩니다.");
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const saveTravelProfile = useCallback((selectedIds: string[]) => {
    const profile = createTravelProfile(selectedIds, allowedProfileIds) as TravelPreferenceProfile;
    if (!profile.selectedIds.length) {
      setProfileNotice("저장할 편의조건을 하나 이상 선택해 주세요.");
      return false;
    }
    try {
      window.localStorage.setItem(TRAVEL_PROFILE_KEY, JSON.stringify(profile));
      setSavedProfile(profile);
      setProfileNotice("현재 편의 조건을 이 기기에 저장했습니다.");
      return true;
    } catch {
      setProfileNotice("이 브라우저에서는 편의 조건을 저장할 수 없습니다. 현재 선택은 이 화면에서 계속 사용할 수 있습니다.");
      return false;
    }
  }, []);

  const deleteTravelProfile = useCallback(() => {
    try {
      window.localStorage.removeItem(TRAVEL_PROFILE_KEY);
      setSavedProfile(null);
      setProfileNotice("이 기기에 저장한 편의 조건을 삭제했습니다.");
      return true;
    } catch {
      setProfileNotice("저장한 편의 조건을 삭제하지 못했습니다. 브라우저 저장소 설정을 확인해 주세요.");
      return false;
    }
  }, []);

  const announceProfileApplied = useCallback(() => {
    setProfileNotice("저장된 편의조건을 현재 여행 설계에 적용했습니다.");
  }, []);

  return {
    savedProfile,
    profileNotice,
    saveTravelProfile,
    deleteTravelProfile,
    announceProfileApplied,
  };
}
