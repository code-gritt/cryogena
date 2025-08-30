import graphene
import accounts.schema


class Query(accounts.schema.Query, graphene.ObjectType):
    # Extend if needed
    pass


class Mutation(accounts.schema.Mutation, graphene.ObjectType):
    # Extend if needed
    pass


schema = graphene.Schema(
    query=Query,
    mutation=Mutation,
)
