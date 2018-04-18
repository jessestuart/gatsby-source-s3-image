/* @flow */
import type { ExifData } from './types/exif-data'
import type { S3ImageAssetNode } from './types/s3-image-asset-node'

const Promise = require('bluebird')
const fs = require('fs')
const {
  GraphQLObjectType,
  GraphQLString,
  GraphQLInt,
  GraphQLFloat,
} = require('graphql')
const exif = require('exif-parser')
const DateTime = require('luxon').DateTime
const _ = require('lodash')

const resolveExifData = (image: S3ImageAssetNode): ExifData => {
  // $FlowFixMe
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

type ExtendNodeTypeOptions = {
  type: {
    name: String,
  },
}

const extendNodeType = ({ type }: ExtendNodeTypeOptions) => {
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

exports.extendNodeType = extendNodeType

exports.resolveExifData = resolveExifData
