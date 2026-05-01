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
  query GetProducts($after: String) {
    products(first: 100, after: $after) {
      pageInfo { endCursor hasNextPage }
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

/**
 * Fetch every product across pages (WPGraphQL caps `first` at 100, so we paginate).
 * Hard cap of 10 pages = 1000 products to avoid runaways.
 */
export async function fetchAllProducts(): Promise<{ nodes: unknown[] }> {
  const all: unknown[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < 10; page++) {
    const data = await fetchGraphQL(GET_PRODUCTS_QUERY, { after: cursor });
    const products = data?.products;
    if (!products) break;
    if (Array.isArray(products.nodes)) all.push(...products.nodes);
    if (!products.pageInfo?.hasNextPage) break;
    cursor = products.pageInfo.endCursor;
    if (!cursor) break;
  }
  return { nodes: all };
}
