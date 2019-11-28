import { S3 } from 'aws-sdk'
import { parseStringPromise } from 'xml2js'
import _ from 'lodash'
import fp from 'lodash/fp'
import got from 'got'

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
  accessKeyId?: string
  secretAccessKey?: string
  bucketName?: string
  // Defaults to `${bucketName}.s3.amazonaws.com`, but may be overridden to
  // e.g., support CDN's (such as CloudFront), or any other S3-compliant API
  // (such as DigitalOcean Spaces.)
  domain?: string
  isVirtualHost?: boolean
  region?: string
  // Defaults to HTTP.
  protocol?: string
}

const queryVirtualHost = async ({ domain, protocol, bucketName }) => {
  const listBucketResponse = await got(
    `${protocol}://${domain}/${bucketName || ''}`
  )
  const responseJSON = await parseStringPromise(listBucketResponse.body, {
    explicitArray: false,
  })
  return _.get(responseJSON, 'ListBucketResult')
}

export const sourceNodes = async (
  { actions, cache, createNodeId, getNodes, reporter, store },
  {
    // ================
    accessKeyId,
    secretAccessKey,
    bucketName,
    isVirtualHost = false,
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
  // const nodesByKey = cachedNodes.reduce(
  //   (_acc, node) => ({ [node.Key]: node }),
  //   {}
  // )

  const s3: S3 = createS3Instance({ accessKeyId, domain, secretAccessKey })

  let listObjectsResponse: S3.ListObjectsV2Output
  if (isVirtualHost) {
    listObjectsResponse = await queryVirtualHost({
      bucketName,
      domain,
      protocol,
    })
    // console.log({ listObjectsResponse })
  } else {
    listObjectsResponse = await s3
      .listObjectsV2({ Bucket: bucketName || '' })
      .promise()
  }

  const s3Entities: S3.ObjectList = _.get(listObjectsResponse, 'Contents', [])
  if (_.isEmpty(s3Entities)) {
    return []
  }

  const cachedEntities = _.filter(s3Entities, (entity: S3.Object) => {
    // const cachedEntity = _.first(nodesByKey[entity.Key as string])
    const cachedEntity = _.first(nodesByKey[entity.Key as string])
    if (cachedEntity && entity.LastModified) {
      const cacheIsValid =
        //   entity.LastModified.getTime() === cachedEntity.LastModified.getTime()
        new Date(entity.LastModified).getTime() ===
        new Date(cachedEntity.LastModified).getTime()
      return cacheIsValid
    }
    return false
  })

  cachedEntities.forEach(entity => {
    const cachedEntity = _.first(nodesByKey[entity.Key as string])
    touchNode({ nodeId: _.get(cachedEntity, 'id') })
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

        let fileNode: FileSystemNode | null = null
        if (!nodesByKey[key]) {
          fileNode = await createRemoteFileNode({
            cache,
            createNode,
            createNodeId,
            reporter,
            store,
            url,
          })
        }
        // if (!fileNode) {
        //   return
        // }
        // console.log({ fileNode })

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
