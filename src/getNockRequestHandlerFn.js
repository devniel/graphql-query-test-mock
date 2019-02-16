// @flow strict
import deepEqual from 'deep-equal';
import { getOperationNameFromQuery } from './getOperationNameFromQuery';
import {
  printNoMockFoundError,
  printVariablesDoesNotMatchError
} from './handleErrors';
import { QueryMock } from './index';
import type { ChangeServerResponseFn } from './index';
import type {
  NockReturnValue,
  ServerResponse,
  ServerErrorResponse
} from './types';
import { getVariables } from './utils';

type NockHandleFn = (
  uri: string,
  data: mixed,
  cb: (null, NockReturnValue) => void
) => void;

export function getNockRequestHandlerFn(queryMock: QueryMock): NockHandleFn {
  return function handleNockRequest(
    uri: string,
    data: mixed,
    cb: (null, NockReturnValue) => void
  ) {
    try {
      let parsedData = data;

      if (typeof parsedData === 'string') {
        try {
          // In case of multipart form data, the proper data is located the
          // multipart annotation, so first extract it.
          const rg: RegExp = /({.*})/gi;
          const matches: RegExp$matchResult | null = parsedData.match(rg);
          if (!matches) throw new Error();
          parsedData = JSON.parse(matches[0]);
        } catch (e) {
          throw new Error(
            "Invalid data in request. Please make sure you're actually sending the query in your fetch."
          );
        }
      }

      if (parsedData && typeof parsedData === 'object') {
        const query = String(parsedData.query);
        const operationName = getOperationNameFromQuery(query);

        if (operationName) {
          const variables =
            parsedData.variables !== null &&
            typeof parsedData.variables === 'object'
              ? parsedData.variables
              : {};

          const mockedQueryRecord = queryMock._getQueryMock(
            operationName,
            variables
          );

          if (mockedQueryRecord) {
            const { queryMockConfig, resolveQueryPromise } = mockedQueryRecord;
            const { status } = queryMockConfig;

            if (status && status >= 400) {
              // Bail early if status is a failure
              throw queryMockConfig.error ||
                new Error(
                  `Request for operation "${operationName ||
                    'unknown'}" failed with status ${status}. This is intentional and set up in the mock.`
                );
            }

            const hasVariablesOrMatchFn = !!(
              queryMockConfig.variables || queryMockConfig.matchVariables
            );

            const shouldMatchOnVariables =
              queryMockConfig.matchOnVariables && hasVariablesOrMatchFn;

            if (
              !shouldMatchOnVariables || // Bypass if we should not match on variables
              (queryMockConfig.matchVariables
                ? queryMockConfig.matchVariables(variables)
                : deepEqual(
                    getVariables(
                      variables,
                      queryMockConfig.ignoreThesePropertiesInVariables || []
                    ),
                    getVariables(
                      queryMockConfig.variables,
                      queryMockConfig.ignoreThesePropertiesInVariables || []
                    )
                  ))
            ) {
              /**
               * We turn our request handler function into an async one at this point and not earlier,
               * because this is the first time we're absolutely sure we will resolve the query and that
               * we won't need to throw an error. Throwing inside the async function will make the Promise swallow
               * the error, which we do not want.
               */
              (async () => {
                const serverResponseData: ServerResponse = {
                  data: queryMockConfig.data
                };

                /**
                 * This is a default function that just returns itself (ie does not change the server response)
                 * unless provided a custom function.
                 **/
                const changeServerResponseFn: ChangeServerResponseFn =
                  queryMockConfig.changeServerResponse ||
                  queryMock._changeServerResponseFn;

                const serverResponse = changeServerResponseFn(
                  queryMockConfig,
                  serverResponseData
                );

                let nockReturnVal: NockReturnValue = [
                  queryMockConfig.status || 200,
                  serverResponse
                ];

                const { customHandler } = queryMockConfig;

                if (customHandler) {
                  const returnValue = customHandler(this.req, {
                    query,
                    operationName,
                    variables
                  });

                  nockReturnVal =
                    returnValue instanceof Promise
                      ? await returnValue
                      : returnValue;
                }

                // Make sure we add the call to our list
                queryMock._addCall({
                  id: operationName,
                  variables,
                  headers: this.req.headers,
                  response: nockReturnVal[1]
                });

                // Wait for resolution control promise to resolve if it exists
                if (resolveQueryPromise) {
                  await resolveQueryPromise;
                }

                cb(null, nockReturnVal);
              })();
            } else {
              // More useful errors
              printVariablesDoesNotMatchError(
                queryMockConfig,
                shouldMatchOnVariables,
                operationName,
                variables
              );
            }
          } else {
            printNoMockFoundError(queryMock, operationName, variables);
          }
        } else {
          throw new Error(
            "Could not find operation name in request. Please make sure you're actually sending the query in your fetch."
          );
        }
      } else {
        // If parsedData can't be processed then return error to avoid timeouts for the invoker.
        throw new Error(
          "Invalid data in request. Please make sure you're actually sending the query in your fetch."
        );
      }
    } catch (e) {
      //this.req.emit('error', new Error(e.message));

      // Returns errors just like graphql (https://graphql.org/learn/serving-over-http/#response)
      // and don't throw it because some clients can't catch it (eg. axios)

      const serverResponse: ServerErrorResponse = {
        errors: [JSON.parse(JSON.stringify(e, Object.getOwnPropertyNames(e)))]
      };

      const nockReturnVal: NockReturnValue = [500, serverResponse];

      return cb(null, nockReturnVal);
    }
  };
}
