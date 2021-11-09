export default ({ actions }) => {
  const { createTypes } = actions
  const typeDefs = `
    type S3ImageAsset implements Node {
      id: String!
      absolutePath: String!
      ETag: String!
      Key: String!
      EXIF: ExifData
      internal: S3ImageAssetNodeInternal!
    }

    type S3ImageAssetInternal {
      content: String!
      contentDigest: String!
      mediaType: String!
      type: String!
    }

    type ExifData {
      DateCreated: Date
      DateCreatedISO: String
      DateTime: Date
      DateTimeOriginal: Int
      ExposureTime: Int
      FNumber: Int
      FocalLength: Int
      ISO: Int
      LensModel: String
      Model: String
      ShutterSpeedValue: Int
    }
`
  createTypes(typeDefs)
}
