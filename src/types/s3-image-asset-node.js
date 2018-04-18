/* @flow */
import type { ExifData } from './exif-data'

/**
 * S3ImageAssetNode is a minimal wrapper composing the default Node
 * fields with those obtained from S3 -- initially just `Key`
 * and `ETag` (object digest), but the full map of Exif
 * properties are injected during the `extend-node-type` step.
 */
export type S3ImageAssetNode = {
  id: String,
  absolutePath: String,
  ETag: String,
  Key: String,
  EXIF: ?ExifData,
  internal: {
    content: String,
    contentDigest: String,
    mediaType: String,
    type: String,
  },
}
