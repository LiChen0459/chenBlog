/**
 * A moment stores its pictures in `images` (array).
 * `image` (single) is kept for records created before multi-image support.
 */
export function momentImages(moment) {
  if (!moment) return []
  const list = Array.isArray(moment.images) ? moment.images.filter(Boolean) : []
  if (list.length) return list
  return moment.image ? [moment.image] : []
}

/** Merge API results with the bundled fallback data, preferring the API copy. */
export function withFallback(list, fallback) {
  const items = Array.isArray(list) && list.length ? list : fallback
  return items.map((item) => ({
    ...item,
    images: momentImages(item),
  }))
}
