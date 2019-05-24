import sourceFilesystem from 'gatsby-source-filesystem'
import _ from 'lodash'
import fp from 'lodash/fp'
import Mitm from 'mitm'
import configureMockStore from 'redux-mock-store'
import { getEntityNodeFields, sourceNodes } from '../source-nodes'
import fixtures from './fixtures.json'

// Mock out Gatby's source-filesystem API.
sourceFilesystem.createRemoteFileNode = jest.fn().mockReturnValue({
  id: 'remote-file-node-id',
})

jest.mock('aws-sdk', () => ({
  S3: class {
    public listObjectsV2 = () => ({ promise: () => fixtures })
  },
}))

describe('Source S3ImageAsset nodes.', () => {
  let nodes = {}
  let mockStore = {}

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
    store: mockStore,
  }

  beforeAll(() => {
    mockStore = configureMockStore()

    Mitm().on('request', req => {
      const host = _.get(req, 'headers.host')
      const url = _.get(req, 'url')
      throw new Error(
        `Network requests forbidden in offline mode. Tried to call URL "${host}${url}"`
      )
    })
  })

  test('Verify sourceNodes creates the correct # of nodes, given our fixtures.', async () => {
    // NB: pulls from fixtures defined above, not S3 API.
    const entityNodes = await sourceNodes(sourceNodeArgs, {
      bucketName: 'fake-bucket',
    })
    // `createRemoteFileNode` called once for each of the five images in fixtures.
    expect(sourceFilesystem.createRemoteFileNode).toHaveBeenCalledTimes(5)
    // 5 images + 2 directories = 7 nodes
    expect(entityNodes).toHaveLength(7)
    expect(
      _.flow(
        fp.map('internal.type'),
        fp.uniq
      )(nodes)
    ).toStrictEqual(['S3ImageAsset'])
  })

  test('Verify getEntityNodeFields utils func.', () => {
    const ETag = '"833816655f9709cb1b2b8ac9505a3c65"'
    const Key = '2019-04-10/DSC02943.jpg'
    const fileNodeId = 'file-node-id'
    const absolutePath = `/path/to/file/${Key}`
    const entity = { ETag, Key }
    const fileNodeMock = { absolutePath, id: fileNodeId }
    const nodeFields = getEntityNodeFields({ entity, fileNode: fileNodeMock })

    expect(nodeFields).toEqual({
      absolutePath,
      fileNodeId,
      Key,
      mediaType: 'image/jpeg',
      objectHash: '833816655f9709cb1b2b8ac9505a3c65',
    })
  })
})
