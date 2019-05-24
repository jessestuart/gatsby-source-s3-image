const _ = require('lodash')
import setFieldsOnGraphQLNodeType from './set-fields-on-graphql-node-type'
import sourceNodes from './source-nodes'

const onCreateNode = ({ node, actions, getNode }) => {
  const { createParentChildLink } = actions
  const type = _.get(node, 'internal.type')

  if (type === 'S3ImageAsset') {
    // const children = _.map(node.children, child => getNode(child))
    // const children = getNode(node.children)
    const parent = getNode(node.parent)
    const imageSharp = getNode(parent.children[0])
    createParentChildLink({ parent: node, child: imageSharp })
  }
}

export { onCreateNode, setFieldsOnGraphQLNodeType, sourceNodes }
