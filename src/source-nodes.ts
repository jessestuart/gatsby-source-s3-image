import { S3 } from 'aws-sdk'
import _ from 'lodash'
import fp from 'lodash/fp'

import { createRemoteFileNode, FileSystemNode } from 'gatsby-source-filesystem'

import {
  constructS3UrlForAsset,
  createS3ImageAssetNode,
  createS3Instance,
  isImage,
} from './utils'
import S3ImageAssetNode from './types/S3ImageAssetNode'

// =================
// Type definitions.
// =================
export interface SourceS3Options {
  // NOTE: Required params.
  accessKeyId: string
  secretAccessKey: string
  bucketName: string
  // Defaults to `${bucketName}.s3.amazonaws.com`, but may be overridden to
  // e.g., support CDN's (such as CloudFront), or any other S3-compliant API
  // (such as DigitalOcean Spaces.)
  domain?: string
  region?: string
  // Defaults to HTTP.
  protocol?: string
}

export const sourceNodes = async (
  { actions, cache, createNodeId, getNodes, reporter, store },
  {
    // ================
    accessKeyId,
    secretAccessKey,
    bucketName,
    // ================
    domain = 's3.amazonaws.com',
    region = 'us-east-1',
    protocol = 'http',
  }: SourceS3Options
) => {
  const { createNode, touchNode } = actions
  const cachedNodes: S3ImageAssetNode[] = _.filter(
    getNodes(),
    _.flow(fp.get('internal.owner'), fp.eq('gatsby-source-s3-image'))
  )

  const nodesByKey = _.groupBy(cachedNodes, 'Key')

  const s3: S3 = createS3Instance({ accessKeyId, domain, secretAccessKey })

  // prettier-ignore
  const listObjectsResponse: S3.ListObjectsV2Output =
    await s3.listObjectsV2({ Bucket: bucketName }).promise()
  const s3Entities: S3.ObjectList = _.get(listObjectsResponse, 'Contents', [])
  if (_.isEmpty(s3Entities)) {
    return []
  }

  const cachedEntities = _.filter(s3Entities, (entity) => {
    const cachedEntity = _.first(nodesByKey[entity.Key as string])
    if (cachedEntity && entity.LastModified) {
      const cacheIsValid =
        entity.LastModified.getTime() === cachedEntity.LastModified.getTime()
      return cacheIsValid
    }
    return false
  })

  cachedEntities.forEach((entity) => {
    const cachedEntity = _.first(nodesByKey[entity.Key as string])
    touchNode(cachedEntity)
  })

  return Promise.all(
    _.compact(
      s3Entities.map(async (entity: S3.Object) => {
        const key = _.get(entity, 'Key')
        if (!key || !isImage(entity)) {
          return
        }

        const url = constructS3UrlForAsset({
          bucketName,
          domain,
          key,
          region,
          protocol,
        })
        if (!url) {
          return
        }

        const fileNode: FileSystemNode = await createRemoteFileNode({
          cache,
          createNode,
          createNodeId,
          reporter,
          store,
          url,
        })
        if (!fileNode) {
          return
        }

        return createS3ImageAssetNode({
          createNode,
          createNodeId,
          entity,
          fileNode,
          url,
        })
      })
    )
  )
}

export default sourceNodes
