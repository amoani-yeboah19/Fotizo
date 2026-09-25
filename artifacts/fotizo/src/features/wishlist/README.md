# features/wishlist/

Saved products per signed-in account, stored server-side (`/api/wishlist`,
migration 0006). `useWishlistToggle` powers the heart buttons on product cards
and the product page; `useWishlist` feeds the buyer dashboard. Signed-out
visitors are asked to sign in and returned to the same page.
