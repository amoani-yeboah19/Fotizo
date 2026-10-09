# Service editor, photo uploads and seller deletion

## Implemented

- Six-step service editor: Overview, Pricing, Description & FAQ, Requirements,
  Gallery, Preview & Publish. Mobile step labels scroll horizontally.
- One to three Basic/Standard/Premium tiers, custom names, fixed USD total,
  explicit delivery/contract duration, included revisions and feature checklist.
  Existing hourly bookings remain supported with a separate hourly rate.
- FAQ, buyer instructions and up to six gallery images persist in `services.details`.
  Existing services default to empty details; existing packages remain compatible.
- Buyer preview and published detail pages share the same package selector and
  gallery. Booking receives the selected package name and price.
- Save/restore draft is explicit and device-local, scoped to account and listing.
- Deleted products retain their row for order history, but get `deleted_at` and
  disappear from seller/public reads. Moderation-unpublished products are not
  deleted. No retrospective deletion of existing unpublished rows is attempted.

## Backend rollout required before production frontend rollout

1. Apply `lib/db/migrations/0018_service_details_and_product_deletion.sql` using
   the normal database migration runner, then deploy this API version.
2. Deploy the frontend after the API. Earlier APIs don't persist service details
   and don't distinguish seller deletion from unpublishing. A frontend-only
   deployment cannot repair those database behaviours.
3. As a signed-in seller, check `GET /api/uploads/status`. Verify Supabase URL,
   service-role configuration, bucket access and migrations 0013/0014. Keep keys
   on the server. No production secrets or database settings were changed here.
4. Upload a phone JPEG, create a service with packages/gallery/FAQs, reload and
   verify the fields. Delete an owned test listing and reload My Products; it
   must disappear while any existing order record remains.

## Upload findings and limits

The screenshot's generic message does not identify the production failure.
The frontend previously silently ignored files whose picker omitted the MIME
value. It now attempts to decode those photos, limits input size, reports
unsupported formats distinctly, disables repeat uploads, keeps existing photos
on failure and blocks wizard navigation during uploads. Storage/network failures
now have separate messages. HEIC decoding depends on browser support; unsupported
HEIC must be exported as JPEG. No fabricated data URL is used as a successful
production upload, and no claim of repairing the live storage configuration is made.

The customer-facing gallery shows work samples; requirement text is visible to
buyers but this change does not add a structured post-purchase questionnaire.

## Validation

- 202 frontend tests passed.
- 53 upload/auth API integration tests and 16 admin integration tests passed.
- Library, API and frontend TypeScript checks passed.
- Browser check at 390px and 1440px: all six steps, package switching, image
  upload, buyer preview, saved draft restoration and complete submission
  payload, with mocked local API responses and no live listing mutation.
- Production storage and database migration have not been changed or verified
  against an authenticated production session.

## Dollar pricing

Service hourly rates and packages are entered and previewed in USD. The existing
API remains GBP-based: the editor converts using the currency service rate on
load/save. Existing GBP drafts are converted on restore; new drafts explicitly
record USD. Saving prices is blocked when rates are unavailable. Buyer-facing
prices still follow their selected currency.
