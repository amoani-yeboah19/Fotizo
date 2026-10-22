# Payaza payments

New orders use Payaza exclusively. Ghana delivery charges GHS; UK and US delivery charges USD. Order totals remain in GBP and are converted using the server rate, locked per payment attempt. The exact charge is displayed before the customer opens Payaza. Existing historical payment records remain intact. Outstanding historical online orders can open a new Payaza attempt; reconcile any outstanding payments from the retired providers before cutover to avoid charging twice.

## Configuration

Apply the database migrations through 0023_payaza.sql using the project's normal migration procedure. Configure these server variables (never commit real keys):

- PAYAZA_MODE=Test (switch to Live with matching live keys after sandbox validation)
- PAYAZA_PUBLIC_KEY: raw public key from Payaza
- PAYAZA_SECRET_KEY: raw secret key used to validate webhook signatures
- APP_URL: public storefront origin
- CORS_ORIGIN: allowed storefront origin

Enable GHS and USD collections in the merchant account. Configure the Payaza **collections** webhook for the matching environment as https://<api-host>/api/payments/webhooks/payaza. Payaza uses https://api.payaza.africa/live for both test and live; X-TenantID selects the environment. PAYAZA_API_URL is an optional test-server override.

The browser receives only the public key and server-priced checkout settings. It loads https://checkout-v2.payaza.africa/js/v1/bundle.js and opens Payaza's hosted modal. Its callbacks return to the order page; only the server-side merchant-reference query can mark an order paid. The raw webhook body is authenticated with HMAC-SHA512, Base64 encoded. Duplicate deliveries are safe; failed queries remain retryable.

## Sandbox acceptance

Run one Ghana checkout and one international checkout using Payaza's official test instruments. Confirm the displayed currency and amount, complete payment, and verify the order is paid. Repeat with a decline and closing the popup; these must remain unpaid. Deliver the same webhook twice and verify fees and fulfilment are not duplicated. Confirm the merchant query's amount_received matches the intended principal under your account's fee settings; any mismatch intentionally leaves the order unpaid for review. Test supplier-confirmed goods after accepting the final quote.

Automated tests use a local Payaza stand-in, not real settlement. Production readiness still requires the account-backed tests above and a reachable webhook.

## Official references

- https://docs.payaza.africa/api-reference/libraries/websdk
- https://docs.payaza.africa/api-reference/check-transaction-statusmerchant-reference/check-transaction-statusmerchant-reference
- https://docs.payaza.africa/guides/authentication
- https://docs.payaza.africa/guides/webhooks
