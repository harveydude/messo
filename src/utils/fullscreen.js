/**
 * Cross-browser Fullscreen Engine for MESSO Workspace
 * Supports:
 * - W3C Standard: requestFullscreen, exitFullscreen, fullscreenElement, fullscreenEnabled
 * - WebKit (Safari, iOS iPad, older Chrome): webkitRequestFullscreen, webkitExitFullscreen, webkitFullscreenElement
 * - Mozilla (Firefox): mozRequestFullScreen, mozCancelFullScreen, mozFullScreenElement
 * - Microsoft (Edge/IE): msRequestFullscreen, msExitFullscreen, msFullscreenElement
 */

export function isFullscreenSupported() {
  if (typeof document === 'undefined') return false;
  return Boolean(
    document.fullscreenEnabled ||
    document.webkitFullscreenEnabled ||
    document.mozFullScreenEnabled ||
    document.msFullscreenEnabled ||
    document.documentElement?.requestFullscreen ||
    document.documentElement?.webkitRequestFullscreen ||
    document.documentElement?.webkitRequestFullScreen ||
    document.documentElement?.mozRequestFullScreen ||
    document.documentElement?.msRequestFullscreen
  );
}

export function isAppFullscreen() {
  if (typeof document === 'undefined') return false;
  return Boolean(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement
  );
}

export async function requestAppFullscreen(element) {
  if (typeof document === 'undefined') return false;
  if (isAppFullscreen()) return true;

  const target = element || document.documentElement || document.body;
  if (!target) return false;

  try {
    if (typeof target.requestFullscreen === 'function') {
      await target.requestFullscreen();
      return true;
    } else if (typeof target.webkitRequestFullscreen === 'function') {
      await target.webkitRequestFullscreen();
      return true;
    } else if (typeof target.webkitRequestFullScreen === 'function') {
      await target.webkitRequestFullScreen();
      return true;
    } else if (typeof target.mozRequestFullScreen === 'function') {
      await target.mozRequestFullScreen();
      return true;
    } else if (typeof target.msRequestFullscreen === 'function') {
      await target.msRequestFullscreen();
      return true;
    }
  } catch (err) {
    // Rejected by browser policy (e.g. transient activation requirement or iframe sandbox)
    return false;
  }
  return false;
}

export async function exitAppFullscreen() {
  if (typeof document === 'undefined') return false;
  if (!isAppFullscreen()) return true;

  try {
    if (typeof document.exitFullscreen === 'function') {
      await document.exitFullscreen();
      return true;
    } else if (typeof document.webkitExitFullscreen === 'function') {
      await document.webkitExitFullscreen();
      return true;
    } else if (typeof document.mozCancelFullScreen === 'function') {
      await document.mozCancelFullScreen();
      return true;
    } else if (typeof document.msExitFullscreen === 'function') {
      await document.msExitFullscreen();
      return true;
    }
  } catch (err) {
    return false;
  }
  return false;
}

export async function toggleAppFullscreen(element) {
  if (isAppFullscreen()) {
    return await exitAppFullscreen();
  } else {
    return await requestAppFullscreen(element);
  }
}

/**
 * Subscribes a listener to any fullscreen change event across all browser engines.
 * Returns an unbind function.
 */
export function onFullscreenChange(callback) {
  if (typeof document === 'undefined') return () => {};

  const handler = () => {
    callback(isAppFullscreen());
  };

  const events = [
    'fullscreenchange',
    'webkitfullscreenchange',
    'mozfullscreenchange',
    'MSFullscreenChange'
  ];

  events.forEach((evt) => {
    document.addEventListener(evt, handler, false);
  });

  return () => {
    events.forEach((evt) => {
      document.removeEventListener(evt, handler, false);
    });
  };
}

/**
 * Attaches global capture-phase listeners on all user-activation events.
 * The moment the user clicks, taps, or presses any key anywhere on the screen,
 * it immediately triggers full-screen mode and cleanly disconnects once active.
 */
export function registerAutoFullscreenGate() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};

  if (isAppFullscreen()) return () => {};

  let active = true;

  const attempt = async () => {
    if (!active) return;
    if (isAppFullscreen()) {
      cleanup();
      return;
    }
    const success = await requestAppFullscreen();
    if (success || isAppFullscreen()) {
      cleanup();
    }
  };

  const cleanup = () => {
    active = false;
    events.forEach((evt) => {
      window.removeEventListener(evt, attempt, { capture: true });
      document.removeEventListener(evt, attempt, { capture: true });
    });
  };

  // Capture phase ensures child stopPropagation() cannot block it
  const events = ['pointerdown', 'mousedown', 'touchstart', 'click', 'keydown'];

  events.forEach((evt) => {
    document.addEventListener(evt, attempt, { capture: true, passive: true });
    window.addEventListener(evt, attempt, { capture: true, passive: true });
  });

  const unsubFs = onFullscreenChange((fs) => {
    if (fs) cleanup();
  });

  return () => {
    cleanup();
    unsubFs();
  };
}
