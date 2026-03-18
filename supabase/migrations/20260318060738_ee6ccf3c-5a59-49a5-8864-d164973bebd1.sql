
-- Seed demo data for new users via the profile trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, display_name, full_name, job_title, company)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), COALESCE(NEW.raw_user_meta_data->>'full_name', 'Executive User'), 'Chief Executive Officer', 'OPTIMUS Corp');

  -- Seed sample projects
  INSERT INTO public.projects (user_id, title, description, status, priority) VALUES
    (NEW.id, 'Project Aurora', 'Q2 product launch campaign and go-to-market strategy', 'active', 'high'),
    (NEW.id, 'Operation Quantum', 'Infrastructure modernization and cloud migration', 'active', 'critical'),
    (NEW.id, 'Initiative Nexus', 'Strategic partnership and channel development', 'active', 'medium');

  -- Seed sample tasks
  INSERT INTO public.tasks (user_id, title, description, status, priority, due_date) VALUES
    (NEW.id, 'Review Q1 financial report', 'Comprehensive analysis of Q1 revenue and expenses', 'todo', 'high', CURRENT_DATE),
    (NEW.id, 'Approve marketing campaign', 'Sign off on Project Aurora campaign creative', 'todo', 'high', CURRENT_DATE),
    (NEW.id, 'Finalize vendor contract terms', 'Review and approve AutoCorp renewal agreement', 'active', 'medium', CURRENT_DATE + 1),
    (NEW.id, 'Prepare board deck slides', 'Q2 strategy presentation for board meeting', 'todo', 'medium', CURRENT_DATE + 3),
    (NEW.id, 'Review hiring pipeline', 'Assess engineering and product team candidates', 'todo', 'low', CURRENT_DATE + 5);

  -- Seed ATLAS workflows
  INSERT INTO public.atlas_workflows (id, user_id, name, description, status, trigger_type, active) VALUES
    (gen_random_uuid(), NEW.id, 'Telegram Idea Pipeline', 'Capture ideas via Telegram → AI Summary → Create Tasks → Notify', 'active', 'telegram_message', true),
    (gen_random_uuid(), NEW.id, 'Daily Executive Brief', 'Generate AI-powered daily intelligence report', 'active', 'scheduled', true),
    (gen_random_uuid(), NEW.id, 'Research & Approval Flow', 'Research request → Agent analysis → Save output → Approval gate', 'draft', 'manual', false),
    (gen_random_uuid(), NEW.id, 'Message Triage Pipeline', 'Triage inbound → EA agent → Draft reply → Approval', 'active', 'telegram_message', true);

  -- Seed sample approvals
  INSERT INTO public.approvals (user_id, title, description, summary, risk_level, status, source_type) VALUES
    (NEW.id, 'Publish Q1 Marketing Campaign', 'Auto-generated campaign targeting 50K subscribers', 'Campaign creative and messaging ready for 50K subscriber blast. Budget: $12K.', 'medium', 'pending', 'atlas_workflow'),
    (NEW.id, 'Vendor Contract — AutoCorp Renewal', '3-year renewal at 12% increase', 'Legal flagged two clauses requiring executive review. Total value: $340K.', 'high', 'pending', 'atlas_workflow'),
    (NEW.id, 'Deploy Infrastructure Update', 'Routine security patch deployment', 'All tests passing. Zero downtime expected. Standard maintenance window.', 'low', 'pending', 'atlas_workflow');

  -- Seed sample documents
  INSERT INTO public.documents (user_id, title, content, doc_type, status, tags) VALUES
    (NEW.id, 'Q1 Revenue Analysis', 'Total revenue: $4.2M (+12% QoQ). SaaS recurring: $2.8M. Professional services: $890K.', 'report', 'final', ARRAY['finance', 'Q1', 'revenue']),
    (NEW.id, 'Project Aurora GTM Strategy', 'Go-to-market strategy for Q2 product launch targeting enterprise segment.', 'document', 'draft', ARRAY['marketing', 'strategy', 'aurora']),
    (NEW.id, 'Engineering Hiring SOP', 'Standard operating procedure for technical interview pipeline.', 'sop', 'final', ARRAY['hr', 'hiring', 'engineering']);

  -- Seed memory items
  INSERT INTO public.memory_items (user_id, title, content, category, tags, use_in_ai_context) VALUES
    (NEW.id, 'Company Mission', 'Build the most powerful AI operating system for executive teams.', 'brand', ARRAY['mission', 'brand'], true),
    (NEW.id, 'Tone of Voice', 'Professional, decisive, forward-thinking. Avoid jargon. Lead with action.', 'brand', ARRAY['voice', 'brand'], true),
    (NEW.id, 'Q2 OKRs', 'Revenue: $5M. New enterprise customers: 8. Churn below 3%.', 'strategy', ARRAY['okr', 'Q2', 'targets'], true);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
