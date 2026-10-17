# Photo-assisted listing details

Newly uploaded photos can draft listing details through Anthropic vision in:

- China dashboard → Autos → Add/Edit vehicle.
- Product creation/editing (including the China desk product editor).
- Offer/Edit service, using portfolio photos rather than the profile avatar.

Product and service uploads are now in the first step so sellers can start with a photo. New photo selections trigger analysis after uploading settles. Existing photos are not analysed merely by opening an editor; use **Suggest from photos** to request it. The first three photos are used. AI fills empty fields only, with suggestions available to review. Prices, delivery windows, and unsupported vehicle specifications stay manual. Saving and publishing still use the existing flows, with new vehicles unpublished by default.

## API configuration

Set `ANTHROPIC_API_KEY` on the API server. Optionally set `ANTHROPIC_VISION_MODEL`; the default is `claude-sonnet-4-5`. The existing Supabase photo storage configuration is also required for uploaded image URLs. Never put Anthropic credentials in frontend environment variables.

Deploy the API and frontend together. No database migration or SDK dependency change is needed. Without AI configuration, the forms remain usable manually and show a helpful error after an analysis attempt.

`POST /api/ai/photos` requires an authenticated account allowed to create the requested listing kind, accepts one to three caller-owned Fotizo uploads, and limits each user to 20 attempts per 15-minute window. Anthropic requests have a 45-second timeout and no automatic retries. JSON output is validated before reaching the form. Photo text is treated as untrusted evidence, not instructions.

The implementation follows Anthropic's image URL content-block format: https://platform.claude.com/docs/en/build-with-claude/vision

Tests mock Anthropic; they do not incur API charges. Live generation still requires deployment credentials and an enabled model in the Anthropic account.
