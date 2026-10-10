const FOLDER = "Images/Pokemon%20-%20256x256/Addressable%20Assets";

/** Primary: jsDelivr CDN. Fallback: raw GitHub (jsDelivr can lag behind the nightly sync). */
export function imageUrls(file: string | null): string[] {
  if (!file) return [];
  const f = encodeURIComponent(file);
  return [
    `https://cdn.jsdelivr.net/gh/reptilezsweden/RepDex@main/${FOLDER}/${f}`,
    `https://raw.githubusercontent.com/reptilezsweden/RepDex/main/${FOLDER}/${f}`,
  ];
}
