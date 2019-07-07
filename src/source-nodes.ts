import { S3 } from 'aws-sdk'
import _ from 'lodash'

import { createRemoteFileNode, FileSystemNode } from 'gatsby-source-filesystem'

import {
  constructS3UrlForAsset,
  createS3ImageAssetNode,
  createS3Instance,
  isImage,
} from './utils'

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
  { actions, cache, createNodeId, reporter, store },
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
  const { createNode } = actions

  const s3: S3 = createS3Instance({ accessKeyId, domain, secretAccessKey })

  // prettier-ignore
  const listObjectsResponse: S3.ListObjectsV2Output =
    await s3.listObjectsV2({ Bucket: bucketName }).promise()

  const s3Entities: S3.ObjectList = _.get(listObjectsResponse, 'Contents', [])
  if (_.isEmpty(s3Entities)) {
    return []
  }

  return Promise.all(
    _.compact(
      s3Entities.map(async (entity: S3.Object) => {
        const key = _.get(entity, 'Key')
        if (!isImage(entity) || !key) {
          return
        }

        const url: string | undefined = constructS3UrlForAsset({
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
