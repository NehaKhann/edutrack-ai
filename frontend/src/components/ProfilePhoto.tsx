import { useEffect, useState } from "react";
import clsx from "clsx";
import { UserIcon } from "@heroicons/react/24/solid";
import { apiClient } from "../api/client";

const sizeClasses = {
  sm: "h-10 w-10 text-sm",
  md: "h-16 w-16 text-lg",
  lg: "h-28 w-28 text-3xl",
  xl: "h-32 w-32 text-4xl",
};

export function ProfilePhoto({
  path,
  hasPhoto,
  name,
  size = "md",
  refreshKey,
}: {
  path: string;
  hasPhoto: boolean;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  refreshKey?: number;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!hasPhoto) {
      setImageUrl(null);
      return;
    }
    let objectUrl: string | null = null;
    let cancelled = false;
    apiClient
      .get(path, { responseType: "blob" })
      .then((res) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(res.data);
        setImageUrl(objectUrl);
      })
      .catch(() => setImageUrl(null));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path, hasPhoto, refreshKey]);

  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className={clsx("rounded-full object-cover ring-2 ring-white dark:ring-navy-800", sizeClasses[size])}
      />
    );
  }

  return (
    <div
      className={clsx(
        "flex items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700 ring-2 ring-white dark:bg-brand-500/15 dark:text-brand-300 dark:ring-navy-800",
        sizeClasses[size]
      )}
    >
      {initials || <UserIcon className="h-1/2 w-1/2" />}
    </div>
  );
}
