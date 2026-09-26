# features/wishlist/

Saved products per signed-in account, stored server-side (`/api/wishlist`,
migration 0006). `useWishlistToggle` powers the heart buttons on product cards
and the product page; `useWishlist` feeds the buyer dashboard. Signed-out
visitors are asked to sign in and returned to the same page.

The header heart links to `/wishlist`; its count, page and Shop hearts now share
that same server-backed query in live mode. Shop results keep their channel so saved
cards open `/shop/:id` instead of a Marketplace URL. Request errors remain visible
and optimistic saves roll back when refused.

Explicit mock-auth demos use WishlistProvider's per-account/guest browser store,
so sample identities never call authenticated wishlist endpoints. Demo favourites
are not automatically migrated to real accounts. The buyer dashboard and standalone
wishlist page use the same source for the current environment.
