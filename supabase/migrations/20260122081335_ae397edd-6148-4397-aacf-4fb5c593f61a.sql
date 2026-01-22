-- Step 1: Consolidate contacts to the oldest (main) company for each duplicate website
WITH ranked_companies AS (
  SELECT 
    id,
    website,
    tenant_id,
    ROW_NUMBER() OVER (PARTITION BY website, tenant_id ORDER BY created_at ASC, id ASC) as rn
  FROM companies
  WHERE website IS NOT NULL
),
main_companies AS (
  SELECT id as main_company_id, website, tenant_id
  FROM ranked_companies
  WHERE rn = 1
),
duplicates_to_merge AS (
  SELECT rc.id as duplicate_id, mc.main_company_id
  FROM ranked_companies rc
  JOIN main_companies mc ON rc.website = mc.website AND rc.tenant_id = mc.tenant_id
  WHERE rc.rn > 1
)
UPDATE contacts 
SET company_id = dtm.main_company_id
FROM duplicates_to_merge dtm
WHERE contacts.company_id = dtm.duplicate_id;

-- Step 2: Delete duplicate companies (keeping the oldest one per website based on created_at)
WITH ranked_companies AS (
  SELECT 
    id,
    website,
    tenant_id,
    ROW_NUMBER() OVER (PARTITION BY website, tenant_id ORDER BY created_at ASC, id ASC) as rn
  FROM companies
  WHERE website IS NOT NULL
)
DELETE FROM companies
WHERE id IN (
  SELECT id FROM ranked_companies WHERE rn > 1
)
AND NOT EXISTS (
  SELECT 1 FROM contacts ct WHERE ct.company_id = companies.id
);

-- Step 3: Add unique constraint to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS companies_website_tenant_unique 
ON companies(tenant_id, website) 
WHERE website IS NOT NULL;