
-- Create candidates table
CREATE TABLE public.candidates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_name TEXT NOT NULL,
  position TEXT NOT NULL DEFAULT '',
  region TEXT NOT NULL DEFAULT '',
  site TEXT NOT NULL DEFAULT '',
  hiring_manager TEXT NOT NULL DEFAULT '',
  requisition_id TEXT NOT NULL DEFAULT '',
  offer_packet_sent BOOLEAN NOT NULL DEFAULT false,
  offer_packet_returned BOOLEAN NOT NULL DEFAULT false,
  ids_received BOOLEAN NOT NULL DEFAULT false,
  background_check_sent BOOLEAN NOT NULL DEFAULT false,
  background_check_complete BOOLEAN NOT NULL DEFAULT false,
  mandated_reporter_complete BOOLEAN NOT NULL DEFAULT false,
  clearance_type TEXT NOT NULL DEFAULT '',
  dc_suitability_needed BOOLEAN NOT NULL DEFAULT false,
  dc_suitability_complete BOOLEAN NOT NULL DEFAULT false,
  adp_registration_sent BOOLEAN NOT NULL DEFAULT false,
  adp_registration_complete BOOLEAN NOT NULL DEFAULT false,
  nvo_date DATE,
  nvo_complete BOOLEAN NOT NULL DEFAULT false,
  first_day_confirmed DATE,
  blocker_notes TEXT NOT NULL DEFAULT '',
  current_phase INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create candidate_documents table
CREATE TABLE public.candidate_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL DEFAULT 'other',
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_documents ENABLE ROW LEVEL SECURITY;

-- Allow all operations (internal HR tool, no auth required)
CREATE POLICY "Allow all access to candidates" ON public.candidates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to candidate_documents" ON public.candidate_documents FOR ALL USING (true) WITH CHECK (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_candidates_updated_at
  BEFORE UPDATE ON public.candidates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for candidate documents
INSERT INTO storage.buckets (id, name, public) VALUES ('candidate-documents', 'candidate-documents', true);

CREATE POLICY "Allow public read of candidate documents" ON storage.objects FOR SELECT USING (bucket_id = 'candidate-documents');
CREATE POLICY "Allow public upload of candidate documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'candidate-documents');
CREATE POLICY "Allow public update of candidate documents" ON storage.objects FOR UPDATE USING (bucket_id = 'candidate-documents');
CREATE POLICY "Allow public delete of candidate documents" ON storage.objects FOR DELETE USING (bucket_id = 'candidate-documents');
