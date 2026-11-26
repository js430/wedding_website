import type { KeyboardEvent } from "react";

/**
 * Arrow-key behaviour for a group of role="radio" buttons, as screen-reader
 * and keyboard users expect: the group is one Tab stop, and the arrow keys
 * move to (and choose) the previous / next option, wrapping at the ends.
 *
 * Use with tabIndex={radioTabIndex(...)} on each option.
 */
export function onRadioKeyDown(e: KeyboardEvent<HTMLElement>) {
  const step = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
  if (!step) return;
  const group = e.currentTarget.closest('[role="radiogroup"]');
  if (!group) return;
  const radios = Array.from(group.querySelectorAll<HTMLElement>('[role="radio"]:not([disabled])'));
  const at = radios.indexOf(e.currentTarget);
  if (at < 0 || radios.length < 2) return;
  e.preventDefault();
  const next = radios[(at + step + radios.length) % radios.length];
  next.focus();
  next.click();
}

/** 0 for the chosen option (or the first, when none is chosen), else -1. */
export function radioTabIndex(isChecked: boolean, isFirst: boolean, anyChecked: boolean): 0 | -1 {
  return isChecked || (!anyChecked && isFirst) ? 0 : -1;
}
