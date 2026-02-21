export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  business_name: string | null;
  industry: string | null;
  plan: "free" | "starter" | "pro";
  created_at: string;
  updated_at: string;
  business_description: string | null;
  business_services: string | null;
  business_phone: string | null;
  business_address: string | null;
  business_website: string | null;
  response_tone: "professional" | "friendly" | "casual" | null;
  auto_reply_enabled: boolean;
}

export interface Lead {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  message: string;
  source: string | null;
  urgency: "hot" | "warm" | "cold";
  category: string | null;
  ai_summary: string | null;
  ai_response_sent: string | null;
  status: "new" | "contacted" | "qualified" | "converted" | "lost";
  follow_up_count: number;
  next_follow_up_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  user_id: string;
  type: "auto_reply" | "follow_up" | "note" | "status_change" | "email_sent";
  description: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  steps: WorkflowStep[];
  is_premium: boolean;
  created_at: string;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: string;
  config: Record<string, unknown>;
}

export interface UserWorkflow {
  id: string;
  user_id: string;
  template_id: string | null;
  name: string;
  description: string | null;
  steps: WorkflowStep[];
  is_active: boolean;
  schedule: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowRun {
  id: string;
  workflow_id: string;
  user_id: string;
  status: "pending" | "running" | "completed" | "failed";
  started_at: string;
  completed_at: string | null;
  result: Record<string, unknown> | null;
  error: string | null;
}
