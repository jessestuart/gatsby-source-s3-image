/* @flow */

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
 *           FNumber
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
 *           FNumber
 *           // ...etc
 *         }
 *       }
 *     }
 *   }
 * }
 * ```
 */
export type ExifData = {
  DateCreatedISO: String,
  DateTimeOriginal: Number,
  ExposureTime: Number,
  FNumber: Number,
  FocalLength: Number,
  ISO: Number,
  LensModel: String,
  Model: String,
  ShutterSpeedValue: Number,
}
