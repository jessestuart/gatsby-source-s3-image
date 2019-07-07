import { DateTime } from 'luxon'
import { ExifParserFactory } from 'ts-exif-parser'
import {
  GraphQLFloat,
  GraphQLInt,
  GraphQLObjectType,
  GraphQLString,
} from 'gatsby/graphql'
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

interface ExtendNodeTypeOptions {
  type: {
    name: string
  }
}

export default ({ type }: ExtendNodeTypeOptions) => {
  if (type.name !== 'S3ImageAsset') {
    return Promise.resolve()
  }

  return Promise.resolve({
    ETag: { type: GraphQLString },
    EXIF: {
      resolve: (image: S3ImageAssetNode) => ({
        ...type,
        ...resolveExifData(image),
      }),
      type: new GraphQLObjectType({
        fields: {
          DateCreatedISO: { type: GraphQLString },
          DateTimeOriginal: { type: GraphQLInt },
          Exposure: { type: GraphQLString },
          ExposureTime: { type: GraphQLFloat },
          FNumber: { type: GraphQLFloat },
          FocalLength: { type: GraphQLFloat },
          ISO: { type: GraphQLInt },
          LensModel: { type: GraphQLString },
          Model: { type: GraphQLString },
          ShutterSpeedFraction: { type: GraphQLString },
          ShutterSpeedValue: { type: GraphQLFloat },
        },
        name: 'ExifData',
      }),
    },
    Key: { type: GraphQLString },
  })
}
