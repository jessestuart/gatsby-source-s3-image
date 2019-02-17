import Promise from 'bluebird'
import exif from 'exif-parser'
import fs from 'fs'
import {
  GraphQLFloat,
  GraphQLInt,
  GraphQLObjectType,
  GraphQLString,
} from 'graphql'
import _ from 'lodash'
import { DateTime } from 'luxon'

import { ExifData } from './types/exif-data'
import { S3ImageAssetNode } from './types/s3-image-asset-node'

export const resolveExifData = (image: S3ImageAssetNode): ExifData => {
  const file = fs.readFileSync(image.absolutePath)
  const tags = exif.create(file).parse().tags
  const timestamp = tags.DateTimeOriginal * 1000
  const DateCreatedISO = DateTime.fromMillis(timestamp).toISODate()
  return {
    DateCreatedISO,
    ..._.pick(tags, [
      'DateTimeOriginal',
      'ExposureTime',
      'FNumber',
      'FocalLength',
      'ISO',
      'LensModel',
      'Model',
      'ShutterSpeedValue',
    ]),
  }
}

export interface ExtendNodeTypeOptions {
  type: {
    name: string
  }
}

export const extendNodeType = ({
  type,
}: ExtendNodeTypeOptions): Promise<object> => {
  if (type.name !== 'S3ImageAsset') {
    return {}
  }

  return Promise.resolve({
    ETag: { type: GraphQLString },
    EXIF: {
      type: new GraphQLObjectType({
        fields: {
          DateCreatedISO: { type: GraphQLString },
          DateTimeOriginal: { type: GraphQLInt },
          ExposureTime: { type: GraphQLFloat },
          FNumber: { type: GraphQLFloat },
          FocalLength: { type: GraphQLFloat },
          ISO: { type: GraphQLInt },
          LensModel: { type: GraphQLString },
          Model: { type: GraphQLString },
          ShutterSpeedValue: { type: GraphQLFloat },
        },
        name: 'ExifData',
      }),

      resolve(image: S3ImageAssetNode) {
        return {
          ...type,
          ...resolveExifData(image),
        }
      },
    },
    Key: { type: GraphQLString },
  })
}
