/**
 * ExifData persists the exif data parsed from an image binary
 * within Gatsby's GraphQL data layer. These fields can then be
 * accessed directly via the S3ImageAsset node -- e.g.,
 *
 * @example
 * ```graphql
 * {
 *   allS3ImageAsset {
 *     edges {
 *       node {
 *         id
 *         EXIF {
 *           DateCreatedISO
 *           FNumber
 *           // ...etc
 *         }
 *       }
 *     }
 *   }
 * }
 * ```
 *
 * Note that you can also access the `ImageSharp` node itself as a child relation:
 * @example
 * ```graphql
 * {
 *   allS3ImageAsset {
 *     edges {
 *       node {
 *         id
 *         childrenFile {
 *           id
 *           // ...
 *         }
 *         EXIF {
 *           DateCreatedISO
 *           Fnumber
 *           // ...etc
 *         }
 *       }
 *     }
 *   }
 * }
 * ```
 */
export default interface ExifData {
  DateCreatedISO?: string
  DateTimeOriginal?: number
  ExposureTime?: number
  FNumber?: number
  FocalLength?: number
  ISO?: number
  LensModel?: string
  Model?: string
  ShutterSpeedValue?: string
  [propertyName: string]: any
}

export const ExifDataKeys = [
  'DateCreatedISO',
  'DateTimeOriginal',
  'ExposureTime',
  'FNumber',
  'FocalLength',
  'ISO',
  'LensModel',
  'Model',
  'ShutterSpeedValue',
]
