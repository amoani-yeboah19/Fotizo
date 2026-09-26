# Wishlist

The header heart beside the cart links to `/wishlist` on desktop and mobile, for
signed-in users and guests. Hearts on Shop and Marketplace cards/detail pages toggle
saved products, with filled state and a header count. The buyer dashboard Wishlist
uses the same records rather than sample products. Saved cards link to their original
Shop or Marketplace page and can be removed directly.

This is frontend-only. `WishlistContext` stores product snapshots in localStorage,
keyed by user ID (or guest) and identified by source plus product ID. Signing in/out
switches lists; guest items are not automatically moved into an account. Reloads retain
the list, storage events synchronize tabs, malformed records are ignored, and unavailable
storage is reported on the wishlist page. Clearing browser data removes saved records.
Prices are saved snapshots; the product page provides current price/availability.

Backend handoff: account-based cross-device syncing needs authenticated list/add/remove
wishlist endpoints, ownership checks, source-aware IDs, current availability/price
resolution, and an explicit guest-to-account merge policy. No backend changes were made.
