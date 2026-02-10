
-- Add business_card_image_url column to contacts
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS business_card_image_url TEXT;

-- Create storage bucket for business card images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('business-cards', 'business-cards', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access
CREATE POLICY "Business card images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'business-cards');

-- Authenticated users can upload
CREATE POLICY "Authenticated users can upload business card images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'business-cards' AND auth.role() = 'authenticated');

-- Authenticated users can update their uploads
CREATE POLICY "Authenticated users can update business card images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'business-cards' AND auth.role() = 'authenticated');

-- Authenticated users can delete their uploads
CREATE POLICY "Authenticated users can delete business card images"
ON storage.objects FOR DELETE
USING (bucket_id = 'business-cards' AND auth.role() = 'authenticated');
