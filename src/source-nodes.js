// =========================
// Third party dependencies.
// =========================
const _ = require('lodash')
const AWS = require('aws-sdk')
const Promise = require('bluebird')

// ============
// Gatsby APIs.
// ============
const { createRemoteFileNode } = require('gatsby-source-filesystem')

// =================
// AWS config setup.
// =================
const S3 = new AWS.S3({ apiVersion: '2006-03-01' })

// =========================
// Plugin-specific contants.
// =========================
const S3SourceGatsbyNodeType = 'S3ImageAsset'

// =================
// Type definitions.
// =================
type SourceS3Options = {
  bucketName: String,
  // Defaults to `${bucketName}.s3.amazonaws.com`, but may be
  // overridden to e.g., support CDN's (such as CloudFront),
  // or any other S3-compliant API (such as DigitalOcean
  // Spaces.)
  domain: ?String,
  // Defaults to HTTPS.
  protocol: ?String,
}

const constructS3UrlForAsset = ({
  bucketName,
  domain,
  key,
  protocol = 'https',
}): ?String => {
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
}

exports.sourceNodes = async (
  { boundActionCreators, getNode, hasNodeChanged, store, cache },
  { bucketName, domain, protocol }: SourceS3Options,
  done
) => {
  const { createNode } = boundActionCreators

  const listObjectsResponse = await S3.makeUnauthenticatedRequest(
    'listObjectsV2',
    {
      Bucket: bucketName,
    }
  ).promise()
  const s3Entities = _.get(listObjectsResponse, 'Contents')

  await Promise.all(
    s3Entities.map(async entity => {
      const s3Url = constructS3UrlForAsset({
        bucketName,
        domain,
        key: entity.Key,
        protocol,
      })
      const entityData = {
        bucketName,
        cache,
        createNode,
        domain,
        entity,
        protocol,
        store,
        s3Url,
      }

      const fileNode = await createS3RemoteFileNode(entityData)
      if (fileNode) {
        entityData.localFile___NODE = fileNode.id
      }
      await createS3ImageAssetNode({
        ...entityData,
        fileNode,
        done,
      })
    })
  )
  done()
}

const createS3RemoteFileNode = async ({ cache, createNode, store, s3Url }) => {
  try {
    return await createRemoteFileNode({
      url: s3Url,
      store,
      cache,
      createNode,
    })
  } catch (err) {
    // eslint-disable-next-line
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
}) => {
  const { Key, ETag } = entity
  // TODO: Could probably pull this from fileNode.
  const ContentType = 'image/jpeg'
  // Remove obnoxious escaped double quotes in S3 object's ETag. For reference:
  // > The entity tag is a hash of the object. The ETag reflects changes only
  // > to the contents of an object, not its metadata.
  // @see https://docs.aws.amazon.com/AmazonS3/latest/API/RESTCommonResponseHeaders.html
  const objectHash = ETag.replace(/"/g, '')
  createNode({
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
