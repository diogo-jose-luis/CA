// hooks/useLocale.ts
import { usePathname } from "next/navigation";

export default function useLocale() {
  const pathname = usePathname();
  return pathname?.split("/")[1] || "pt";
}