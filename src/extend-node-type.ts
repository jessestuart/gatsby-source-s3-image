import { ExifData } from './types/exif-data'
import { S3ImageAssetNode } from './types/s3-image-asset-node'

import Promise from 'bluebird'
import fs from 'fs'
import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLInt,
  GraphQLFloat,
} from 'graphql'
import exif from 'exif-parser'
import { DateTime } from 'luxon'
import _ from 'lodash'

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

export const extendNodeType = ({ type }: ExtendNodeTypeOptions) => {
  if (type.name !== 'S3ImageAsset') {
    return {}
  }

  return Promise.resolve({
    ETag: { type: GraphQLString },
    Key: { type: GraphQLString },
    EXIF: {
      type: new GraphQLObjectType({
        name: 'ExifData',
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
      }),

      resolve(image: S3ImageAssetNode) {
        return {
          ...type,
          ...resolveExifData(image),
        }
      },
    },
  })
}
