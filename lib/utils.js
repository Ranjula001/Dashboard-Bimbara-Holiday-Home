import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Joins Tailwind class names and lets later ones override earlier ones.
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
