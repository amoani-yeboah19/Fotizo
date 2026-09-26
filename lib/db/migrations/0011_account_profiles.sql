-- Additive migration: account profiles, onboarding completion and policy acceptance.

-- One profile per account. Private details (location, language, account type,
-- intended use) and the public professional profile live here; blank optional
-- fields are empty strings. Coded values are validated by the API contract.
CREATE TABLE IF NOT EXISTS account_profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1 CONSTRAINT account_profiles_version_positive CHECK (version > 0),
  country text NOT NULL CONSTRAINT account_profiles_country_length CHECK (char_length(country) BETWEEN 2 AND 80),
  city text NOT NULL DEFAULT '' CONSTRAINT account_profiles_city_length CHECK (char_length(city) <= 100),
  language text NOT NULL CONSTRAINT account_profiles_language_length CHECK (char_length(language) BETWEEN 2 AND 80),
  account_type text NOT NULL DEFAULT 'individual'
    CONSTRAINT account_profiles_account_type_valid CHECK (account_type IN ('individual', 'business')),
  company text NOT NULL DEFAULT '' CONSTRAINT account_profiles_company_length CHECK (char_length(company) <= 120),
  purpose text NOT NULL DEFAULT '' CONSTRAINT account_profiles_purpose_length CHECK (char_length(purpose) <= 40),
  headline text NOT NULL DEFAULT '' CONSTRAINT account_profiles_headline_length CHECK (char_length(headline) <= 80),
  about text NOT NULL DEFAULT '' CONSTRAINT account_profiles_about_length CHECK (char_length(about) <= 1200),
  skills text[] NOT NULL DEFAULT '{}' CONSTRAINT account_profiles_skills_count CHECK (cardinality(skills) <= 10),
  experience text NOT NULL DEFAULT '' CONSTRAINT account_profiles_experience_length CHECK (char_length(experience) <= 40),
  work_mode text NOT NULL DEFAULT '' CONSTRAINT account_profiles_work_mode_length CHECK (char_length(work_mode) <= 40),
  website text NOT NULL DEFAULT ''
    CONSTRAINT account_profiles_website_https CHECK (website = '' OR (website LIKE 'https://%' AND char_length(website) <= 300)),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Set when the account first saves a complete profile (at signup or later).
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

-- Server-recorded acceptance of each policy version; never deleted with edits.
CREATE TABLE IF NOT EXISTS policy_acceptances (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  policy text NOT NULL CONSTRAINT policy_acceptances_policy_valid CHECK (policy IN ('terms', 'privacy')),
  policy_version text NOT NULL CONSTRAINT policy_acceptances_version_length CHECK (char_length(policy_version) BETWEEN 1 AND 40),
  accepted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, policy, policy_version)
);
