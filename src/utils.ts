import { S3 } from 'aws-sdk'
import _ from 'lodash'
import fp from 'lodash/fp'

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

export const constructS3UrlForAsset = ({
  bucketName,
  domain = '',
  key,
  protocol = 'https',
}): string => {
  // Both `key` and either one of `bucketName` or `domain` are required.
  const areParamsInvalid: boolean = !key || (!bucketName && !domain)
  if (areParamsInvalid) {
    throw new Error('Unable to construct S3 URL for asset: invalid params.')
  }

  // If `domain` is not defined, we assume we're referring to AWS S3.
  // If it *is*, assume we're pointing to a third-party implementation of the
  // protocol (e.g., Minio, Digital Ocean Spaces, OpenStack Swift, etc).
  return domain && !_.includes(domain, 's3.amazonaws.com')
    ? `${protocol}://${domain}/${bucketName}/${key}`
    : `${protocol}://${bucketName}.s3.amazonaws.com/${key}`
}
