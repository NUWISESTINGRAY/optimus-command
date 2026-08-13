-- Telegram Idea Pipeline
INSERT INTO public.atlas_workflow_steps (workflow_id, step_order, step_type, title, config_json) VALUES
('64ebe72c-207d-4103-b8ff-c165a3732138', 0, 'trigger', 'Idea Received', '{"source":"telegram_message"}'),
('64ebe72c-207d-4103-b8ff-c165a3732138', 1, 'ai_action', 'Structure the Idea', '{"mode":"Chief of Staff","prompt_template":"Take the raw idea in the input and turn it into an executive idea brief: a one-line title, the strategic rationale, risks, and 3-5 concrete next actions with owners. Be specific and concise. Use markdown."}'),
('64ebe72c-207d-4103-b8ff-c165a3732138', 2, 'action', 'Save Idea Brief', '{"action_type":"create_document","doc_title":"Idea Brief"}'),
('64ebe72c-207d-4103-b8ff-c165a3732138', 3, 'action', 'Create Follow-Up Task', '{"action_type":"create_task","task_title":"Action the captured idea","task_description":"Review the Idea Brief in the Knowledge Vault and execute the listed next actions.","priority":"medium"}'),
('64ebe72c-207d-4103-b8ff-c165a3732138', 4, 'action', 'Confirm on Telegram', '{"action_type":"send_telegram","message":"Idea captured. Brief saved to the Knowledge Vault and a follow-up task was created."}'),
('64ebe72c-207d-4103-b8ff-c165a3732138', 5, 'action', 'Notify in App', '{"action_type":"notify","notify_title":"Idea captured","notify_message":"A new idea brief was created from Telegram."}');

-- Message Triage Pipeline
INSERT INTO public.atlas_workflow_steps (workflow_id, step_order, step_type, title, config_json) VALUES
('5b6f86d1-0833-4371-8c18-be20233012e5', 0, 'trigger', 'Inbound Message', '{"source":"telegram_message"}'),
('5b6f86d1-0833-4371-8c18-be20233012e5', 1, 'ai_action', 'Triage & Draft Reply', '{"mode":"Executive Assistant","prompt_template":"Triage this inbound message. Return: (1) Priority (urgent/normal/low), (2) Category, (3) a 2-line summary, (4) a ready-to-send draft reply in the principal''s voice, (5) any action items. Use markdown."}'),
('5b6f86d1-0833-4371-8c18-be20233012e5', 2, 'action', 'Save Draft Reply', '{"action_type":"create_document","doc_title":"Triage & Draft Reply"}'),
('5b6f86d1-0833-4371-8c18-be20233012e5', 3, 'approval', 'Approve Reply', '{"title":"Approve drafted reply","summary":"The Executive Assistant drafted a reply to an inbound message. Approve to send.","risk_level":"medium"}'),
('5b6f86d1-0833-4371-8c18-be20233012e5', 4, 'action', 'Send Reply Confirmation', '{"action_type":"send_telegram","message":"Reply approved and dispatched."}'),
('5b6f86d1-0833-4371-8c18-be20233012e5', 5, 'action', 'Notify in App', '{"action_type":"notify","notify_title":"Message triaged","notify_message":"An inbound message was triaged and the reply was approved."}');

-- Research & Approval Flow
INSERT INTO public.atlas_workflow_steps (workflow_id, step_order, step_type, title, config_json) VALUES
('05ab936e-7079-48a1-8961-78f402ce5e71', 0, 'trigger', 'Research Requested', '{"source":"manual"}'),
('05ab936e-7079-48a1-8961-78f402ce5e71', 1, 'ai_action', 'Run Deep Research', '{"mode":"Research","prompt_template":"Conduct structured research on the requested topic. Return: executive summary, key findings with reasoning, competitive/market context, risks and unknowns, and a recommended course of action. Cite assumptions explicitly. Use markdown."}'),
('05ab936e-7079-48a1-8961-78f402ce5e71', 2, 'action', 'Save Research Report', '{"action_type":"create_document","doc_title":"Research Report"}'),
('05ab936e-7079-48a1-8961-78f402ce5e71', 3, 'approval', 'Approve Research Output', '{"title":"Approve research report","summary":"A research report is ready for review. Approve to publish it to the Knowledge Vault and act on the recommendation.","risk_level":"low"}'),
('05ab936e-7079-48a1-8961-78f402ce5e71', 4, 'action', 'Create Action Task', '{"action_type":"create_task","task_title":"Act on approved research recommendation","task_description":"Execute the recommended course of action from the approved research report.","priority":"high"}'),
('05ab936e-7079-48a1-8961-78f402ce5e71', 5, 'action', 'Notify in App', '{"action_type":"notify","notify_title":"Research complete","notify_message":"An approved research report is available in the Knowledge Vault."}');