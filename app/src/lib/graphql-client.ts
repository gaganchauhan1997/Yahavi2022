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

  const r = await fetch(WP_GRAPHQL_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(15_000),
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
 * Fetch a single product by slug — fast path for ProductPage so it doesn't
 * have to wait for the full catalog to paginate before it can render.
 */
export const GET_PRODUCT_BY_SLUG_QUERY = `
  query GetProductBySlug($slug: ID!) {
    product(id: $slug, idType: SLUG) {
      id
      databaseId
      name
      slug
      description
      shortDescription
      date
      ... on SimpleProduct {
        price
        regularPrice
      }
      productCategories {
        nodes { id databaseId name slug }
      }
      image { sourceUrl altText }
    }
  }
`;

/**
 * Fetch every product across pages (WPGraphQL caps `first` at 100, so we paginate).
 * Hard cap of 20 pages = 2000 products to avoid runaways.
 */
let catalogueCache: { data: { nodes: unknown[] }; expires: number } | null = null;
let catalogueInflight: Promise<{ nodes: unknown[] }> | null = null;

export async function fetchAllProducts(): Promise<{ nodes: unknown[] }> {
  if (catalogueCache && Date.now() < catalogueCache.expires) return catalogueCache.data;
  if (catalogueInflight) return catalogueInflight;
  catalogueInflight = fetchCataloguePages().then(data => {
    catalogueCache = { data, expires: Date.now() + 60_000 };
    return data;
  }).finally(() => { catalogueInflight = null; });
  return catalogueInflight;
}

async function fetchCataloguePages(): Promise<{ nodes: unknown[] }> {
  const all: unknown[] = [];
  let cursor: string | null = null;
  const cursors = new Set<string>();
  for (let page = 0; page < 20; page++) {
    const data = await fetchGraphQL(GET_PRODUCTS_QUERY, { after: cursor });
    const products = data?.products;
    if (!products || !Array.isArray(products.nodes)) throw new Error("Invalid catalogue response");
    if (Array.isArray(products.nodes)) all.push(...products.nodes);
    if (!products.pageInfo?.hasNextPage) return { nodes: all };
    cursor = products.pageInfo.endCursor;
    if (!cursor || cursors.has(cursor)) throw new Error("Invalid catalogue pagination cursor");
    cursors.add(cursor);
  }
  throw new Error("Catalogue exceeds supported pagination limit; refusing partial results");
}
