import { ExifParserFactory, ExifTags } from 'ts-exif-parser'
import _ from 'lodash'
import fracty from 'fracty'

import fs from 'fs'

import ExifData from './types/ExifData'
import S3ImageAssetNode from './types/S3ImageAssetNode'

const getExifTags = (absolutePath): ExifTags | undefined => {
  const file = fs.readFileSync(absolutePath)
  return ExifParserFactory.create(file).parse().tags
}

const exifTags = [
  'DateTimeOriginal',
  'Exposure',
  'ExposureTime',
  'FNumber',
  'FocalLength',
  'ISO',
  'LensModel',
  'Model',
  'ShutterSpeedValue',
  'UserComment',
]

const resolveExifData = _.memoize(
  (
    image: S3ImageAssetNode // eslint-disable
  ): ExifData | undefined => {
    const tags = getExifTags(image.absolutePath)
    const timestamp: number | undefined = _.get(tags, 'DateTimeOriginal')
    if (!timestamp) {
      return
    }

    const DateCreated = new Date(timestamp * 1000)
    DateCreated.setHours(0, 0, 0, 0)

    return {
      ..._.pick(tags, exifTags),
      DateCreated: DateCreated,
      DateCreatedISO: DateCreated.toISOString().split('T')[0],
      DateTime: new Date(timestamp * 1000),
      ShutterSpeedFraction: fracty(_.get(tags, 'ExposureTime')),
    }
  }
)

export default ({ createResolvers }) => {
  const resolvers = {
    S3ImageAsset: {
      EXIF: {
        resolve: (image: S3ImageAssetNode) => ({
          ...resolveExifData(image),
        }),
      },
    },
  }
  createResolvers(resolvers)
}
