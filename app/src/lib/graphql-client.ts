import { getAuthToken } from './auth-token';

// IMPORTANT: must be a relative path or a hackknow.com URL — never shop.hackknow.com
const GRAPHQL_ENDPOINT = import.meta.env.VITE_WORDPRESS_URL || '/graphql';

export async function fetchGraphQL(query: string, variables: Record<string, unknown> = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  const token = getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const json = await response.json();
  if (json.errors) throw new Error(json.errors[0]?.message || 'GraphQL error');
  return json.data;
}

export const GET_PRODUCTS_QUERY = `
  query GetProducts {
    products(first: 50) {
      nodes {
        id databaseId name slug description shortDescription status
        ... on SimpleProduct { price regularPrice }
        productCategories { nodes { id databaseId name slug } }
        image { sourceUrl altText }
      }
    }
  }`;
