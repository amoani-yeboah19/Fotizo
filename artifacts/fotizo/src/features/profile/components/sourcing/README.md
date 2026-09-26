# Representative dashboard workflows

## Connected operations

- China Shop Supply uses the authenticated seller-product list. Product search, department/status/low-stock filters, 20-row pagination, image fallbacks and CSV export operate on that returned list. The View dialog uses the ownership-protected product endpoint, including unpublished items. Edit opens the existing China product editor; save returns to Shop Supply and invalidates the catalogue queries.
- Auto Pipeline supports make/name/ID search, visibility filters, 20-row pagination, thumbnails and private details. Existing server-backed publish/unpublish and enquiry status/history actions are preserved. Catalogue specification editing still requires backend support; it is not simulated.
- USA sellers now have server-side search/pagination, current-page CSV export and read-only account details. Orders have pagination and explicit loading/error handling. Records are labelled as platform-wide because the current API does not filter by region. Approval actions are not exposed when no approval workflow exists.
- Staff queries explicitly explain their unavailability in demo sessions rather than displaying an endless loading state.

## Frontend sourcing drafts

Freight, supplier and reorder APIs do not exist in the current service layer. The new forms therefore create **browser drafts**, clearly labelled in lists, editors, details, confirmations and CSV filenames. They never book freight, submit purchase orders, approve suppliers, update inventory or change live transit statistics.

Drafts are stored at `fotizo_sourcing_drafts_v1:<userId>`, validated on read/write, and shared between panels through the account's query cache. Storage failures keep the editor open with the entered values. Other browser tabs invalidate the draft query on storage events. Drafts remain on the browser after logout; they do not sync to other devices or teammates. Exports quote CSV cells and neutralise formula prefixes. No credentials or payment information are requested.

## Backend handoff

1. Add authenticated supplier list/detail/create/update APIs: name, location, supply category, contact, review status, notes; enforce China-desk scope and role permissions, audit changes and use optimistic versions. Supplier approval should be a server-controlled transition, not a profile field trusted from the client.
2. Add consignment APIs: reference, mode, cargo scope, origin/destination, units, ETA and validated status transitions. Link line items to products/vehicles and suppliers. Track actual departure/arrival events and calculate live transit counts from these records.
3. Add purchase/reorder request APIs with product/supplier IDs, quantities, purchasing notes, submission/approval states and history. Sending a request and receiving stock must be separate audited operations; neither should happen when saving a draft.
4. Replace browser-draft storage with an API adapter and an explicit migration/import flow. Validate every field server-side; implement conflict handling and idempotent submission. Do not silently upload previously local contact details.
5. Add region/ownership scope to representative seller/order queries before presenting US-only metrics. Provide explicit seller-management and approval capabilities with server-side authorisation if those workflows are required.
6. Add vehicle specification/price/image update APIs if China representatives should edit the auto catalogue beyond its existing publication controls.
7. For large shop catalogues, provide server-side query/filter/pagination/export parameters; the current seller-product API returns the entire owned list. Search/export currently cover that returned list only.

Verification covers product filtering/pagination/details/edit destinations, supplier draft creation/editing, account isolation, failed storage, invalid quantities/dates and CSV escaping, alongside existing staff mutation tests. Hosted end-to-end verification requires a real staff session; the public dashboard URL could not be inspected by the browsing tool.
