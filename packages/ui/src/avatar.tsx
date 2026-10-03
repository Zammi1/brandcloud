"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { Avatar as BaseAvatar } from "@base-ui/react/avatar";
import { cx } from "./utils";

export type AvatarSize = "sm" | "md" | "lg";

export interface AvatarProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children" | "dir"> {
  /** Person or organisation name. Used for the accessible label and the initials fallback. */
  name: string;
  src?: string;
  size?: AvatarSize;
  /** Set when the avatar sits next to the visible name, so it is not announced twice. */
  decorative?: boolean;
}

/** Up to two initials from a name, for example "Ada Byron" becomes "AB". */
export function avatarInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = words[0]!.charAt(0);
  const last = words.length > 1 ? words[words.length - 1]!.charAt(0) : "";
  return `${first}${last}`.toLocaleUpperCase("en-GB");
}

export const Avatar = forwardRef<HTMLSpanElement, AvatarProps>(function Avatar(
  { className, decorative = false, name, size = "md", src, ...props },
  ref,
) {
  const labelProps = decorative ? { "aria-hidden": true as const } : { role: "img", "aria-label": name };
  return (
    <BaseAvatar.Root ref={ref} className={cx("brand-avatar", className)} data-size={size} {...labelProps} {...props}>
      {src ? <BaseAvatar.Image className="brand-avatar__image" src={src} alt="" /> : null}
      <BaseAvatar.Fallback className="brand-avatar__fallback" aria-hidden="true">
        {avatarInitials(name)}
      </BaseAvatar.Fallback>
    </BaseAvatar.Root>
  );
});

export interface AvatarGroupProps extends HTMLAttributes<HTMLDivElement> {
  /** Accessible label for the group, for example "Workspace members". */
  label: string;
}

export const AvatarGroup = forwardRef<HTMLDivElement, AvatarGroupProps>(function AvatarGroup(
  { className, label, ...props },
  ref,
) {
  return <div ref={ref} role="group" aria-label={label} className={cx("brand-avatar-group", className)} {...props} />;
});
