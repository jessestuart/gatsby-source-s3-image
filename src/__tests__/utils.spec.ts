import { FileSystemNode } from 'gatsby-source-filesystem'
import * as Factory from 'factory.ts'

import { constructS3UrlForAsset, getEntityNodeFields, isImage } from '../utils'

const FileSystemNodeMock = Factory.Sync.makeFactory<FileSystemNode>({})

describe('utils', () => {
  test('isImage', () => {
    const imageEntity = { Key: 'foo.jpg' }
    expect(isImage(imageEntity)).toBeTruthy()

    const notImageEntity = { Key: 'foo.bar' }
    expect(isImage(notImageEntity)).toBeFalsy()
  })

  test('constructS3UrlForAsset: AWS', () => {
    const s3Url: string = constructS3UrlForAsset({
      bucketName: 'jesse.pics',
      domain: 's3.amazonaws.com',
      region: 'us-east-1',
      key: 'my_image.jpg',
    })
    expect(s3Url).toBe(
      'https://jesse.pics.s3.us-east-1.amazonaws.com/my_image.jpg'
    )
  })

  test('constructS3UrlForAsset: third-party implementation', () => {
    const customUrl = constructS3UrlForAsset({
      bucketName: 'js-bucket',
      domain: 'minio.jesses.io',
      key: 'my_image.jpg',
      protocol: 'https',
    })
    expect(customUrl).toBe('https://minio.jesses.io/js-bucket/my_image.jpg')
  })

  test('constructS3UrlForAsset: invalid input', () => {
    expect(() => {
      // Invalid params -- `key` is required.
      // @ts-ignore
      constructS3UrlForAsset({
        bucketName: 'js-bucket',
        domain: 'minio.jesses.io',
        protocol: 'http',
      })
    }).toThrow()
  })

  test('Verify getEntityNodeFields utils func.', () => {
    const ETag = '"833816655f9709cb1b2b8ac9505a3c65"'
    const Key = '2019-04-10/DSC02943.jpg'
    const fileNodeId = 'file-node-id'
    const absolutePath = `/path/to/file/${Key}`
    const entity = { ETag, Key }
    const nodeFields = getEntityNodeFields({
      entity,
      fileNode: FileSystemNodeMock.build({ absolutePath, id: fileNodeId }),
    })

    expect(nodeFields).toEqual({
      absolutePath,
      fileNodeId,
      Key,
      mediaType: 'image/jpeg',
      objectHash: '833816655f9709cb1b2b8ac9505a3c65',
    })
  })
})
