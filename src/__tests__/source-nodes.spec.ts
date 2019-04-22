import sourceFilesystem from 'gatsby-source-filesystem';
import _ from 'lodash';
import Mitm from 'mitm';
import configureMockStore from 'redux-mock-store';
import { sourceNodes } from '../source-nodes';
import fixtures from './fixtures.json';

// Mock out Gatby's source-filesystem API.
sourceFilesystem.createRemoteFileNode = jest.fn()

jest.mock('aws-sdk', () => ({
  S3: class {
    public listObjectsV2 = (..._: any[]) => ({ promise: () => fixtures })
  },
}))

describe('Source S3ImageAsset nodes.', () => {
  let nodes = {}
  let mockStore = {}

  const sourceNodeArgs = {
    actions: {
      createNode: jest.fn(node => (nodes[node.id] = node)),
    },
    cache: {
      get: jest.fn(),
      set: jest.fn(),
    },
    createContentDigest: jest.fn(),
    createNodeId: jest.fn(),
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
  })

  // TODO
  test('Verify getNodeEntityFields utils func.', () => {})
})
