import { DateTime } from 'luxon'
import { ExifParserFactory } from 'ts-exif-parser'
import {
  GraphQLFloat,
  GraphQLInt,
  GraphQLObjectType,
  GraphQLString,
} from 'gatsby/graphql'
import _ from 'lodash'

import fs from 'fs'

import ExifData, { ExifDataKeys } from './types/ExifData'
import S3ImageAssetNode from './types/S3ImageAssetNode'

export const resolveExifData = (image: S3ImageAssetNode): ExifData | null => {
  const file = fs.readFileSync(image.absolutePath)
  const tags = ExifParserFactory.create(file).parse().tags
  // Return early if `DateTimeOriginal` isn't defined on Exif tags -- we'll
  // need this later on.
  if (!tags || !tags.DateTimeOriginal) {
    return null
  }

  const DateCreatedISO = DateTime.fromSeconds(tags.DateTimeOriginal).toISODate()
  return {
    DateCreatedISO,
    ..._.pick(tags, ExifDataKeys),
  }
}

export const setFieldsOnGraphQLNodeType = ({ type }): Promise<any> => {
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
    },
    Key: { type: GraphQLString },
  })
}
