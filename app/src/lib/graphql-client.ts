
const GRAPHQL_ENDPOINT = import.meta.env.VITE_WORDPRESS_URL || 'https://your-wordpress-site.com/graphql';

export async function fetchGraphQL(query: string, variables = {}) {
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  const json = await response.json();
  if (json.errors) {
    console.error(json.errors);
    throw new Error('Failed to fetch API');
  }
  return json.data;
}

export const GET_PRODUCTS_QUERY = `
  query GetProducts {
    products(first: 50) {
      nodes {
        id
        databaseId
        name
        slug
        description
        shortDescription
        status
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
