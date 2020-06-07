import { GraphQLBoolean, GraphQLInputObjectType, GraphQLInt } from 'graphql';

export const TierUpdateInput = new GraphQLInputObjectType({
  name: 'TierUpdateInput',
  fields: () => ({
    legacyId: {
      type: GraphQLInt,
      description: 'The legacy id assigned to the Tier',
    },
    flexible: {
      type: GraphQLBoolean,
      description: "Boolen indicated whether a tier's amount is FLEXIBLE (true) or FIXED (false)",
    },
    minimumAmount: {
      type: GraphQLInt,
      description: 'The minimum amount in cents of the Tier',
    },
  }),
});
