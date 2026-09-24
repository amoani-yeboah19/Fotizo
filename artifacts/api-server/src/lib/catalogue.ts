import { z } from "zod";
import { and, asc, desc, eq, gt, gte, ilike, lte, or, sql } from "drizzle-orm";
import { productsTable as p, usersTable } from "@workspace/db";

import { ListCatalogueProductsQueryParams } from "@workspace/api-zod";
const shape = ListCatalogueProductsQueryParams.shape;
export const catalogueChannel = shape.channel;
// Strengthen generated coercion: "false" must stay false, query arrays must not
// turn into strings, and pagination must use integers. Keep contract bounds.
export const catalogueQuery = ListCatalogueProductsQueryParams.extend({
  page: shape.page.removeDefault().int().default(0),
  pageSize: shape.pageSize.removeDefault().int().default(24),
  q: z.string().trim().pipe(shape.q.unwrap()).default(""),
  category: z.string().trim().pipe(shape.category.unwrap()).optional(),
  inStock: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  discounted: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
})
  .strict()
  .refine(
    (v) =>
      v.minPrice === undefined ||
      v.maxPrice === undefined ||
      v.minPrice <= v.maxPrice,
    { message: "Invalid price range." },
  );

// Existing imported rows may use a department ID, display label, or specs.department.
const departmentLabels = [
  ["shoes-bags", "Shoes & Bags"],
  ["general", "General Merchandise"],
  ["wigs", "Wigs & Hair"],
  ["jackets", "Winter Jackets"],
  ["pets", "Pet Supplies"],
  ["mens", "Men's Clothing"],
  ["sports", "Sports Furniture"],
  ["gymwear", "Gym Wear"],
  ["beauty", "Beauty"],
  ["womens", "Women's Clothing"],
  ["accessories", "Accessories"],
  ["phones", "Phones"],
  ["appliances", "Home Appliances"],
  ["textiles", "Home Textiles"],
  ["global", "Global"],
  ["entertainment", "Entertainment"],
  ["underwear", "Underwear"],
  ["baby", "Mum & Baby"],
  ["improvement", "Home Improvement"],
  ["computers", "Computers"],
  ["car", "Car Accessories"],
] as const;
const rawCategory = sql<string>`coalesce(nullif(${p.specs}->>'department', ''), ${p.category})`;
export const categoryKey = sql<string>`case when ${p.channel} = 'shop' then case ${sql.join(
  departmentLabels.map(
    ([id, label]) =>
      sql`when lower(${rawCategory}) = lower(${label}) then ${id}`,
  ),
  sql` `,
)} else ${rawCategory} end else ${p.category} end`;
// Imported shop listings carry their supplier sales count in specs.unitsSold.
export const unitsSold = sql<number>`case when coalesce(${p.specs}->>'unitsSold', '') ~ '^[0-9]+$' then (${p.specs}->>'unitsSold')::bigint else 0 end`;
export const discount = sql<number>`case when ${p.originalPrice} > ${p.price} and ${p.originalPrice} > 0 then (${p.originalPrice} - ${p.price}) / ${p.originalPrice} else 0 end`;
export function catalogueWhere(filter: z.infer<typeof catalogueQuery>) {
  const search = `%${filter.q.replace(/[\\%_]/g, "\\$&")}%`;
  return and(
    eq(p.status, "active"),
    eq(p.channel, filter.channel),
    filter.category ? eq(categoryKey, filter.category) : undefined,
    filter.q
      ? or(
          ilike(p.title, search),
          ilike(usersTable.name, search),
          ilike(p.category, search),
        )
      : undefined,
    filter.minPrice !== undefined ? gte(p.price, filter.minPrice) : undefined,
    filter.maxPrice !== undefined ? lte(p.price, filter.maxPrice) : undefined,
    filter.minRating !== undefined
      ? gte(p.rating, filter.minRating)
      : undefined,
    filter.inStock ? gt(p.stockCount, 0) : undefined,
    filter.discounted ? gt(discount, 0) : undefined,
  );
}
export function catalogueOrder(sort: z.infer<typeof catalogueQuery>["sort"]) {
  const primary =
    sort === "price-asc"
      ? asc(p.price)
      : sort === "price-desc"
        ? desc(p.price)
        : sort === "rating"
          ? desc(p.rating)
          : sort === "discount"
            ? desc(discount)
            : sort === "best-selling"
              ? desc(unitsSold)
              : desc(p.createdAt);
  return [primary, desc(p.createdAt), desc(p.id)];
}
