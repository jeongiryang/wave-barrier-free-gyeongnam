"use client";
import { createContext, useContext } from "react";
export const NaruContext = createContext<(prompt?: string) => void>(() => {});
export const useOpenNaru = () => useContext(NaruContext);
