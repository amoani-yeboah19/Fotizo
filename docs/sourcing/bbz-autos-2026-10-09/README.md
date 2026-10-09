# BBZ Autos source capture — 9 October 2026

Source: https://www.bbzcar.com/

`source-listings.json` contains 82 distinct offers visible in the downloaded
homepage catalogue. This is homepage coverage, not a claim of exhaustive stock
or pagination coverage. Detail capture records public specification tables and
gallery URLs; failed requests are recorded explicitly. The final detail pass
captured 81 specification tables; one request failed. Gallery URLs were found
for 81 offers.

These are private sourcing drafts, not published Fotizo vehicles. Supplier links
must remain outside customer-facing records. No database writes or enquiries
were submitted. Image URLs are captured, but image files have not yet been
verified or ingested into Fotizo storage.

Supplier USD prices are preserved as displayed. Fotizo selling prices, freight,
duty and lead times are unknown. Vehicle markup awaits the owner's answer; do
not treat supplier price as the existing Autos `landedPrice`, which includes
freight. Do not invent specifications to satisfy required frontend fields.

Preserve both the catalogue summary and detail specifications. For example, the
Denza N9 card says 16,000 km while its detail table says 15,000; these require
supplier clarification before publication. Availability needs confirmation.
Available-stock quantities are deliberately excluded from this export.

Next: confirm vehicle pricing policy, review conflicting specifications, ingest
photos, adapt Autos to explicit unknown values and supplier-price estimates,
and connect reviewed records to Fotizo's vehicle enquiry flow.
