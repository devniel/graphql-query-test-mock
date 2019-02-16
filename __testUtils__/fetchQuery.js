// @flow
type Operation = {
  text: string
};

export const GRAPHQL_API_URL = 'http://localhost/graphql';

export type FetchQueryConfig = {
  query: string,
  variables?: { [key: string]: mixed }
};

export function fetchQuery(
  operation: Operation,
  variables?: { [key: string]: mixed }
): Promise<*> {
  return new Promise(async function(resolve, reject) {
    const config: FetchQueryConfig = {
      query: operation.text,
      variables
    };

    const response = await fetch(GRAPHQL_API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify(config)
    });

    const json = await response.json();

    console.log('JSON:', json);

    if (json.errors) return reject(json.errors);
    return resolve(json);
  });
}
