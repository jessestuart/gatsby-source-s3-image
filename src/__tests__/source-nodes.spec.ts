import sourceFilesystem from 'gatsby-source-filesystem'

import Mitm from 'mitm'
import configureMockStore from 'redux-mock-store'

import { sourceNodes } from '../source-nodes'
import fixtures from './fixtures.json'

const mockStore = configureMockStore()

// Mock out Gatby's source-filesystem API.
sourceFilesystem.createRemoteFileNode = jest.fn()

// Mock out `aws-sdk` module to prevent unnecessary calls to S3 during testing.
jest.mock('aws-sdk', () => ({
  S3: class {
    public listObjectsV2() {
      return {
        promise: () => fixtures,
      }
    }
  },
}))

describe('source S3ImageAsset nodes', () => {
  let args
  let nodes = {}

  beforeEach(() => {
    args = {
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
    Mitm().on('request', () => {
      throw new Error('Network requests forbidden in offline mode.')
    })
  })

  test('sourceNodes', async () => {
    // NB: pulls from fixtures defined above, not S3 API.
    const entityNodes = await sourceNodes(args, { bucketName: 'fake-bucket' })
    // `createRemoteFileNode` called once for each of the five images in fixtures.
    expect(sourceFilesystem.createRemoteFileNode).toHaveBeenCalledTimes(5)
    // 5 images + 2 directories = 7 nodes
    expect(entityNodes).toHaveLength(7)
  })
})
