// lib/track.ts
// -----------------------------------------------------------------------------
// Tells Google Ads that someone signed up, so campaigns can be judged (and
// optimised) on sign-ups rather than clicks. Browser-only.
//
// Set NEXT_PUBLIC_GADS_SIGNUP to the "send_to" value from Google Ads, e.g.
//   AW-18449412545/AbC1dEfGhIj
// (Goals → Conversions → your Sign-up action → Tag setup → "Use Google tag").
// Without it, this does nothing.
// -----------------------------------------------------------------------------
type GtagWindow = Window & { gtag?: (...args: unknown[]) => void };

export function trackSignup(): Promise<void> {
  return new Promise((resolve) => {
    const sendTo = process.env.NEXT_PUBLIC_GADS_SIGNUP;
    const w = window as GtagWindow;
    if (!sendTo || typeof w.gtag !== "function") return resolve();
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };
    // Wait for Google to receive it (or 1s at most) before navigating away.
    w.gtag("event", "conversion", { send_to: sendTo, event_callback: finish });
    setTimeout(finish, 1000);
  });
}
