import React, { useEffect, useState } from "react";
import { GoalProgressBar } from "./GoalProgressBar";

/**
 * AnimatedGoalProgressBar
 *
 * Wraps the existing GoalProgressBar (unmodified, to preserve backward
 * compatibility with GoalCard / GoalDetailPanel) and adds a "count up" fill
 * animation whenever the target percentage changes — e.g. right after a
 * contribution is added, the bar visibly grows from its old value to the
 * new one instead of snapping instantly.
 *
 * Usage is a drop-in replacement for GoalProgressBar wherever the percentage
 * may change while the component stays mounted (GoalDetailPanel after a
 * contribution; GoalCard if you refresh in place).
 */
export function AnimatedGoalProgressBar({ percentage = 0, ...rest }) {
  const target = Math.min(Math.max(percentage, 0), 100);
  const [displayed, setDisplayed] = useState(target);

  useEffect(() => {
    // Respect reduced-motion preference — jump straight to the value.
    const prefersReducedMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion) {
      setDisplayed(target);
      return;
    }

    let frame;
    const duration = 600; // ms
    const start = performance.now();
    const initial = displayed;
    const delta = target - initial;

    if (Math.abs(delta) < 0.01) {
      setDisplayed(target);
      return;
    }

    const tick = (now) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayed(initial + delta * eased);
      if (t < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        setDisplayed(target);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => frame && cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return <GoalProgressBar percentage={displayed} {...rest} />;
}

export default AnimatedGoalProgressBar;
