import { createRemoteFileNode } from 'gatsby-source-filesystem'
import AWS, { S3 } from 'aws-sdk'
import _ from 'lodash'
import fp from 'lodash/fp'

// =================
// AWS config setup.
// =================
const S3Instance = new AWS.S3({ apiVersion: '2006-03-01' })

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

// const constructS3UrlForAsset = ({
//   bucketName,
//   domain,
//   key,
//   protocol = 'https',
// }): string | null => {
//   console.log({ bucketName, domain, key, protocol })
//   // Both `key` and either one of `bucketName` or `domain` are required.
//   // if (!_.some(key, _.every([bucketName, domain]))) {
//   if (!key || !(bucketName && domain)) {
//     console.warn(
//       'returning early: either key is undefined, or both bucketname and domain are.'
//     )
//     return null
//   }
//   // If `domain` is defined, that takes precedence over `bucketName.`
//   return domain
//     ? `${protocol}://${domain}/${key}`
//     : `${protocol}://${bucketName}.s3.amazonaws.com/${key}`
// }

const constructS3UrlForAsset = ({
  bucketName,
  domain,
  key,
  protocol = 'https',
}) => {
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

/**
 * S3 API doesn't expose Content-Type, and we don't want to make unnecessary
 * HTTP requests for non-images... so we'll just infer based on the suffix
 * of the Key.
 */
export const isImage = (entity): boolean => {
  const extension: string | undefined = _.flow(
    fp.get('Key'),
    fp.split('.'),
    fp.last
  )(entity)
  return _.includes(['gif', 'jpeg', 'jpg', 'png', 'webp'], extension)
}

export const sourceNodes = async (
  { actions, cache, createContentDigest, store },
  { bucketName, domain, protocol = 'https' }: SourceS3Options
): Promise<any> => {
  console.log('\n=====================================')
  console.log('SOURCE NODES')
  console.log('=====================================')
  const { createNode } = actions

  const listObjectsResponse: S3.ListObjectsV2Output = await S3Instance.listObjectsV2(
    { Bucket: bucketName }
  ).promise()
  console.log({ listObjectsResponse })
  const s3Entities: S3.ObjectList | undefined = _.get(
    listObjectsResponse,
    'Contents'
  )
  if (!s3Entities) {
    console.trace('Returning early because bucket is empty.')
    return
  }
  console.log('')
  console.log({ s3Entities })

  return await Promise.all(
    s3Entities.map(async entity => {
      console.log('====================================================')
      console.log('processing s3 entity\n', { entity })
      console.log('====================================================')
      if (!isImage(entity)) {
        console.warn('returning early because node is not image: \n', {
          entity,
        })
        return null
      }

      const s3Url: string | null = constructS3UrlForAsset({
        bucketName,
        domain,
        key: entity.Key,
        protocol,
      })
      console.log('s3 URL: ', { s3Url })
      if (!s3Url) {
        console.error('s3Url is null for entity', { entity })
        return null
      }

      const entityData = {
        bucketName,
        cache,
        createNode,
        createNodeId: createContentDigest,
        domain,
        entity,
        localFile___NODE: null,
        protocol,
        s3Url,
        store,
      }

      const fileNode = await createS3RemoteFileNode(entityData)
      console.log({ fileNode })
      if (!fileNode) {
        console.log('returning early from create s3 remote file node')
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
  console.log('============================================')
  console.log('createS3RemoteFileNode')
  console.log('============================================')
  try {
    return await createRemoteFileNode({
      cache,
      createNode,
      createNodeId,
      store,
      url: s3Url,
    })
  } catch (err) {
    console.error('Unable to create file node.', err)
    return
  }
}

const createS3ImageAssetNode = async ({
  createNode,
  entity,
  fileNode,
  s3Url,
}): Promise<any> => {
  console.log('========================================================')
  console.log('createS3ImageAssetNode')
  console.log('========================================================')
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

// export const onCreateNode = async (
//   { actions: { createNode }, node, createContentDigest, store, cache },
//   { nodeName = `localFile` }
// ) => {
//   // if (filter(node)) {
//   const fileNode = await createRemoteFileNode({
//     url: node.url,
//     store,
//     cache,
//     createNode,
//     createNodeId: createContentDigest,
//   })
//   console.log({ fileNode })
//   if (fileNode) {
//     const fileNodeLink = `${nodeName}___NODE`
//     node[fileNodeLink] = fileNode.id
//   }
//   // }
// }
