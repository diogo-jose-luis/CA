// src/i18n/request.ts
import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async ({ locale }) => {

  const safeLocale = locale ?? "pt";

  return {
    locale: safeLocale,
    messages: (await import(`./messages/${safeLocale}.json`)).default
  };
});