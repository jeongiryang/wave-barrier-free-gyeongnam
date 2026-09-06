"use client";

import { useCallback, useEffect, useState } from "react";
import { profiles } from "../constants";
import { createTravelProfile, sanitizeTravelProfile } from "../profile/travel-profile.js";
import { useSitePreferences } from "../../../components/SitePreferences";
import { profileNotices } from "../condition-copy";

const TRAVEL_PROFILE_KEY = "wave-travel-profile-v1";
const allowedProfileIds = profiles.map((profile) => profile.id);

export type TravelPreferenceProfile = {
  version: 1;
  selectedIds: string[];
  updatedAt: number;
};

export function useTravelPreferenceProfile() {
  const { locale } = useSitePreferences();
  const [savedProfile, setSavedProfile] = useState<TravelPreferenceProfile | null>(null);
  const [noticeKind, setNoticeKind] = useState<keyof typeof profileNotices>("none");
  const profileNotice = profileNotices[noticeKind][locale === "en" ? 1 : 0];

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const raw = window.localStorage.getItem(TRAVEL_PROFILE_KEY);
        if (!raw) return;
        const profile = sanitizeTravelProfile(JSON.parse(raw), allowedProfileIds) as TravelPreferenceProfile | null;
        if (profile) setSavedProfile(profile);
        else setNoticeKind("damaged");
      } catch {
        setNoticeKind("unreadable");
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const saveTravelProfile = useCallback((selectedIds: string[]) => {
    const profile = createTravelProfile(selectedIds, allowedProfileIds) as TravelPreferenceProfile;
    if (!profile.selectedIds.length) {
      setNoticeKind("empty");
      return false;
    }
    try {
      window.localStorage.setItem(TRAVEL_PROFILE_KEY, JSON.stringify(profile));
      setSavedProfile(profile);
      setNoticeKind("saved");
      return true;
    } catch {
      setNoticeKind("unsaved");
      return false;
    }
  }, []);

  const deleteTravelProfile = useCallback(() => {
    try {
      window.localStorage.removeItem(TRAVEL_PROFILE_KEY);
      setSavedProfile(null);
      setNoticeKind("deleted");
      return true;
    } catch {
      setNoticeKind("undeleted");
      return false;
    }
  }, []);

  const announceProfileApplied = useCallback(() => {
    setNoticeKind("applied");
  }, []);

  return {
    savedProfile,
    profileNotice,
    saveTravelProfile,
    deleteTravelProfile,
    announceProfileApplied,
  };
}
