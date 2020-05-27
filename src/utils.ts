import { S3 } from 'aws-sdk'
import _ from 'lodash'
import fp from 'lodash/fp'
import invariant from 'invariant'
import mime from 'mime-types'

import { FileSystemNode } from 'gatsby-source-filesystem'

import EntityNode from './types/EntityNode'

// =========================
// Plugin-specific constants.
// =========================
export const S3SourceGatsbyNodeType = 'S3ImageAsset'

/**
 * Instantiate a new instance of the S3 API SDK.
 */
export const createS3Instance = ({ accessKeyId, domain, secretAccessKey }) =>
  new S3({
    accessKeyId,
    apiVersion: '2006-03-01',
    endpoint: domain,
    s3ForcePathStyle: true,
    secretAccessKey,
    signatureVersion: 'v4',
  })

/**
 * S3 API doesn't expose Content-Type, and we don't want to make unnecessary
 * HTTP requests for non-images... so we'll just infer based on the suffix
 * of the Key.
 */
export const isImage = (entity: S3.Object): boolean => {
  const extension: string | undefined = _.flow(
    fp.get('Key'),
    fp.split('.'),
    fp.last
  )(entity)
  return _.includes(['gif', 'jpeg', 'jpg', 'png', 'webp'], extension)
}

export const getEntityNodeFields = ({
  entity,
  fileNode,
}: {
  entity: S3.Object
  fileNode: FileSystemNode
}): EntityNode => {
  const { ETag, Key } = entity
  invariant(Key, 'Entity Key must be defined.')
  const mediaType = mime.lookup(Key!)
  invariant(
    mediaType,
    `Unable to determine MIME media type for entity: ${entity.Key}`
  )

  // Remove obnoxious escaped double quotes in S3 object's ETag. For reference:
  // > The entity tag is a hash of the object. The ETag reflects changes only
  // > to the contents of an object, not its metadata.
  // @see https://docs.aws.amazon.com/AmazonS3/latest/API/RESTCommonResponseHeaders.html
  const objectHash: string = ETag!.replace(/"/g, '')
  const fileNodeId: string = _.get(fileNode, 'id')
  const absolutePath: string = _.get(fileNode, 'absolutePath')
  return {
    absolutePath,
    fileNodeId,
    Key: Key!,
    mediaType,
    objectHash,
  }
}

export const constructS3UrlForAsset = ({
  bucketName,
  domain,
  s3,
  key,
  protocol = 'https',
  expirySeconds = 60 * 5,
}: {
  bucketName: string
  domain: string
  s3?: S3
  key: string
  protocol?: string
  expirySeconds?: number
}): string => {
  // Both `key` and either one of `bucketName` or `domain` are required.
  const areParamsValid = key && (bucketName || domain)
  if (!areParamsValid) {
    throw new Error('Unable to construct S3 URL for asset: invalid params.')
  }

  // If `domain` is not defined, we assume we're referring to AWS S3.
  // If it *is*, assume we're pointing to a third-party implementation of the
  // protocol (e.g., Minio, Digital Ocean Spaces, OpenStack Swift, etc).
  const isAWS: boolean = _.includes(domain, 'amazonaws.com')
  if (isAWS) {
    const url = s3.getSignedUrl('getObject', {
      Bucket: bucketName,
      Key: key,
      Expires: expirySeconds
    })
    return url
  } else {
    return `${protocol}://${domain}/${bucketName}/${key}`
  }
}

export const createS3ImageAssetNode = ({
  createNode,
  createNodeId,
  entity,
  fileNode,
  url,
}: {
  createNode: Function
  createNodeId: (objectHash: string) => string
  entity: S3.Object
  fileNode: FileSystemNode
  url: string
}) => {
  const {
    absolutePath,
    fileNodeId,
    Key,
    mediaType,
    objectHash,
  } = getEntityNodeFields({ entity, fileNode })

  return createNode({
    ...entity,
    absolutePath,
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
