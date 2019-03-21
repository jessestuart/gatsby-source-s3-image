import { isImage } from './source-nodes'

describe('source-nodes', () => {
  test('isImage', () => {
    const imageEntity = { Key: 'foo.jpg' }
    expect(isImage(imageEntity)).toBeTruthy()
    const notImageEntity = { Key: 'foo.bar' }
    expect(isImage(notImageEntity)).toBeFalsy()
  })
})
