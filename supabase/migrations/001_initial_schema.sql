-- ==============================================================================
-- CALL RECORDING MANAGEMENT PLATFORM - INITIAL DATABASE SCHEMA & POLICIES
-- Target: Supabase PostgreSQL
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create PROFILES Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Create CALL_SESSIONS Table
CREATE TABLE IF NOT EXISTS public.call_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL DEFAULT 'webrtc',
    external_call_id TEXT,
    call_status TEXT NOT NULL DEFAULT 'initiated' CHECK (call_status IN ('initiated', 'in_progress', 'completed', 'failed')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    ended_at TIMESTAMPTZ,
    recording_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Create RECORDING_CONSENTS Table
CREATE TABLE IF NOT EXISTS public.recording_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.call_sessions(id) ON DELETE CASCADE,
    participant_id TEXT NOT NULL,
    consent_status TEXT NOT NULL DEFAULT 'pending' CHECK (consent_status IN ('pending', 'granted', 'denied')),
    consent_timestamp TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Create RECORDINGS Table
CREATE TABLE IF NOT EXISTS public.recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_format TEXT NOT NULL DEFAULT 'webm',
    file_size BIGINT NOT NULL DEFAULT 0,
    duration NUMERIC NOT NULL DEFAULT 0, -- Duration in seconds
    recording_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    recording_status TEXT NOT NULL DEFAULT 'completed' CHECK (recording_status IN ('recording', 'uploading', 'completed', 'failed')),
    session_id UUID REFERENCES public.call_sessions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. Performance & Search Indexes
CREATE INDEX IF NOT EXISTS idx_recordings_user_id ON public.recordings(user_id);
CREATE INDEX IF NOT EXISTS idx_recordings_created_at ON public.recordings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recordings_session_id ON public.recordings(session_id);
CREATE INDEX IF NOT EXISTS idx_recordings_title ON public.recordings USING gin(to_tsvector('english', title));

CREATE INDEX IF NOT EXISTS idx_call_sessions_user_id ON public.call_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_external_call_id ON public.call_sessions(external_call_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_created_at ON public.call_sessions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_recording_consents_session_id ON public.recording_consents(session_id);

-- 7. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recording_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;

-- 8. Row Level Security Policies

-- Profiles Policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- Call Sessions Policies
DROP POLICY IF EXISTS "Users can view their own call sessions" ON public.call_sessions;
CREATE POLICY "Users can view their own call sessions"
    ON public.call_sessions FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own call sessions" ON public.call_sessions;
CREATE POLICY "Users can insert their own call sessions"
    ON public.call_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own call sessions" ON public.call_sessions;
CREATE POLICY "Users can update their own call sessions"
    ON public.call_sessions FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own call sessions" ON public.call_sessions;
CREATE POLICY "Users can delete their own call sessions"
    ON public.call_sessions FOR DELETE
    USING (auth.uid() = user_id);

-- Recording Consents Policies (Linked via Session Ownership)
DROP POLICY IF EXISTS "Users can view consents for their own sessions" ON public.recording_consents;
CREATE POLICY "Users can view consents for their own sessions"
    ON public.recording_consents FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.call_sessions
            WHERE public.call_sessions.id = public.recording_consents.session_id
            AND public.call_sessions.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert consents for their own sessions" ON public.recording_consents;
CREATE POLICY "Users can insert consents for their own sessions"
    ON public.recording_consents FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.call_sessions
            WHERE public.call_sessions.id = public.recording_consents.session_id
            AND public.call_sessions.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update consents for their own sessions" ON public.recording_consents;
CREATE POLICY "Users can update consents for their own sessions"
    ON public.recording_consents FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.call_sessions
            WHERE public.call_sessions.id = public.recording_consents.session_id
            AND public.call_sessions.user_id = auth.uid()
        )
    );

-- Recordings Policies
DROP POLICY IF EXISTS "Users can view their own recordings" ON public.recordings;
CREATE POLICY "Users can view their own recordings"
    ON public.recordings FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own recordings" ON public.recordings;
CREATE POLICY "Users can insert their own recordings"
    ON public.recordings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own recordings" ON public.recordings;
CREATE POLICY "Users can update their own recordings"
    ON public.recordings FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own recordings" ON public.recordings;
CREATE POLICY "Users can delete their own recordings"
    ON public.recordings FOR DELETE
    USING (auth.uid() = user_id);

-- 9. Trigger for New User Profile Auto-Creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, created_at)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        timezone('utc'::text, now())
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 10. Supabase Storage Bucket Initialization ('call-recordings')
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'call-recordings',
    'call-recordings',
    false,
    104857600, -- 100MB limit per recording file
    ARRAY['audio/webm', 'audio/wav', 'audio/mp4', 'audio/mpeg', 'audio/ogg']
)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for Private 'call-recordings' Bucket
DROP POLICY IF EXISTS "Users can upload their own recordings" ON storage.objects;
CREATE POLICY "Users can upload their own recordings"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'call-recordings'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Users can view/download their own recordings" ON storage.objects;
CREATE POLICY "Users can view/download their own recordings"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'call-recordings'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Users can delete their own recordings" ON storage.objects;
CREATE POLICY "Users can delete their own recordings"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'call-recordings'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );
