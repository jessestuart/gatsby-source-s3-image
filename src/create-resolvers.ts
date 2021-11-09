import { DateTime } from 'luxon'
import { ExifParserFactory } from 'ts-exif-parser'
import _ from 'lodash'
import fracty from 'fracty'

import fs from 'fs'

import ExifData from './types/ExifData'
import S3ImageAssetNode from './types/S3ImageAssetNode'

const resolveExifData = _.memoize((
  image: S3ImageAssetNode // eslint-disable
): ExifData | undefined => {
  const file = fs.readFileSync(image.absolutePath)
  const tags = ExifParserFactory.create(file).parse().tags
  const timestamp: number | undefined = _.get(tags, 'DateTimeOriginal')
  if (!timestamp) {
    return
  }
  const DateCreatedISO = DateTime.fromMillis(timestamp * 1000).toISODate()

  const ExposureTime = _.get(tags, 'ExposureTime')
  const ShutterSpeedFraction = fracty(ExposureTime)

  return {
    DateCreatedISO,
    ShutterSpeedFraction,
    ..._.pick(tags, [
      'DateTimeOriginal',
      'Exposure',
      'ExposureTime',
      'FNumber',
      'FocalLength',
      'ISO',
      'LensModel',
      'Model',
      'ShutterSpeedValue',
    ]),
  }
})


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
 };