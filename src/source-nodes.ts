import { createRemoteFileNode } from 'gatsby-source-filesystem'
import AWS from 'aws-sdk'
import _ from 'lodash'
import mime from 'mime-types'

import { constructS3UrlForAsset, isImage } from './utils'

// =================
// AWS config setup.
// =================
const S3Instance = new AWS.S3({ apiVersion: '2006-03-01' })

// =========================
// Plugin-specific constants.
// =========================
export const S3SourceGatsbyNodeType = 'S3ImageAsset'

// =================
// Type definitions.
// =================
export interface SourceS3Options {
  bucketName: string
  // Defaults to `${bucketName}.s3.amazonaws.com`, but may be
  // overridden to e.g., support CDN's (such as CloudFront),
  // or any other S3-compliant API (such as DigitalOcean
  // Spaces.)
  domain?: string
  // Defaults to HTTPS.
  protocol?: string
}

export const sourceNodes = async (
  { actions, cache, createNodeId, store },
  { bucketName, domain, protocol = 'https' }: SourceS3Options
): Promise<any> => {
  const { createNode } = actions

  const listObjectsResponse: AWS.S3.ListObjectsV2Output = await S3Instance.listObjectsV2(
    { Bucket: bucketName }
  ).promise()

  const s3Entities: AWS.S3.ObjectList | undefined = _.get(
    listObjectsResponse,
    'Contents'
  )
  if (!s3Entities) {
    return Promise.resolve()
  }

  return await Promise.all(
    s3Entities.map(async (entity: AWS.S3.Object) => {
      if (!isImage(entity)) {
        return
      }

      const url: string | undefined = constructS3UrlForAsset({
        bucketName,
        domain,
        key: entity.Key,
        protocol,
      })
      if (!url) {
        return
      }

      try {
        const fileNode = await createRemoteFileNode({
          cache,
          createNode,
          createNodeId,
          store,
          url,
        })
        if (!fileNode) {
          return
        }

        return await createS3ImageAssetNode({
          createNode,
          createNodeId,
          entity,
          fileNode,
          url,
        })
      } catch (err) {
        Promise.reject(err)
      }
    })
  )
}

export const createS3ImageAssetNode = async ({
  createNode,
  createNodeId,
  entity,
  fileNode,
  url,
}: {
  createNode: Function
  createNodeId: (any) => string
  entity: AWS.S3.Object
  fileNode: { absolutePath: string; id: string }
  url: string
}): Promise<any> => {
  if (!fileNode) {
    return Promise.reject()
  }

  const { ETag, Key } = entity
  // TODO: Use the `mime-types` lib to populate this dynamically.
  // const ContentType = 'image/jpeg'
  const mediaType = mime.lookup(entity.Key)
  // Remove obnoxious escaped double quotes in S3 object's ETag. For reference:
  // > The entity tag is a hash of the object. The ETag reflects changes only
  // > to the contents of an object, not its metadata.
  // @see https://docs.aws.amazon.com/AmazonS3/latest/API/RESTCommonResponseHeaders.html
  const objectHash: string = ETag!.replace(/"/g, '')
  const fileNodeId: string = _.get(fileNode, 'id')
  const absolutePath: string = _.get(fileNode, 'absolutePath')
  return await createNode({
    ...entity,
    absolutePath: absolutePath,
    children: [fileNodeId],
    ETag: objectHash,
    id: createNodeId(objectHash),
    Key,
    parent: fileNodeId,
    internal: {
      content: url,
      contentDigest: objectHash,
      mediaType,
      type: S3SourceGatsbyNodeType,
    },
  })
}
