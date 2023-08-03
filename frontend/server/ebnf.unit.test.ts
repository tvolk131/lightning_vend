import {AipFilter} from './ebnf';

const expectValidFilterSyntax = (filter: string) => {
  expect(() => new AipFilter(filter)).not.toThrow();
  expect(new AipFilter(filter).toString()).toEqual(filter);
};

it('parses a simple filter', () => {
  expectValidFilterSyntax('');
  expectValidFilterSyntax('foo');
  expectValidFilterSyntax('foo != foo');
  expectValidFilterSyntax('foo = foo');
  expectValidFilterSyntax('foo > foo');
  expectValidFilterSyntax('foo < foo');
  expectValidFilterSyntax('foo >= foo');
  expectValidFilterSyntax('foo <= foo');
  expectValidFilterSyntax('foo OR foo');
  expectValidFilterSyntax('foo AND foo');
  expectValidFilterSyntax('foo OR foo');
  expectValidFilterSyntax('foo AND foo');
  expectValidFilterSyntax('foo OR foo AND foo');
  expectValidFilterSyntax('foo OR (NOT foo AND NOT foo)');
  expectValidFilterSyntax('foo AND NOT (foo AND foo.bar)');
  expectValidFilterSyntax('foo()');
  expectValidFilterSyntax('foo.bar(baz)');

  expect(() => new AipFilter('()')).toThrow();
});

it('creates correct mongo query', () => {
  // expect(new AipFilter('foo').getMongoFilter()).toEqual({foo: {$exists: true}});
  expect(new AipFilter('foo = bar').getMongoFilter()).toEqual({foo: {$eq: 'bar'}});
  expect(new AipFilter('foo != bar').getMongoFilter()).toEqual({foo: {$ne: 'bar'}});
  expect(new AipFilter('foo > bar').getMongoFilter()).toEqual({foo: {$gt: 'bar'}});
  expect(new AipFilter('foo < bar').getMongoFilter()).toEqual({foo: {$lt: 'bar'}});
  expect(new AipFilter('foo >= bar').getMongoFilter()).toEqual({foo: {$gte: 'bar'}});
  expect(new AipFilter('foo <= bar').getMongoFilter()).toEqual({foo: {$lte: 'bar'}});

  expect(new AipFilter('(foo = bar)').getMongoFilter()).toEqual({foo: {$eq: 'bar'}});
  expect(new AipFilter('foo=bar').getMongoFilter()).toEqual({foo: {$eq: 'bar'}});
  expect(new AipFilter('foo = bar AND foo = baz').getMongoFilter()).toEqual({$and: [{foo: {$eq: 'bar'}}, {foo: {$eq: 'baz'}}]});
  expect(new AipFilter('foo = bar OR foo = baz').getMongoFilter()).toEqual({$or: [{foo: {$eq: 'bar'}}, {foo: {$eq: 'baz'}}]});
  expect(new AipFilter('0 = bar').getMongoFilter()).toEqual({0: {$eq: 'bar'}});
  // expect(new AipFilter('state = PAYMENT_ACCEPTED').getMongoFilter()).toEqual({0: {$eq: 'bar'}});
  // expect(new AipFilter('foo OR foo').getMongoFilter()).toEqual({$or: [{foo: {$exists: true}}, {foo: {$exists: true}}]});
  // expect(new AipFilter('foo AND foo').getMongoFilter()).toEqual({$and: [{foo: {$exists: true}}, {foo: {$exists: true}}]});
  // expect(new AipFilter('foo OR foo AND foo').getMongoFilter()).toEqual({$or: [{foo: {$exists: true}}, {$and: [{foo: {$exists: true}}, {foo: {$exists: true}}]}]});
  // expect(new AipFilter('foo OR (NOT foo AND NOT foo)').getMongoFilter()).toEqual({$or: [{foo: {$exists: true}}, {$and: [{$not: {foo: {$exists: true}}}, {$not: {foo: {$exists: true}}}] } ]});
  // expect(new AipFilter('foo AND NOT (foo AND foo.bar)').getMongoFilter()).toEqual({$and: [{foo: {$exists: true}}, {$not: {$and: [{foo: {$exists: true}}, {'foo.bar': {$exists: true}}]}}]});
  expect(() => new AipFilter('foo').getMongoFilter()).toThrow('Filtering by member is not implemented yet.');
  expect(() => new AipFilter('foo()').getMongoFilter()).toThrow('Filtering by member is not implemented yet.');
  expect(() => new AipFilter('foo() = bar').getMongoFilter()).toThrow('Function-based filtering is not yet implemented.');
  // expect(new AipFilter('foo.bar(baz)').getMongoFilter()).toEqual({foo: {$exists: true}});
});

// console.log(aipProtoFilter.getAST('foo > foo OR (foo < foo)'));