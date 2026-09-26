import { readFile } from "node:fs/promises";
import type { PGlite } from "@electric-sql/pglite";

// Builds the pre-migration schema the committed migrations expect, then applies
// every migration twice to prove each one is safe to rerun. Test-only.
async function migration(name: string): Promise<string> {
  return readFile(
    new URL(`../../../lib/db/migrations/${name}`, import.meta.url),
    "utf8",
  );
}

export async function createTestSchema(database: PGlite): Promise<void> {
  // The deployed schema predates the representative roles; migration 0005 adds them.
  await database.exec(`CREATE TYPE user_role AS ENUM ('buyer','seller','manager','developer');
    CREATE TABLE users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, email text NOT NULL UNIQUE,
    password_hash text, google_id text UNIQUE, role user_role NOT NULL DEFAULT 'buyer', avatar text,
    verified boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now());`);
  const sessions = await migration("0001_sessions.sql");
  await database.exec(sessions);
  await database.exec(sessions);
  await database.exec(`CREATE TYPE product_status AS ENUM ('active','unpublished');
    CREATE TABLE products (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL, description text NOT NULL,
    price numeric(10,2) NOT NULL, original_price numeric(10,2), rating real NOT NULL DEFAULT 0, review_count integer NOT NULL DEFAULT 0,
    seller_id uuid NOT NULL REFERENCES users(id), category text NOT NULL, images text[] NOT NULL DEFAULT '{}',
    stock_count integer NOT NULL DEFAULT 0, tags text[] NOT NULL DEFAULT '{}', specs jsonb NOT NULL DEFAULT '{}',
    status product_status NOT NULL DEFAULT 'active', created_at timestamptz NOT NULL DEFAULT now());
    CREATE TYPE order_status AS ENUM ('pending','processing','shipped','delivered','cancelled');
    CREATE TABLE orders (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), buyer_id uuid NOT NULL REFERENCES users(id),
    total numeric(10,2) NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE order_items (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES orders(id),
    product_id uuid NOT NULL REFERENCES products(id), product_title text NOT NULL, product_image text NOT NULL,
    seller_id uuid NOT NULL REFERENCES users(id), seller text NOT NULL, price numeric(10,2) NOT NULL, quantity integer NOT NULL,
    status order_status NOT NULL DEFAULT 'pending', tracking_number text);
    CREATE TYPE service_status AS ENUM ('active','unpublished');
    CREATE TYPE service_group AS ENUM ('freelancers','artisans','businesses');
    CREATE TABLE services (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL, description text NOT NULL,
    provider_id uuid NOT NULL REFERENCES users(id), avatar text NOT NULL, rating real NOT NULL DEFAULT 0,
    review_count integer NOT NULL DEFAULT 0, experience text NOT NULL, hourly_rate numeric(10,2) NOT NULL,
    category text NOT NULL, "group" service_group NOT NULL, availability text NOT NULL, packages jsonb NOT NULL DEFAULT '[]',
    skills text[] NOT NULL DEFAULT '{}', status service_status NOT NULL DEFAULT 'active',
    created_at timestamptz NOT NULL DEFAULT now());`);
  for (const name of [
    "0002_product_channels.sql",
    "0003_account_controls.sql",
    "0004_operations.sql",
    "0005_staff_roles.sql",
    "0006_wishlists.sql",
    "0007_order_checkout.sql",
    "0008_bookings.sql",
    "0009_carts.sql",
    "0010_online_payments.sql",
    "0011_account_profiles.sql",
  ]) {
    const sql = await migration(name);
    await database.exec(sql);
    await database.exec(sql);
  }
}
