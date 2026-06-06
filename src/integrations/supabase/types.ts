export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      agent_panels: {
        Row: {
          codenames: string[]
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          codenames?: string[]
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          codenames?: string[]
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      agent_runs: {
        Row: {
          agent_mode: string | null
          agent_type: string
          completed_at: string | null
          confidence: number | null
          error_message: string | null
          id: string
          input: Json | null
          input_json: Json | null
          output: Json | null
          output_json: Json | null
          session_id: string | null
          started_at: string
          status: string
          task_id: string | null
          task_type: string | null
          user_id: string
        }
        Insert: {
          agent_mode?: string | null
          agent_type: string
          completed_at?: string | null
          confidence?: number | null
          error_message?: string | null
          id?: string
          input?: Json | null
          input_json?: Json | null
          output?: Json | null
          output_json?: Json | null
          session_id?: string | null
          started_at?: string
          status?: string
          task_id?: string | null
          task_type?: string | null
          user_id: string
        }
        Update: {
          agent_mode?: string | null
          agent_type?: string
          completed_at?: string | null
          confidence?: number | null
          error_message?: string | null
          id?: string
          input?: Json | null
          input_json?: Json | null
          output?: Json | null
          output_json?: Json | null
          session_id?: string | null
          started_at?: string
          status?: string
          task_id?: string | null
          task_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_runs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_runs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      approvals: {
        Row: {
          created_at: string
          decided_at: string | null
          description: string | null
          id: string
          payload_json: Json | null
          resolved_at: string | null
          risk_level: string | null
          source: string | null
          source_id: string | null
          source_type: string | null
          status: string
          summary: string | null
          title: string
          user_id: string
          workflow_run_id: string | null
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          description?: string | null
          id?: string
          payload_json?: Json | null
          resolved_at?: string | null
          risk_level?: string | null
          source?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          summary?: string | null
          title: string
          user_id: string
          workflow_run_id?: string | null
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          description?: string | null
          id?: string
          payload_json?: Json | null
          resolved_at?: string | null
          risk_level?: string | null
          source?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          summary?: string | null
          title?: string
          user_id?: string
          workflow_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approvals_workflow_run_id_fkey"
            columns: ["workflow_run_id"]
            isOneToOne: false
            referencedRelation: "workflow_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      atlas_workflow_runs: {
        Row: {
          completed_at: string | null
          current_step_index: number | null
          error_message: string | null
          id: string
          initiated_by: string | null
          input_json: Json | null
          output_json: Json | null
          source: string | null
          started_at: string
          status: string
          workflow_id: string
        }
        Insert: {
          completed_at?: string | null
          current_step_index?: number | null
          error_message?: string | null
          id?: string
          initiated_by?: string | null
          input_json?: Json | null
          output_json?: Json | null
          source?: string | null
          started_at?: string
          status?: string
          workflow_id: string
        }
        Update: {
          completed_at?: string | null
          current_step_index?: number | null
          error_message?: string | null
          id?: string
          initiated_by?: string | null
          input_json?: Json | null
          output_json?: Json | null
          source?: string | null
          started_at?: string
          status?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "atlas_workflow_runs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "atlas_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      atlas_workflow_steps: {
        Row: {
          config_json: Json | null
          created_at: string
          id: string
          step_order: number
          step_type: string
          title: string
          updated_at: string
          workflow_id: string
        }
        Insert: {
          config_json?: Json | null
          created_at?: string
          id?: string
          step_order?: number
          step_type: string
          title?: string
          updated_at?: string
          workflow_id: string
        }
        Update: {
          config_json?: Json | null
          created_at?: string
          id?: string
          step_order?: number
          step_type?: string
          title?: string
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "atlas_workflow_steps_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "atlas_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      atlas_workflows: {
        Row: {
          active: boolean | null
          created_at: string
          description: string | null
          id: string
          name: string
          status: string
          trigger_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          status?: string
          trigger_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          status?: string
          trigger_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      automation_edges: {
        Row: {
          created_at: string
          id: string
          source_handle: string | null
          source_node_key: string
          target_handle: string | null
          target_node_key: string
          workflow_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          source_handle?: string | null
          source_node_key: string
          target_handle?: string | null
          target_node_key: string
          workflow_id: string
        }
        Update: {
          created_at?: string
          id?: string
          source_handle?: string | null
          source_node_key?: string
          target_handle?: string | null
          target_node_key?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_edges_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "automation_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_node_runs: {
        Row: {
          completed_at: string | null
          error: string | null
          id: string
          input_json: Json
          node_key: string
          output_json: Json
          run_id: string
          started_at: string
          status: string
          workflow_id: string
        }
        Insert: {
          completed_at?: string | null
          error?: string | null
          id?: string
          input_json?: Json
          node_key: string
          output_json?: Json
          run_id: string
          started_at?: string
          status?: string
          workflow_id: string
        }
        Update: {
          completed_at?: string | null
          error?: string | null
          id?: string
          input_json?: Json
          node_key?: string
          output_json?: Json
          run_id?: string
          started_at?: string
          status?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_node_runs_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "automation_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_node_runs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "automation_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_nodes: {
        Row: {
          config_json: Json
          created_at: string
          id: string
          node_key: string
          position_x: number
          position_y: number
          type: string
          workflow_id: string
        }
        Insert: {
          config_json?: Json
          created_at?: string
          id?: string
          node_key: string
          position_x?: number
          position_y?: number
          type: string
          workflow_id: string
        }
        Update: {
          config_json?: Json
          created_at?: string
          id?: string
          node_key?: string
          position_x?: number
          position_y?: number
          type?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_nodes_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "automation_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_runs: {
        Row: {
          completed_at: string | null
          error: string | null
          id: string
          input_json: Json
          output_json: Json
          started_at: string
          status: string
          trigger_source: string
          workflow_id: string
        }
        Insert: {
          completed_at?: string | null
          error?: string | null
          id?: string
          input_json?: Json
          output_json?: Json
          started_at?: string
          status?: string
          trigger_source?: string
          workflow_id: string
        }
        Update: {
          completed_at?: string | null
          error?: string | null
          id?: string
          input_json?: Json
          output_json?: Json
          started_at?: string
          status?: string
          trigger_source?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_runs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "automation_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_workflows: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          last_run_at: string | null
          name: string
          schedule_cron: string | null
          telegram_filter: string | null
          trigger_type: string
          updated_at: string
          user_id: string
          webhook_token: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          last_run_at?: string | null
          name?: string
          schedule_cron?: string | null
          telegram_filter?: string | null
          trigger_type?: string
          updated_at?: string
          user_id: string
          webhook_token?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          last_run_at?: string | null
          name?: string
          schedule_cron?: string | null
          telegram_filter?: string | null
          trigger_type?: string
          updated_at?: string
          user_id?: string
          webhook_token?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          attachments_json: Json | null
          citations_json: Json | null
          content: string
          created_at: string
          id: string
          metadata: Json | null
          mode: string | null
          role: string
          session_id: string
        }
        Insert: {
          attachments_json?: Json | null
          citations_json?: Json | null
          content: string
          created_at?: string
          id?: string
          metadata?: Json | null
          mode?: string | null
          role: string
          session_id: string
        }
        Update: {
          attachments_json?: Json | null
          citations_json?: Json | null
          content?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          mode?: string | null
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string
          id: string
          mode: string | null
          status: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mode?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mode?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      document_chunks: {
        Row: {
          chunk_idx: number
          content: string
          created_at: string
          document_id: string
          embedding: string | null
          id: string
          user_id: string
        }
        Insert: {
          chunk_idx?: number
          content: string
          created_at?: string
          document_id: string
          embedding?: string | null
          id?: string
          user_id: string
        }
        Update: {
          chunk_idx?: number
          content?: string
          created_at?: string
          document_id?: string
          embedding?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          auto: boolean | null
          content: string | null
          created_at: string
          doc_type: string | null
          id: string
          project_id: string | null
          source: string | null
          source_url: string | null
          status: string | null
          summary: string | null
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto?: boolean | null
          content?: string | null
          created_at?: string
          doc_type?: string | null
          id?: string
          project_id?: string | null
          source?: string | null
          source_url?: string | null
          status?: string | null
          summary?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto?: boolean | null
          content?: string | null
          created_at?: string
          doc_type?: string | null
          id?: string
          project_id?: string | null
          source?: string | null
          source_url?: string | null
          status?: string | null
          summary?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      integrations: {
        Row: {
          config: Json | null
          config_json: Json | null
          created_at: string
          id: string
          provider: string | null
          service_name: string
          status: string | null
          user_id: string
        }
        Insert: {
          config?: Json | null
          config_json?: Json | null
          created_at?: string
          id?: string
          provider?: string | null
          service_name: string
          status?: string | null
          user_id: string
        }
        Update: {
          config?: Json | null
          config_json?: Json | null
          created_at?: string
          id?: string
          provider?: string | null
          service_name?: string
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      jwba_agent_outputs: {
        Row: {
          agent_codename: string
          created_at: string
          id: string
          payload: Json
          project_id: string | null
          source_block_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          agent_codename: string
          created_at?: string
          id?: string
          payload?: Json
          project_id?: string | null
          source_block_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          agent_codename?: string
          created_at?: string
          id?: string
          payload?: Json
          project_id?: string | null
          source_block_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jwba_agent_outputs_agent_codename_fkey"
            columns: ["agent_codename"]
            isOneToOne: false
            referencedRelation: "jwba_agents"
            referencedColumns: ["codename"]
          },
          {
            foreignKeyName: "jwba_agent_outputs_source_block_id_fkey"
            columns: ["source_block_id"]
            isOneToOne: false
            referencedRelation: "jwba_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      jwba_agent_positions: {
        Row: {
          agent_codename: string
          id: string
          pinned: boolean
          updated_at: string
          user_id: string
          x: number
          y: number
        }
        Insert: {
          agent_codename: string
          id?: string
          pinned?: boolean
          updated_at?: string
          user_id: string
          x?: number
          y?: number
        }
        Update: {
          agent_codename?: string
          id?: string
          pinned?: boolean
          updated_at?: string
          user_id?: string
          x?: number
          y?: number
        }
        Relationships: []
      }
      jwba_agent_state: {
        Row: {
          active_agent: string | null
          context_page_id: string | null
          id: string
          project_id: string | null
          telegram_chat_id: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active_agent?: string | null
          context_page_id?: string | null
          id?: string
          project_id?: string | null
          telegram_chat_id?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active_agent?: string | null
          context_page_id?: string | null
          id?: string
          project_id?: string | null
          telegram_chat_id?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jwba_agent_state_context_page_id_fkey"
            columns: ["context_page_id"]
            isOneToOne: false
            referencedRelation: "jwba_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      jwba_agents: {
        Row: {
          codename: string
          color: string
          created_at: string
          display_name: string
          sort_order: number
          spec: Json
          status: string
          telegram_command: string | null
          updated_at: string
        }
        Insert: {
          codename: string
          color?: string
          created_at?: string
          display_name: string
          sort_order?: number
          spec?: Json
          status?: string
          telegram_command?: string | null
          updated_at?: string
        }
        Update: {
          codename?: string
          color?: string
          created_at?: string
          display_name?: string
          sort_order?: number
          spec?: Json
          status?: string
          telegram_command?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      jwba_block_refs: {
        Row: {
          created_at: string
          id: string
          ref_type: string
          source_block_id: string
          target_block_id: string | null
          target_page_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ref_type: string
          source_block_id: string
          target_block_id?: string | null
          target_page_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ref_type?: string
          source_block_id?: string
          target_block_id?: string | null
          target_page_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jwba_block_refs_source_block_id_fkey"
            columns: ["source_block_id"]
            isOneToOne: false
            referencedRelation: "jwba_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jwba_block_refs_target_block_id_fkey"
            columns: ["target_block_id"]
            isOneToOne: false
            referencedRelation: "jwba_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jwba_block_refs_target_page_id_fkey"
            columns: ["target_page_id"]
            isOneToOne: false
            referencedRelation: "jwba_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      jwba_blocks: {
        Row: {
          agent_codename: string | null
          agent_output_id: string | null
          block_type: string
          content: string
          created_at: string
          created_by: string
          id: string
          page_id: string
          parent_id: string | null
          sort_order: number
          telegram_message_id: string | null
          updated_at: string
        }
        Insert: {
          agent_codename?: string | null
          agent_output_id?: string | null
          block_type?: string
          content?: string
          created_at?: string
          created_by: string
          id?: string
          page_id: string
          parent_id?: string | null
          sort_order?: number
          telegram_message_id?: string | null
          updated_at?: string
        }
        Update: {
          agent_codename?: string | null
          agent_output_id?: string | null
          block_type?: string
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          page_id?: string
          parent_id?: string | null
          sort_order?: number
          telegram_message_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jwba_blocks_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "jwba_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jwba_blocks_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "jwba_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      jwba_pages: {
        Row: {
          created_at: string
          daily_date: string | null
          id: string
          is_daily: boolean
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          daily_date?: string | null
          id?: string
          is_daily?: boolean
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          daily_date?: string | null
          id?: string
          is_daily?: boolean
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      jwba_room_members: {
        Row: {
          agent_codename: string | null
          id: string
          joined_at: string
          left_at: string | null
          role: string
          room_id: string
        }
        Insert: {
          agent_codename?: string | null
          id?: string
          joined_at?: string
          left_at?: string | null
          role?: string
          room_id: string
        }
        Update: {
          agent_codename?: string | null
          id?: string
          joined_at?: string
          left_at?: string | null
          role?: string
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jwba_room_members_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "jwba_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      jwba_room_messages: {
        Row: {
          agent_codename: string | null
          content: string
          created_at: string
          id: string
          room_id: string
          sender_kind: string
        }
        Insert: {
          agent_codename?: string | null
          content?: string
          created_at?: string
          id?: string
          room_id: string
          sender_kind: string
        }
        Update: {
          agent_codename?: string | null
          content?: string
          created_at?: string
          id?: string
          room_id?: string
          sender_kind?: string
        }
        Relationships: [
          {
            foreignKeyName: "jwba_room_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "jwba_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      jwba_rooms: {
        Row: {
          closed_at: string | null
          created_at: string
          id: string
          saved_block_id: string | null
          source_block_id: string | null
          status: string
          title: string
          user_id: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          id?: string
          saved_block_id?: string | null
          source_block_id?: string | null
          status?: string
          title?: string
          user_id: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          id?: string
          saved_block_id?: string | null
          source_block_id?: string | null
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      knowledge_topics: {
        Row: {
          active: boolean
          created_at: string
          frequency: string
          id: string
          label: string
          last_run_at: string | null
          query: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          frequency?: string
          id?: string
          label: string
          last_run_at?: string | null
          query: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          frequency?: string
          id?: string
          label?: string
          last_run_at?: string | null
          query?: string
          user_id?: string
        }
        Relationships: []
      }
      memory_items: {
        Row: {
          category: string | null
          content: string | null
          created_at: string
          id: string
          tags: string[] | null
          title: string
          updated_at: string
          use_in_ai_context: boolean | null
          user_id: string
        }
        Insert: {
          category?: string | null
          content?: string | null
          created_at?: string
          id?: string
          tags?: string[] | null
          title: string
          updated_at?: string
          use_in_ai_context?: boolean | null
          user_id: string
        }
        Update: {
          category?: string | null
          content?: string | null
          created_at?: string
          id?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          use_in_ai_context?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          channel: string | null
          created_at: string
          id: string
          link: string | null
          message: string | null
          payload_json: Json | null
          read: boolean | null
          status: string | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          body?: string | null
          channel?: string | null
          created_at?: string
          id?: string
          link?: string | null
          message?: string | null
          payload_json?: Json | null
          read?: boolean | null
          status?: string | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          body?: string | null
          channel?: string | null
          created_at?: string
          id?: string
          link?: string | null
          message?: string | null
          payload_json?: Json | null
          read?: boolean | null
          status?: string | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company: string | null
          created_at: string
          display_name: string | null
          full_name: string | null
          id: string
          job_title: string | null
          preferences_json: Json | null
          role: string | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          display_name?: string | null
          full_name?: string | null
          id?: string
          job_title?: string | null
          preferences_json?: Json | null
          role?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          display_name?: string | null
          full_name?: string | null
          id?: string
          job_title?: string | null
          preferences_json?: Json | null
          role?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          priority: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assignee: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          priority: string | null
          project_id: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assignee?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          project_id?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assignee?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          project_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_connections: {
        Row: {
          bot_name: string | null
          chat_id: number | null
          created_at: string
          id: string
          is_active: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bot_name?: string | null
          chat_id?: number | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bot_name?: string | null
          chat_id?: number | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      telegram_link_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          used: boolean | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string
          id?: string
          used?: boolean | null
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          used?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      telegram_messages: {
        Row: {
          chat_id: number
          created_at: string
          direction: string
          id: string
          message_text: string | null
          raw_payload_json: Json | null
          user_id: string
        }
        Insert: {
          chat_id: number
          created_at?: string
          direction: string
          id?: string
          message_text?: string | null
          raw_payload_json?: Json | null
          user_id: string
        }
        Update: {
          chat_id?: number
          created_at?: string
          direction?: string
          id?: string
          message_text?: string | null
          raw_payload_json?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workflow_runs: {
        Row: {
          completed_at: string | null
          id: string
          result: Json | null
          started_at: string
          status: string
          workflow_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          result?: Json | null
          started_at?: string
          status?: string
          workflow_id: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          result?: Json | null
          started_at?: string
          status?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_runs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_steps: {
        Row: {
          config: Json | null
          created_at: string
          id: string
          step_order: number
          step_type: string
          title: string
          workflow_id: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          id?: string
          step_order?: number
          step_type: string
          title: string
          workflow_id: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          id?: string
          step_order?: number
          step_type?: string
          title?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_steps_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          created_at: string
          description: string | null
          id: string
          status: string
          title: string
          trigger_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          title: string
          trigger_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          title?: string
          trigger_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      match_document_chunks: {
        Args: {
          _user_id?: string
          match_count?: number
          query_embedding: string
        }
        Returns: {
          chunk: string
          document_id: string
          similarity: number
          source: string
          source_url: string
          title: string
        }[]
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      user_owns_automation: { Args: { _workflow_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "member" | "viewer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "member", "viewer"],
    },
  },
} as const
