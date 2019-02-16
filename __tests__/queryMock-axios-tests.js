// @flow
import { axiosQuery, GRAPHQL_API_URL } from '../__testUtils__/axiosQuery';
import { queryMock } from '../__testUtils__/queryMock';
import axios from 'axios';

describe('queryMock with axios', () => {
  describe('Basic queries', () => {
    it('should be able to mock basic queries', async () => {
      const testData = {
        test: 'data'
      };

      queryMock.mockQuery({
        name: 'TestQuery',
        data: testData
      });

      const res = await axios.post(GRAPHQL_API_URL, {
        query: 'query TestQuery { id }'
      });

      expect(res.data.data).toEqual(testData);
      expect(queryMock._calls.length).toBe(1);
    });

    it('should throw if query mock is not found', async () => {
      expect.assertions(1);

      try {
        const res = await axiosQuery.post(GRAPHQL_API_URL, {
          query: 'query NoMockForThisOne { id }'
        });
      } catch (e) {
        expect(e).toBeDefined();
      }
    });
  });

  describe('Multiple queries', () => {
    it('should be able to mock the same query with different variables', async () => {
      const firstVariables = {
        first: true
      };

      const firstTestData = {
        first: 'data'
      };

      const secondVariables = {
        second: true
      };

      const secondTestData = {
        second: 'data'
      };

      queryMock.mockQuery({
        name: 'TestQuery',
        variables: firstVariables,
        data: firstTestData
      });

      queryMock.mockQuery({
        name: 'TestQuery',
        variables: secondVariables,
        data: secondTestData,
        persist: false
      });

      const firstRes = await axiosQuery.post(GRAPHQL_API_URL, {
        query: 'query TestQuery { id }',
        variables: firstVariables
      });

      const secondRes = await axiosQuery.post(GRAPHQL_API_URL, {
        query: 'query TestQuery { id }',
        variables: secondVariables
      });

      expect(firstRes.data.data).toEqual(firstTestData);
      expect(secondRes.data.data).toEqual(secondTestData);
    });

    it('should be able to mock queries in sequence with the same query id', async () => {
      const firstTestData = {
        first: 'data'
      };

      const secondTestData = {
        second: 'data'
      };

      queryMock.mockQuery({
        name: 'TestQuery',
        data: firstTestData,
        persist: false
      });

      queryMock.mockQuery({
        name: 'TestQuery',
        data: secondTestData,
        persist: false
      });

      const firstRes = await axiosQuery.post(GRAPHQL_API_URL, {
        query: 'query TestQuery { id }'
      });

      const secondRes = await axiosQuery.post(GRAPHQL_API_URL, {
        query: 'query TestQuery { id }'
      });

      expect(firstRes.data.data).toEqual(firstTestData);
      expect(secondRes.data.data).toEqual(secondTestData);
    });
  });

  describe('Custom handler', () => {
    it('should be able to use a custom handler to fully control return of fn', async () => {
      const mockCustomHandler = jest.fn((req, config) => [
        200,
        { data: { id: '123' } }
      ]);

      queryMock.mockQuery({
        name: 'TestQuery',
        data: {},
        customHandler: mockCustomHandler
      });

      const res = await axiosQuery.post(GRAPHQL_API_URL, {
        query: 'query TestQuery { id }'
      });

      expect(res.data.data).toEqual({ id: '123' });
      expect(queryMock._calls.length).toBe(1);

      expect(mockCustomHandler).toHaveBeenCalledTimes(1);
      expect(mockCustomHandler.mock.calls[0][1]).toEqual({
        operationName: 'TestQuery',
        query: 'query TestQuery { id }',
        variables: {}
      });
    });

    test('custom handler should support returning a promise', async () => {
      queryMock.mockQuery({
        name: 'TestQuery',
        data: {},
        customHandler: async (req, config) => [200, { data: { id: '123' } }]
      });

      const res = await axiosQuery.post(GRAPHQL_API_URL, {
        query: 'query TestQuery { id }'
      });

      expect(res.data.data).toEqual({ id: '123' });
      expect(queryMock._calls.length).toBe(1);
    });
  });

  describe('Setup', () => {
    describe('Resetting queries', () => {
      it('should resolve here as this is where the query mock is setup', async () => {
        const testData = {
          test: 'data'
        };

        queryMock.mockQuery({
          name: 'TestQuery',
          data: testData
        });

        const res = await axiosQuery.post(GRAPHQL_API_URL, {
          query: 'query TestQuery { id }'
        });

        expect(res.data.data).toEqual(testData);
        expect(queryMock._calls.length).toBe(1);
      });

      it('should throw here as old mocked query should be reset', async () => {
        expect.assertions(2);

        try {
          const res = await axiosQuery.post(GRAPHQL_API_URL, {
            name: 'TextQuery',
            query: 'query TestQuery { id }'
          });
        } catch (e) {
          expect(e).toBeDefined();
          expect(queryMock._calls.length).toBe(0);
        }
      });
    });
  });

  describe('Matching on variables', () => {
    let mockData;
    let mockVariables;

    beforeEach(() => {
      mockData = { some: 'data' };
      mockVariables = {
        includeStuff: true,
        withStuff: true,
        filterOn: [123, 345],
        after: 'cursor'
      };
    });

    describe('By object', () => {
      it('should make sure variables match provided variables object if provided', async () => {
        queryMock.mockQuery({
          name: 'TestQuery',
          variables: mockVariables,
          data: mockData
        });

        const res = await axiosQuery.post(GRAPHQL_API_URL, {
          query: 'query TestQuery { id }',
          variables: mockVariables
        });

        expect(res.data.data).toEqual(mockData);
      });

      it('should match on the variables object no matter the order of the object properties', async () => {
        queryMock.mockQuery({
          name: 'TestQuery',
          variables: {
            firstParam: [
              {
                firstNestedParam: 'firstNestedParam 1',
                secondNestedParam: 'secondNestedParam 1'
              },
              {
                firstNestedParam: 'firstNestedParam 2',
                secondNestedParam: 'secondNestedParam 2'
              }
            ],
            secondParam: 'secondParam'
          },
          data: mockData
        });

        const res = await axiosQuery.post(GRAPHQL_API_URL, {
          query: 'query TestQuery { id }',
          variables: {
            secondParam: 'secondParam',
            firstParam: [
              {
                secondNestedParam: 'secondNestedParam 1',
                firstNestedParam: 'firstNestedParam 1'
              },
              {
                secondNestedParam: 'secondNestedParam 2',
                firstNestedParam: 'firstNestedParam 2'
              }
            ]
          }
        });

        expect(res.data.data).toEqual(mockData);
      });

      it('should not match on the provided variables object if arrays are not ordered the same way', async () => {
        queryMock.mockQuery({
          name: 'TestQuery',
          variables: {
            param: [{ id: 1 }, { id: 2 }]
          },
          data: mockData
        });

        expect.assertions(1);

        try {
          const res = await axiosQuery.post(GRAPHQL_API_URL, {
            query: 'query TestQuery { id }',
            variables: {
              param: [{ id: 2 }, { id: 1 }]
            }
          });
        } catch (e) {
          expect(e).toBeDefined();
        }
      });

      it('should allow providing properties to ignore when matching', async () => {
        queryMock.mockQuery({
          name: 'TestQuery',
          variables: {
            someProp: true,
            someUnstableProp: 123
          },
          data: mockData,
          ignoreThesePropertiesInVariables: ['someUnstableProp']
        });

        const res = await axiosQuery.post(GRAPHQL_API_URL, {
          query: 'query TestQuery { id }',
          variables: {
            someProp: true,
            someUnstableProp: 234
          }
        });

        expect(res.data.data).toEqual(mockData);
      });

      it('should throw if variables does not match', async () => {
        queryMock.mockQuery({
          name: 'TestQuery',
          variables: mockVariables,
          data: mockData
        });

        expect.assertions(1);

        try {
          await axiosQuery.post(GRAPHQL_API_URL, {
            query: 'query TestQuery { id }'
          });
        } catch (e) {
          expect(e).toBeDefined();
        }
      });

      it('should allow turning off matching per mocked query', async () => {
        queryMock.mockQuery({
          name: 'TestQuery',
          variables: mockVariables,
          data: mockData,
          matchOnVariables: false
        });

        const res = await axiosQuery.post(GRAPHQL_API_URL, {
          query: 'query TestQuery { id }'
        });

        expect(res.data.data).toEqual(mockData);
      });

      test('empty object in mock should let sending no variables or empty object pass', async () => {
        queryMock.mockQuery({
          name: 'TestQuery',
          variables: {},
          data: mockData
        });

        expect(
          (await axiosQuery.post(GRAPHQL_API_URL, {
            query: 'query TestQuery { id }'
          })).data.data
        ).toEqual(mockData);

        expect(
          (await axiosQuery.post(GRAPHQL_API_URL, {
            query: 'query TestQuery { id }',
            variables: {}
          })).data.data
        ).toEqual(mockData);
      });
    });

    describe('By function', () => {
      it('should allow matching variables with custom function', async () => {
        queryMock.mockQuery({
          name: 'TestQuery',
          matchVariables: variables => variables.includeStuff === true,
          data: mockData
        });

        const res = await axiosQuery.post(GRAPHQL_API_URL, {
          query: 'query TestQuery { id }',
          variables: mockVariables
        });

        expect(res.data.data).toEqual(mockData);
      });
    });
  });

  describe('Controlling when response is resolved', () => {
    it('should be possible to control when response is resolved', async () => {
      const testData = {
        test: 'data'
      };

      const resolveQuery = queryMock.mockQueryWithControlledResolution({
        name: 'ControlledQuery',
        matchOnVariables: false,
        data: testData
      });

      let controlVariable = false;

      const returnPromise = axiosQuery
        .post(GRAPHQL_API_URL, {
          query: 'query ControlledQuery { id }'
        })
        .then(res => {
          controlVariable = true;
          return res.data;
        });

      // Make sure we wait. The then-fn above should not run until we've explicitly resolved the query by invoking
      // the resolve function above.
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(controlVariable).toBe(false);
      resolveQuery();

      await returnPromise;

      expect(controlVariable).toBe(true);
    });
  });

  describe('Changing the server response on the fly', () => {
    it('should be possible to change the server response arbitrarily by supplying a fn to query mock config', async () => {
      queryMock.mockQuery({
        name: 'AlteredQuery',
        data: {},
        changeServerResponse: (queryConfig, serverResponse) => ({
          ...serverResponse,
          someOtherPropOnResponse: true,
          data: {
            ...serverResponse.data,
            addedProp: true
          }
        })
      });

      const res = await axiosQuery.post(GRAPHQL_API_URL, {
        query: 'query AlteredQuery { id }'
      });

      expect(res.data).toEqual({
        someOtherPropOnResponse: true,
        data: {
          addedProp: true
        }
      });
    });
  });

  describe('Custom errors', () => {
    it('should return default error when status is 400 or above', async () => {
      const testData = {
        test: 'data'
      };

      queryMock.mockQuery({
        name: 'ErrorTestQuery',
        data: testData,
        status: 400
      });

      try {
        await axiosQuery.post(GRAPHQL_API_URL, {
          query: 'query ErrorTestQuery { id }'
        });
      } catch (e) {
        expect(e).toBeDefined();
        expect(e[0].message).toBe(
          'Request for operation "ErrorTestQuery" failed with status 400. This is intentional and set up in the mock.'
        );
      }
    });

    it('should return default error when status is 400 or above and error is defined', async () => {
      const testData = {
        test: 'data'
      };

      const errorData = {
        error: 'data'
      };

      queryMock.mockQuery({
        name: 'ErrorTestQuery',
        data: testData,
        error: errorData,
        status: 400
      });

      try {
        await axiosQuery.post(GRAPHQL_API_URL, {
          query: 'query ErrorTestQuery { id }'
        });
      } catch (e) {
        expect(e).toBeDefined();
        expect(e[0]).toEqual(errorData);
      }
    });
  });

  describe('Error messages', () => {
    it('should print what query we tried + what queries are mocked when the requested query has no mock setup', async () => {
      expect.assertions(1);

      queryMock.mockQuery({
        name: 'SomeOtherQuery',
        data: {}
      });

      try {
        await axiosQuery.post(GRAPHQL_API_URL, {
          query: 'query NoMockForThisOne { id }'
        });
      } catch (e) {
        expect(e[0].message).toMatchSnapshot();
      }
    });

    it('should print a diff of variables from request + in the mock when mock is to be matched on variables, but the variables do not actually match', async () => {
      expect.assertions(1);

      queryMock.mockQuery({
        name: 'SomeQuery',
        data: {},
        variables: {
          some: 'prop',
          name: true
        }
      });

      try {
        await axiosQuery.post(GRAPHQL_API_URL, {
          query: 'query SomeQuery { id }',
          variables: {
            some: 'prop',
            name: false
          }
        });
      } catch (e) {
        expect(e[0].message).toMatchSnapshot();
      }
    });

    it('should notify that a custom matching function is used when variables do not match due to that', async () => {
      expect.assertions(1);

      queryMock.mockQuery({
        name: 'SomeQuery',
        data: {},
        variables: {
          some: 'prop',
          name: true
        },
        matchVariables: () => false
      });

      try {
        await axiosQuery.post(GRAPHQL_API_URL, {
          query: 'query SomeQuery { id }',
          variables: {
            some: 'prop',
            name: true
          }
        });
      } catch (e) {
        expect(e[0].message).toBe(
          'Variables do not match for operation "SomeQuery" due to custom "matchOnVariables" function'
        );
      }
    });
  });
});
