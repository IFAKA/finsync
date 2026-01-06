"use client";

import { useCallback, useState } from "react";
import { playSound } from "@/lib/sounds";

type InteractionSound = "click" | "success" | "error" | "warning" | "toggle" | "open" | "close";

interface UseInteractionOptions {
  sound?: InteractionSound;
  haptic?: boolean;
  onInteraction?: () => void;
}

/**
 * useInteraction - Hook for adding sound and haptic feedback to interactions
 */
export function useInteraction(options: UseInteractionOptions = {}) {
  const { sound = "click", haptic = true, onInteraction } = options;

  const trigger = useCallback(() => {
    if (sound) {
      playSound(sound);
    }

    // Haptic feedback (if supported)
    if (haptic && typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(10);
    }

    onInteraction?.();
  }, [sound, haptic, onInteraction]);

  return { trigger };
}

/**
 * useToggle - Hook for toggle interactions with sound
 */
export function useToggle(initialState = false, options: { sound?: boolean } = {}) {
  const { sound = true } = options;
  const [isOn, setIsOn] = useState(initialState);

  const toggle = useCallback(() => {
    setIsOn((prev) => !prev);
    if (sound) {
      playSound("toggle");
    }
  }, [sound]);

  const setOn = useCallback(() => {
    setIsOn(true);
    if (sound) {
      playSound("toggle");
    }
  }, [sound]);

  const setOff = useCallback(() => {
    setIsOn(false);
    if (sound) {
      playSound("toggle");
    }
  }, [sound]);

  return { isOn, toggle, setOn, setOff, set: setIsOn };
}

/**
 * useModalSound - Hook for modal open/close sounds
 */
export function useModalSound() {
  const handleOpen = useCallback(() => {
    playSound("open");
  }, []);

  const handleClose = useCallback(() => {
    playSound("close");
  }, []);

  return { onOpen: handleOpen, onClose: handleClose };
}

/**
 * useActionSound - Hook for action completion sounds
 */
export function useActionSound() {
  const success = useCallback(() => {
    playSound("success");
  }, []);

  const error = useCallback(() => {
    playSound("error");
  }, []);

  const warning = useCallback(() => {
    playSound("warning");
  }, []);

  const notification = useCallback(() => {
    playSound("notification");
  }, []);

  const complete = useCallback(() => {
    playSound("complete");
  }, []);

  return { success, error, warning, notification, complete };
}

/**
 * useTransactionSound - Hook for transaction-specific sounds
 */
export function useTransactionSound() {
  const income = useCallback(() => {
    playSound("income");
  }, []);

  const expense = useCallback(() => {
    playSound("expense");
  }, []);

  const categorize = useCallback(() => {
    playSound("success");
  }, []);

  return { income, expense, categorize };
}
