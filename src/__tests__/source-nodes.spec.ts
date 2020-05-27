import _ from 'lodash'
import fp from 'lodash/fp'

import * as Factory from 'factory.ts'
import Mitm from 'mitm'
import configureMockStore from 'redux-mock-store'
import sourceFilesystem, { FileSystemNode } from 'gatsby-source-filesystem'

import { sourceNodes } from '../source-nodes'
import fixtures from './fixtures.json'
import fixtures_paging from './fixtures-paging.json'

const FileSystemNodeMock = Factory.Sync.makeFactory<FileSystemNode>({})

const ListObjectsMock = jest.fn()
jest.mock('aws-sdk', () => ({
  S3: class {
    public listObjectsV2 = ListObjectsMock
  },
}))

describe('Source S3ImageAsset nodes.', () => {
  const nodes = {}

  const sourceNodeArgs = {
    actions: {
      createNode: jest.fn(node => (nodes[node.id] = node)),
      createParentChildLink: jest.fn(),
    },
    cache: {
      get: jest.fn(),
      set: jest.fn(),
    },
    createContentDigest: jest.fn(_.identity),
    createNodeId: jest.fn(_.identity),
    getNodes: jest.fn(),
    reporter: jest.fn(),
    store: {},
  }

  beforeAll(() => {
    Mitm().on('request', req => {
      const host = _.get(req, 'headers.host')
      const url = _.get(req, 'url')
      throw new Error(
        `Network requests forbidden in offline mode. Tried to call URL "${host}${url}"`
      )
    })
  })

  beforeEach(() => {
    sourceNodeArgs.store = configureMockStore()
    ListObjectsMock.mockReset()
    // Mock out Gatby's source-filesystem API.
    sourceFilesystem.createRemoteFileNode = jest
      .fn()
      .mockReturnValue(FileSystemNodeMock.build())
  })

  test('Verify sourceNodes creates the correct # of nodes, given our fixtures.', async () => {
    ListObjectsMock.mockReturnValueOnce({
      promise: () => fixtures,
    })
    // NB: pulls from fixtures defined above, not S3 API.
    const entityNodes = await sourceNodes(sourceNodeArgs, {
      accessKeyId: 'fake-access-key',
      bucketName: 'fake-bucket',
      secretAccessKey: 'secret-access-key',
    })
    // `createRemoteFileNode` called once for each of the five images in fixtures.
    expect(sourceFilesystem.createRemoteFileNode).toHaveBeenCalledTimes(5)
    // 5 images + 2 directories = 7 nodes
    expect(entityNodes).toHaveLength(7)
    expect(_.flow(fp.map('internal.type'), fp.uniq)(nodes)).toStrictEqual([
      'S3ImageAsset',
    ])
  })

  test('Verify sourceNodes creates the correct # of nodes, given paging is required.', async () => {
    ListObjectsMock.mockReturnValueOnce({
      promise: () => fixtures_paging,
    }).mockReturnValueOnce({
      promise: () => fixtures,
    })

    // NB: pulls from fixtures defined above, not S3 API.
    const entityNodes = await sourceNodes(sourceNodeArgs, {
      accessKeyId: 'fake-access-key',
      bucketName: 'fake-bucket',
      secretAccessKey: 'secret-access-key',
    })
    expect(sourceFilesystem.createRemoteFileNode).toHaveBeenCalledTimes(15)
    // 10 images + 2 directories + 5 images
    expect(entityNodes).toHaveLength(17)
  })

  test('Verify sourceNodes creates the correct # of nodes, given no fixtures.', async () => {
    ListObjectsMock.mockReturnValueOnce({ promise: () => [] })
    // NB: pulls from fixtures defined above, not S3 API.
    const entityNodes = await sourceNodes(sourceNodeArgs, {
      accessKeyId: 'fake-access-key',
      bucketName: 'fake-bucket',
      secretAccessKey: 'secret-access-key',
    })
    expect(sourceFilesystem.createRemoteFileNode).toHaveBeenCalledTimes(0)
    expect(entityNodes).toHaveLength(0)
  })
})
