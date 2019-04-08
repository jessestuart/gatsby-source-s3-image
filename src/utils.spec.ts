import { constructS3UrlForAsset, isImage } from './utils'

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
      key: 'my_image.jpg',
    })
    expect(s3Url).toBe('https://jesse.pics.s3.amazonaws.com/my_image.jpg')
  })

  test('constructS3UrlForAsset: third-party implementation', () => {
    const customUrl = constructS3UrlForAsset({
      bucketName: 'js-bucket',
      domain: 'minio.jesses.io',
      key: 'my_image.jpg',
      protocol: 'http',
    })
    expect(customUrl).toBe('http://minio.jesses.io/js-bucket/my_image.jpg')
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
})
