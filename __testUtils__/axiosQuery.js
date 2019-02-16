// @flow
import axios from 'axios';

type Operation = {
  text: string
};

export const GRAPHQL_API_URL = 'http://localhost/graphql';

export const axiosQuery = axios.create({
  adapter: require('axios/lib/adapters/http')
});

axiosQuery.interceptors.response.use(
  response => {
    if (response.data && response.data.errors)
      return Promise.reject(response.data.errors);
    return Promise.resolve(response);
  },
  error => {
    if (error.response && error.response.data)
      return Promise.reject(error.response.data.errors);

    if (error.response) return Promise.reject(error.response.data);

    return Promise.reject({
      message: 'Unexpected error.'
    });
  }
);
