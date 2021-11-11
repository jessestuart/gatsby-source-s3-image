/**
 * ExifData persists the exif data parsed from an image binary
 * within Gatsby's GraphQL data layer. These fields can then be
 * accessed directly via the S3ImageAsset node -- e.g.,
 * @example
 * ```graphql
 * {
 *   allS3ImageAsset {
 *     edges {
 *       node {
 *         id
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
 *
 * Note that you can also access the `ImageSharp` node as a child relation:
 * TODO: is this example correct?
 * @example
 * ```graphql
 * {
 *   allS3ImageAsset {
 *     edges {
 *       node {
 *         id
 *         childImageSharp {
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
  DateCreated?: Date
  DateCreatedISO?: string
  DateTime?: Date
  DateTimeOriginal?: number
  ExposureTime?: number
  Exposure?: string
  FNumber?: number
  FocalLength?: number
  ISO?: number
  LensModel?: string
  Model?: string
  ShutterSpeedFraction?: string
  ShutterSpeedValue?: string
  UserComment?: string
}
