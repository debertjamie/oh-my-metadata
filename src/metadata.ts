import exifr from 'exifr'

/** A single key/value row rendered in the UI. */
export interface MetadataField {
  label: string
  value: string
}

/** A named group of metadata fields (e.g. "Camera"). */
export interface MetadataSection {
  title: string
  fields: MetadataField[]
}

/** GPS coordinates in decimal degrees, when present. */
export interface GpsLocation {
  latitude: number
  longitude: number
}

/** Normalized metadata ready for rendering. */
export interface PhotoMetadata {
  sections: MetadataSection[]
  gps: GpsLocation | null
  /** True when the image parsed fine but carried no EXIF metadata. */
  isEmpty: boolean
}

/**
 * The subset of exifr's output we read. exifr returns a loosely-typed object,
 * so we describe the fields we actually consume rather than using `any`.
 */
interface RawExif {
  Make?: string
  Model?: string
  LensModel?: string
  Lens?: string
  Software?: string
  DateTimeOriginal?: Date | string
  ExposureTime?: number
  FNumber?: number
  ISO?: number
  FocalLength?: number
  Flash?: string | number
  ExifImageWidth?: number
  ExifImageHeight?: number
  ImageWidth?: number
  ImageHeight?: number
  Orientation?: string | number
  ColorSpace?: string | number
  latitude?: number
  longitude?: number
}

function pushIf(fields: MetadataField[], label: string, value: unknown): void {
  if (value === undefined || value === null) return
  const text = typeof value === 'string' ? value.trim() : String(value)
  if (text === '') return
  fields.push({ label, value: text })
}

function formatDate(value: Date | string | undefined): string | undefined {
  if (value === undefined) return undefined
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return typeof value === 'string' ? value : undefined
  }
  return date.toLocaleString()
}

function formatExposure(seconds: number | undefined): string | undefined {
  if (seconds === undefined) return undefined
  if (seconds >= 1) return `${seconds}s`
  return `1/${Math.round(1 / seconds)}s`
}

/**
 * Parse an image file entirely in the browser and normalize the result into
 * readable sections. Never uploads the file anywhere.
 */
export async function parseMetadata(file: File): Promise<PhotoMetadata> {
  // ifd0 (Make/Model and other TIFF tags) is always parsed and cannot be
  // disabled, so we only need to opt into the exif and gps segments.
  const raw = (await exifr.parse(file, {
    exif: true,
    gps: true,
  })) as RawExif | undefined

  const sections: MetadataSection[] = []
  let gps: GpsLocation | null = null

  if (!raw) {
    return { sections, gps, isEmpty: true }
  }

  const camera: MetadataField[] = []
  pushIf(camera, 'Make', raw.Make)
  pushIf(camera, 'Model', raw.Model)
  pushIf(camera, 'Lens', raw.LensModel ?? raw.Lens)
  pushIf(camera, 'Software', raw.Software)

  const capture: MetadataField[] = []
  pushIf(capture, 'Date taken', formatDate(raw.DateTimeOriginal))
  pushIf(capture, 'Shutter speed', formatExposure(raw.ExposureTime))
  pushIf(capture, 'Aperture', raw.FNumber !== undefined ? `f/${raw.FNumber}` : undefined)
  pushIf(capture, 'ISO', raw.ISO)
  pushIf(capture, 'Focal length', raw.FocalLength !== undefined ? `${raw.FocalLength} mm` : undefined)
  pushIf(capture, 'Flash', raw.Flash)

  const width = raw.ExifImageWidth ?? raw.ImageWidth
  const height = raw.ExifImageHeight ?? raw.ImageHeight
  const image: MetadataField[] = []
  pushIf(image, 'Dimensions', width !== undefined && height !== undefined ? `${width} x ${height}` : undefined)
  pushIf(image, 'Orientation', raw.Orientation)
  pushIf(image, 'Color space', raw.ColorSpace)

  if (typeof raw.latitude === 'number' && typeof raw.longitude === 'number') {
    gps = { latitude: raw.latitude, longitude: raw.longitude }
  }

  if (camera.length) sections.push({ title: 'Camera', fields: camera })
  if (capture.length) sections.push({ title: 'Capture settings', fields: capture })
  if (image.length) sections.push({ title: 'Image', fields: image })

  const isEmpty = sections.length === 0 && gps === null

  return { sections, gps, isEmpty }
}

/** Build an OpenStreetMap URL that centers on the given coordinates. */
export function openStreetMapUrl({ latitude, longitude }: GpsLocation): string {
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=15/${latitude}/${longitude}`
}
