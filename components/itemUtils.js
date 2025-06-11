// Utility to build an item object for saving (single or bulk)
export function buildItem({
  productName,
  productType,
  species,
  certainty,
  tags,
  image,
  rating,
  notes,
  location,
  date = new Date().toLocaleDateString(),
  ...rest
}) {
  return {
    name: productName,
    type: productType,
    species,
    certainty,
    tags,
    image,
    rating,
    notes,
    location,
    date,
    ...rest
  };
} 