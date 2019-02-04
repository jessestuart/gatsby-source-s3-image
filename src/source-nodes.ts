import AWS from 'aws-sdk'
import { createRemoteFileNode } from 'gatsby-source-filesystem'
import _ from 'lodash'

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

const isImage = (entity: any): boolean => {
  // S3 API doesn't expose Content-Type, and we don't want to make unnecessary
  // HTTP requests for non-images... so we'll just infer based on the suffix
  // of the Key.
  const extension = _.last(_.split(entity.Key, '.'))
  return _.includes(['jpeg', 'jpg', 'png', 'webp', 'gif'], extension)
}

export const sourceNodes = async (
  { actions, store, cache },
  { bucketName, domain, protocol = 'https' }: SourceS3Options,
  done
): Promise<void> => {
  console.log('source nodes')
  const { createNode } = actions

  const listObjectsResponse = await S3.makeUnauthenticatedRequest(
    'listObjectsV2',
    {
      Bucket: bucketName,
    }
  ).promise()
  const s3Entities = _.get(listObjectsResponse, 'Contents')
  console.log({ s3Entities })

  await Promise.all(
    s3Entities.map(async entity => {
      if (!isImage(entity)) {
        return null
      }

      // @ts-ignore
      const s3Url: string | null | undefined = constructS3UrlForAsset({
        bucketName,
        domain,
        key: entity.Key,
        // @ts-ignore
        protocol,
      })
      if (!s3Url) {
        return null
      }

      const entityData = {
        bucketName,
        cache,
        createNode,
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
      return createS3ImageAssetNode({
        ...entityData,
        done,
        fileNode,
      })
    })
  )
  done()
}

const createS3RemoteFileNode = async ({
  cache,
  createNode,
  store,
  s3Url,
}): Promise<any | void> => {
  try {
    return await createRemoteFileNode({
      cache,
      createNode,
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
  done,
  entity,
  fileNode,
  s3Url,
  // @ts-ignore
  // ...rest
}): Promise<void> => {
  const { Key, ETag } = entity
  // TODO: Could probably pull this from fileNode.
  const ContentType = 'image/jpeg'
  // Remove obnoxious escaped double quotes in S3 object's ETag. For reference:
  // > The entity tag is a hash of the object. The ETag reflects changes only
  // > to the contents of an object, not its metadata.
  // @see https://docs.aws.amazon.com/AmazonS3/latest/API/RESTCommonResponseHeaders.html
  const objectHash = ETag.replace(/"/g, '')
  await createNode({
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
  done()
}
