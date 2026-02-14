export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  business_name: string | null;
  industry: string | null;
  plan: "free" | "starter" | "pro";
  created_at: string;
  updated_at: string;
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
