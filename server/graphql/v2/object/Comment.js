import { GraphQLObjectType, GraphQLString } from 'graphql';
import { GraphQLDateTime } from 'graphql-iso-date';
import { GraphQLJSONObject } from 'graphql-type-json';

import { collectiveResolver, fromCollectiveResolver, getStripTagsResolver } from '../../common/comment';
import { getIdEncodeResolver } from '../identifiers';
import { Account } from '../interface/Account';

const Comment = new GraphQLObjectType({
  name: 'Comment',
  description: 'This represents an Comment',
  fields: () => {
    return {
      id: {
        type: GraphQLString,
        resolve: getIdEncodeResolver('comment'),
      },
      createdAt: {
        type: GraphQLDateTime,
      },
      html: {
        type: GraphQLString,
      },
      markdown: {
        type: GraphQLString,
        resolve: getStripTagsResolver('markdown'),
      },
      fromAccount: {
        type: Account,
        resolve: fromCollectiveResolver,
      },
      account: {
        type: Account,
        resolve: collectiveResolver,
      },
      reactions: {
        type: GraphQLJSONObject,
        async resolve(comment, args, req) {
          const reactions = await req.loaders.Comment.reactionsByCommentId.load(comment.id);
          const emojiMap = {};
          reactions.forEach(item => {
            emojiMap[item.emoji] = item.count;
          });
          return emojiMap;
        },
      },
      // Deprecated
      fromCollective: {
        type: Account,
        resolve: fromCollectiveResolver,
        deprecationReason: '2020-02-25: Please use fromAccount',
      },
      collective: {
        type: Account,
        resolve: collectiveResolver,
        deprecationReason: '2020-02-25: Please use account',
      },
    };
  },
});

export { Comment };
