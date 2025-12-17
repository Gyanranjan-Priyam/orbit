-- Drop existing table if it exists (cleanup)
DROP TABLE IF EXISTS public.task_comments CASCADE;

-- Create task_comments table
CREATE TABLE IF NOT EXISTS public.task_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for task_comments
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_user_id ON public.task_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_created_at ON public.task_comments(created_at);

-- Enable Row Level Security
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view comments on their tasks or tasks assigned to them
DROP POLICY IF EXISTS "Users can view comments on accessible tasks" ON public.task_comments;
CREATE POLICY "Users can view comments on accessible tasks" ON public.task_comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.tasks
            WHERE tasks.id = task_comments.task_id
            AND (tasks.user_id = auth.uid() OR tasks.assignee_id = auth.uid())
        )
    );

-- Create policy to allow users to insert comments on accessible tasks
DROP POLICY IF EXISTS "Users can insert comments on accessible tasks" ON public.task_comments;
CREATE POLICY "Users can insert comments on accessible tasks" ON public.task_comments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tasks
            WHERE tasks.id = task_comments.task_id
            AND (tasks.user_id = auth.uid() OR tasks.assignee_id = auth.uid())
        )
        AND auth.uid() = user_id
    );

-- Create policy to allow users to update their own comments
DROP POLICY IF EXISTS "Users can update their own comments" ON public.task_comments;
CREATE POLICY "Users can update their own comments" ON public.task_comments
    FOR UPDATE USING (auth.uid() = user_id);

-- Create policy to allow users to delete their own comments
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.task_comments;
CREATE POLICY "Users can delete their own comments" ON public.task_comments
    FOR DELETE USING (auth.uid() = user_id);

-- Create trigger to call the function on update for task_comments
DROP TRIGGER IF EXISTS on_task_comments_updated ON public.task_comments;
CREATE TRIGGER on_task_comments_updated
    BEFORE UPDATE ON public.task_comments
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Enable realtime for the task_comments table (only if not already added)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'task_comments'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.task_comments;
    END IF;
END $$;
