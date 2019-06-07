import _ from 'lodash'
import fp from 'lodash/fp'

const onCreateNode = ({ node, actions, getNode }) => {
  const { createParentChildLink } = actions
  const type = _.get(node, 'internal.type')

  if (type === 'S3ImageAsset') {
    const parent = getNode(node.parent)
    const imageSharp = getNode(
      _.flow(
        fp.get('children'),
        fp.first
      )(parent)
    )
    createParentChildLink({ parent: node, child: imageSharp })
  }
}

export default onCreateNode
