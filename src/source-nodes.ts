import { S3 } from 'aws-sdk'
import { createRemoteFileNode } from 'gatsby-source-filesystem'
import _ from 'lodash'

import { constructS3UrlForAsset, isImage } from './utils'

// =================
// AWS config setup.
// =================
const S3Instance: S3 = new S3({ apiVersion: '2006-03-01' })

// =========================
// Plugin-specific constants.
// =========================
const S3SourceGatsbyNodeType = 'S3ImageAsset'

// =================
// Type definitions.
// =================
export interface SourceS3Options {
  bucketName: string
  // Defaults to `${bucketName}.s3.amazonaws.com`, but may be
  // overridden to e.g., support CDN's (such as CloudFront),
  // or any other S3-compliant API (such as DigitalOcean
  // Spaces.)
  domain: string
  // Defaults to HTTPS.
  protocol: string
}

export const sourceNodes = async (
  { actions: { createNode }, cache, createNodeId, store },
  { bucketName, domain, protocol = 'https' }: SourceS3Options
): Promise<any> => {
  const listObjectsResponse: S3.ListObjectsV2Output = await S3Instance.listObjectsV2(
    { Bucket: bucketName }
  ).promise()

  const s3Entities: S3.ObjectList | undefined = _.get(
    listObjectsResponse,
    'Contents'
  )
  if (!s3Entities) {
    return Promise.resolve([])
  }

  return await Promise.all(
    _.compact(
      s3Entities.map(async (entity: S3.Object) => {
        if (!isImage(entity)) {
          return null
        }

        const s3Url: string | undefined = constructS3UrlForAsset({
          bucketName,
          domain,
          key: entity.Key,
          protocol,
        })
        if (!s3Url) {
          return null
        }

        const entityData = {
          bucketName,
          cache,
          createNode,
          createNodeId,
          domain,
          entity,
          localFile___NODE: null,
          protocol,
          s3Url,
          store,
        }

        try {
          const fileNode = await createS3RemoteFileNode(entityData)
          if (!fileNode) {
            return null
          }

          entityData.localFile___NODE = fileNode.id

          return await createS3ImageAssetNode({
            ..._.pick(entityData, [
              'createNode',
              'createNodeId',
              'entity',
              's3Url',
            ]),
            fileNode,
          })
        } catch (err) {
          Promise.reject(err)
        }
      })
    )
  )
}

const createS3RemoteFileNode = async ({
  cache,
  createNode,
  createNodeId,
  s3Url,
  store,
}): Promise<any | undefined> => {
  try {
    return await createRemoteFileNode({
      cache,
      createNode,
      createNodeId,
      store,
      url: s3Url,
    })
  } catch (err) {
    return Promise.reject(err)
  }
}

const createS3ImageAssetNode = async ({
  createNode,
  createNodeId,
  entity,
  fileNode,
  s3Url,
}: {
  createNode: Function
  createNodeId: Function
  entity: S3.Object
  fileNode: any
  s3Url: string
}): Promise<any> => {
  const { Key, ETag } = entity
  // TODO: Could probably pull this from fileNode.
  const ContentType = 'image/jpeg'
  // Remove obnoxious escaped double quotes in S3 object's ETag. For reference:
  // > The entity tag is a hash of the object. The ETag reflects changes only
  // > to the contents of an object, not its metadata.
  // @see https://docs.aws.amazon.com/AmazonS3/latest/API/RESTCommonResponseHeaders.html
  const objectHash: string = _.replace(ETag!, /\"/g, '')
  const fileNodeId: string = _.get(fileNode, 'id')
  return await createNode({
    ...entity,
    id: createNodeId(objectHash),
    absolutePath: fileNode.absolutePath,
    Key,
    parent: null,
    children: [fileNodeId],
    internal: {
      content: s3Url,
      contentDigest: objectHash,
      mediaType: ContentType,
      type: S3SourceGatsbyNodeType,
    },
  })
}

export const onCreateNode = async (
  { actions, node, createContentDigest, store, cache },
  { nodeName = 'localFile' }
): Promise<any> => {
  const { createNode } = actions
  const { url } = node
  const fileNode = await createRemoteFileNode({
    cache,
    createNode,
    createNodeId: createContentDigest,
    store,
    url,
  })
  if (fileNode) {
    const fileNodeLink = `${nodeName}___NODE`
    node[fileNodeLink] = fileNode.id
  }
}
