"use client";

import { useEffect, useState, useCallback, type RefObject } from "react";

interface WebKitHTMLVideoElement extends HTMLVideoElement {
  webkitShowPlaybackTargetPicker(): void;
  webkitCurrentPlaybackTargetIsWireless?: boolean;
}

interface AirPlayState {
  /** An AirPlay-capable device is on the network */
  airplayAvailable: boolean;
  /** Video is currently playing on an AirPlay device */
  airplayActive: boolean;
  /** Show the system AirPlay device picker */
  showAirPlayPicker: () => void;
  /** Error message if picker fails (e.g., in standalone PWA mode) */
  airplayError: string | null;
}

export function useAirPlay(
  videoRef: RefObject<HTMLVideoElement | null>
): AirPlayState {
  const [available, setAvailable] = useState(false);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current as WebKitHTMLVideoElement | null;
    if (!video || !("webkitShowPlaybackTargetPicker" in video)) return;

    const handleAvailability = (e: Event) => {
      const event = e as Event & { availability?: string };
      setAvailable(event.availability === "available");
    };

    const handleWirelessChanged = () => {
      setActive(!!video.webkitCurrentPlaybackTargetIsWireless);
    };

    // Check initial state
    if (video.webkitCurrentPlaybackTargetIsWireless !== undefined) {
      setActive(video.webkitCurrentPlaybackTargetIsWireless);
    }

    video.addEventListener(
      "webkitplaybacktargetavailabilitychanged",
      handleAvailability
    );
    // Modern event name + legacy fallback
    video.addEventListener(
      "webkitcurrentplaybacktargetiswirelesschanged",
      handleWirelessChanged
    );
    video.addEventListener(
      "webkitcurrentplaybacktargetisremotechanged",
      handleWirelessChanged
    );

    return () => {
      video.removeEventListener(
        "webkitplaybacktargetavailabilitychanged",
        handleAvailability
      );
      video.removeEventListener(
        "webkitcurrentplaybacktargetiswirelesschanged",
        handleWirelessChanged
      );
      video.removeEventListener(
        "webkitcurrentplaybacktargetisremotechanged",
        handleWirelessChanged
      );
    };
  }, [videoRef]);

  const showAirPlayPicker = useCallback(() => {
    const video = videoRef.current as WebKitHTMLVideoElement | null;
    if (!video || !("webkitShowPlaybackTargetPicker" in video)) return;

    setError(null);
    try {
      video.webkitShowPlaybackTargetPicker();
    } catch {
      setError("Use Control Center to select AirPlay");
    }
  }, [videoRef]);

  return {
    airplayAvailable: available,
    airplayActive: active,
    showAirPlayPicker,
    airplayError: error,
  };
}
