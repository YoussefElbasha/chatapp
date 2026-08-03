-- Login now refuses accounts whose address has not been confirmed. Every row that
-- predates that rule was created when no confirmation step existed, so leaving them
-- at the column default would lock out the entire existing user base on deploy.
-- Accounts created after this migration start unverified as intended.
UPDATE "users" SET "email_verified" = true WHERE "email_verified" = false;
