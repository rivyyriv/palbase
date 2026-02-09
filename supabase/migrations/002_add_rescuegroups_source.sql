-- Add 'rescuegroups' to the scrape_source enum
ALTER TYPE scrape_source ADD VALUE IF NOT EXISTS 'rescuegroups';
