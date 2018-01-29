/* @flow */
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

/**
 * ExifData persists the exif data parsed from an image binary
 * within Gatsby's GraphQL data infra. The best way to access
 * these fields is directly via the S3ImageAsset node -- e.g.,
 * @example
 * ```graphql
 * {
 *   allS3ImageAsset {
 *     edges {
 *       node {
 *         id
 *         EXIF {
 *           DateCreatedISO
 *           FNumber
 *           // ...etc
 *         }
 *       }
 *     }
 *   }
 * }
 * ```
 *
 * Note that you can also obtain direct access to the `ImageSharp`
 * node as a child relation:
 * @example
 * ```graphql
 * {
 *   allS3ImageAsset {
 *     edges {
 *       node {
 *         id
 *         EXIF {
 *           DateCreatedISO
 *           FNumber
 *           // ...etc
 *         }
 *       }
 *     }
 *   }
 * }
 * ```
 */
type ExifData = {
  DateCreatedISO: String,
  DateTimeOriginal: Number,
  ExposureTime: Number,
  FNumber: Number,
  FocalLength: Number,
  ISO: Number,
  LensModel: String,
  Model: String,
  ShutterSpeedValue: Number,
}

/**
 * S3ImageAssetNode is a minimal wrapper composing the default Node
 * fields with those obtained from S3 -- initially just `Key`
 * and `ETag` (object digest), but the full map of Exif
 * properties are injected during the `extend-node-type` step.
 */
type S3ImageAssetNode = {
  id: String,
  absolutePath: String,
  ETag: String,
  Key: String,
  EXIF: ?ExifData,
  internal: {
    content: String,
    contentDigest: String,
    mediaType: String,
    type: String,
  },
}

const resolveExifData = (image: S3ImageAssetNode): ExifData => {
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
