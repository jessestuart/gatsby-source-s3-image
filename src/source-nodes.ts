import AWS from 'aws-sdk'
import _ from 'lodash'

// tslint:disable eslint-disable-next-line
const { createRemoteFileNode } = require('gatsby-source-filesystem')

// =================
// AWS config setup.
// =================
const S3 = new AWS.S3({ apiVersion: '2006-03-01' })

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

const constructS3UrlForAsset = ({
  bucketName,
  domain,
  key,
  protocol = 'https',
}): string | null => {
  // Both `key` and either one of `bucketName` or `domain` are required.
  if (!key || (!bucketName && !domain)) {
    return null
  }
  // If `domain` is defined, that takes precedence over `bucketName.`
  if (domain) {
    return `${protocol}://${domain}/${key}`
  }
  if (bucketName) {
    return `${protocol}://${bucketName}.s3.amazonaws.com/${key}`
  }
  return null
}

function isImage(entity): boolean {
  // S3 API doesn't expose Content-Type, and we don't want to make unnecessary
  // HTTP requests for non-images... so we'll just infer based on the suffix
  // of the Key.
  const extension = _.last(_.split(entity.Key, '.'))
  return _.includes(['jpeg', 'jpg', 'png', 'webp', 'gif'], extension)
}

export const sourceNodes = async (
  { actions, store, cache, createNodeId },
  { bucketName, domain, protocol = 'https' }: SourceS3Options
): Promise<any> => {
  const { createNode } = actions

  const listObjectsResponse = await S3.makeUnauthenticatedRequest(
    'listObjectsV2',
    {
      Bucket: bucketName,
    }
  ).promise()
  const s3Entities = _.get(listObjectsResponse, 'Contents')
  // tslint:disable
  console.log({ s3Entities })

  return await Promise.all(
    s3Entities.map(async entity => {
      console.log('proceessing s3 entity', { entity })
      if (!isImage(entity)) {
        return null
      }

      const s3Url: string | null | undefined = constructS3UrlForAsset({
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

      const fileNode = await createS3RemoteFileNode(entityData)
      if (!fileNode) {
        return null
      }

      entityData.localFile___NODE = fileNode.id

      return await createS3ImageAssetNode({
        ..._.pick(entityData, ['createNode', 'entity', 's3Url']),
        fileNode,
      })
    })
  )
}

const createS3RemoteFileNode = async ({
  cache,
  createNode,
  store,
  s3Url,
  createNodeId,
}): Promise<any | void> => {
  try {
    return await createRemoteFileNode({
      cache,
      createNode,
      createNodeId,
      store,
      url: s3Url,
    })
  } catch (err) {
    // tslint:disable
    console.error('Unable to create file node.', err)
    return null
  }
}

const createS3ImageAssetNode = async ({
  createNode,
  entity,
  fileNode,
  s3Url,
}): Promise<any> => {
  console.log({ entity })
  const { Key, ETag } = entity
  // TODO: Could probably pull this from fileNode.
  const ContentType = 'image/jpeg'
  // Remove obnoxious escaped double quotes in S3 object's ETag. For reference:
  // > The entity tag is a hash of the object. The ETag reflects changes only
  // > to the contents of an object, not its metadata.
  // @see https://docs.aws.amazon.com/AmazonS3/latest/API/RESTCommonResponseHeaders.html
  const objectHash = ETag.replace(/"/g, '')
  console.log({ objectHash })
  return await createNode({
    ...entity,
    id: `${Key} >> ${S3SourceGatsbyNodeType}`,
    absolutePath: fileNode.absolutePath,
    Key,
    parent: fileNode.id,
    children: [],
    internal: {
      content: s3Url,
      contentDigest: objectHash,
      mediaType: ContentType,
      type: S3SourceGatsbyNodeType,
    },
  })
}
