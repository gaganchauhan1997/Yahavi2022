import { getAuthToken } from "./auth-token";
import { WP_GRAPHQL_URL } from "./api-base";

/**
 * GraphQL client used for the read-only catalog (products, categories, etc.).
 * Auth is no longer done over GraphQL — see lib/auth.ts (REST).
 */
export async function fetchGraphQL(
  query: string,
  variables: Record<string, unknown> = {}
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const token = getAuthToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const r = await fetch(WP_GRAPHQL_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
  });
  if (!r.ok) throw new Error(`HTTP error! status: ${r.status}`);
  const json = await r.json();
  if (json.errors) {
    console.error("GraphQL errors:", json.errors);
    throw new Error(json.errors[0]?.message || "Failed to fetch API");
  }
  return json.data;
}

export const GET_PRODUCTS_QUERY = `
  query GetProducts {
    products(first: 100) {
      nodes {
        id
        databaseId
        name
        slug
        description
        shortDescription
        status
        date
        ... on SimpleProduct {
          price
          regularPrice
        }
        productCategories {
          nodes {
            id
            databaseId
            name
            slug
          }
        }
        image {
          sourceUrl
          altText
        }
      }
    }
  }
`;
