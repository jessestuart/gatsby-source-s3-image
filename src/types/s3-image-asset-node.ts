import ExifData from './exif-data'

/**
 * S3ImageAssetNode is a minimal wrapper composing the default Node
 * fields with those obtained from S3 -- initially just `Key`
 * and `ETag` (object digest), but the full map of Exif
 * properties are injected during the `extend-node-type` step.
 */
export default interface S3ImageAssetNode {
  id: string
  absolutePath: string
  ETag: string
  Key: string
  EXIF: ExifData | null
  internal: {
    content: string
    contentDigest: string
    mediaType: string
    type: string
  }
}
