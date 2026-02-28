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
      attendance_records: {
        Row: {
          branch_id: number
          clock_in: string | null
          clock_out: string | null
          created_at: string
          date: string
          employee_id: number
          hours_worked: number | null
          id: number
          overtime_hours: number | null
          pos_session_id: number | null
          source: string
          status: string | null
          terminal_id: number | null
        }
        Insert: {
          branch_id: number
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          date: string
          employee_id: number
          hours_worked?: number | null
          id?: never
          overtime_hours?: number | null
          pos_session_id?: number | null
          source: string
          status?: string | null
          terminal_id?: number | null
        }
        Update: {
          branch_id?: number
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          date?: string
          employee_id?: number
          hours_worked?: number | null
          id?: never
          overtime_hours?: number | null
          pos_session_id?: number | null
          source?: string
          status?: string | null
          terminal_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_attendance_branch"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_attendance_employee"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_attendance_session"
            columns: ["pos_session_id"]
            isOneToOne: false
            referencedRelation: "pos_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_attendance_terminal"
            columns: ["terminal_id"]
            isOneToOne: false
            referencedRelation: "pos_terminals"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: number
          ip_address: unknown
          new_value: Json | null
          old_value: Json | null
          resource_id: number
          resource_type: string
          tenant_id: number
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: never
          ip_address?: unknown
          new_value?: Json | null
          old_value?: Json | null
          resource_id: number
          resource_type: string
          tenant_id: number
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: never
          ip_address?: unknown
          new_value?: Json | null
          old_value?: Json | null
          resource_id?: number
          resource_type?: string
          tenant_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_audit_tenant"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_audit_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_zones: {
        Row: {
          branch_id: number
          created_at: string
          id: number
          name: string
          table_count: number | null
          type: string
        }
        Insert: {
          branch_id: number
          created_at?: string
          id?: never
          name: string
          table_count?: number | null
          type: string
        }
        Update: {
          branch_id?: number
          created_at?: string
          id?: never
          name?: string
          table_count?: number | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_zones_branch"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string
          code: string
          created_at: string
          id: number
          is_active: boolean
          name: string
          operating_hours: Json | null
          phone: string
          tenant_id: number
          timezone: string
          updated_at: string
        }
        Insert: {
          address: string
          code: string
          created_at?: string
          id?: never
          is_active?: boolean
          name: string
          operating_hours?: Json | null
          phone: string
          tenant_id: number
          timezone?: string
          updated_at?: string
        }
        Update: {
          address?: string
          code?: string
          created_at?: string
          id?: never
          is_active?: boolean
          name?: string
          operating_hours?: Json | null
          phone?: string
          tenant_id?: number
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_branches_tenant"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          content: Json | null
          created_at: string
          id: number
          name: string
          scheduled_at: string | null
          sent_count: number | null
          status: string
          target_segment: Json | null
          tenant_id: number
          type: string
        }
        Insert: {
          content?: Json | null
          created_at?: string
          id?: never
          name: string
          scheduled_at?: string | null
          sent_count?: number | null
          status?: string
          target_segment?: Json | null
          tenant_id: number
          type: string
        }
        Update: {
          content?: Json | null
          created_at?: string
          id?: never
          name?: string
          scheduled_at?: string | null
          sent_count?: number | null
          status?: string
          target_segment?: Json | null
          tenant_id?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_campaigns_tenant"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_feedback: {
        Row: {
          branch_id: number
          comment: string | null
          created_at: string
          customer_id: number | null
          id: number
          order_id: number | null
          rating: number
          responded_by: string | null
          response: string | null
        }
        Insert: {
          branch_id: number
          comment?: string | null
          created_at?: string
          customer_id?: number | null
          id?: never
          order_id?: number | null
          rating: number
          responded_by?: string | null
          response?: string | null
        }
        Update: {
          branch_id?: number
          comment?: string | null
          created_at?: string
          customer_id?: number | null
          id?: never
          order_id?: number | null
          rating?: number
          responded_by?: string | null
          response?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_feedback_branch"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_feedback_customer"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_feedback_order"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_feedback_responder"
            columns: ["responded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          birthday: string | null
          created_at: string
          email: string | null
          first_visit: string | null
          full_name: string
          gender: string | null
          id: number
          is_active: boolean
          last_visit: string | null
          loyalty_tier_id: number | null
          notes: string | null
          phone: string
          source: string | null
          tenant_id: number
          total_spent: number
          total_visits: number
          updated_at: string
        }
        Insert: {
          birthday?: string | null
          created_at?: string
          email?: string | null
          first_visit?: string | null
          full_name: string
          gender?: string | null
          id?: never
          is_active?: boolean
          last_visit?: string | null
          loyalty_tier_id?: number | null
          notes?: string | null
          phone: string
          source?: string | null
          tenant_id: number
          total_spent?: number
          total_visits?: number
          updated_at?: string
        }
        Update: {
          birthday?: string | null
          created_at?: string
          email?: string | null
          first_visit?: string | null
          full_name?: string
          gender?: string | null
          id?: never
          is_active?: boolean
          last_visit?: string | null
          loyalty_tier_id?: number | null
          notes?: string | null
          phone?: string
          source?: string | null
          tenant_id?: number
          total_spent?: number
          total_visits?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_customers_tenant"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_customers_tier"
            columns: ["loyalty_tier_id"]
            isOneToOne: false
            referencedRelation: "loyalty_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      deletion_requests: {
        Row: {
          completed_at: string | null
          customer_id: number
          id: number
          processed_by: string | null
          requested_at: string
          scheduled_deletion_at: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          customer_id: number
          id?: never
          processed_by?: string | null
          requested_at?: string
          scheduled_deletion_at: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          customer_id?: number
          id?: never
          processed_by?: string | null
          requested_at?: string
          scheduled_deletion_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_deletion_customer"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          branch_id: number
          created_at: string
          department: string | null
          emergency_contact: Json | null
          employment_type: string
          hire_date: string
          hourly_rate: number | null
          id: number
          monthly_salary: number | null
          position: string
          profile_id: string
          status: string
          tenant_id: number
          updated_at: string
        }
        Insert: {
          branch_id: number
          created_at?: string
          department?: string | null
          emergency_contact?: Json | null
          employment_type: string
          hire_date: string
          hourly_rate?: number | null
          id?: never
          monthly_salary?: number | null
          position: string
          profile_id: string
          status?: string
          tenant_id: number
          updated_at?: string
        }
        Update: {
          branch_id?: number
          created_at?: string
          department?: string | null
          emergency_contact?: Json | null
          employment_type?: string
          hire_date?: string
          hourly_rate?: number | null
          id?: never
          monthly_salary?: number | null
          position?: string
          profile_id?: string
          status?: string
          tenant_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_employees_branch"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_employees_profile"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_employees_tenant"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredients: {
        Row: {
          category: string | null
          cost_price: number | null
          created_at: string
          id: number
          is_active: boolean
          max_stock: number | null
          min_stock: number | null
          name: string
          sku: string | null
          tenant_id: number
          unit: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          cost_price?: number | null
          created_at?: string
          id?: never
          is_active?: boolean
          max_stock?: number | null
          min_stock?: number | null
          name: string
          sku?: string | null
          tenant_id: number
          unit: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          cost_price?: number | null
          created_at?: string
          id?: never
          is_active?: boolean
          max_stock?: number | null
          min_stock?: number | null
          name?: string
          sku?: string | null
          tenant_id?: number
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_ingredients_tenant"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      kds_station_categories: {
        Row: {
          category_id: number
          station_id: number
        }
        Insert: {
          category_id: number
          station_id: number
        }
        Update: {
          category_id?: number
          station_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "kds_station_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kds_station_categories_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "kds_stations"
            referencedColumns: ["id"]
          },
        ]
      }
      kds_stations: {
        Row: {
          branch_id: number
          created_at: string
          display_config: Json | null
          id: number
          is_active: boolean
          name: string
        }
        Insert: {
          branch_id: number
          created_at?: string
          display_config?: Json | null
          id?: never
          is_active?: boolean
          name: string
        }
        Update: {
          branch_id?: number
          created_at?: string
          display_config?: Json | null
          id?: never
          is_active?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_kds_stations_branch"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      kds_tickets: {
        Row: {
          accepted_at: string | null
          color_code: string | null
          completed_at: string | null
          created_at: string
          id: number
          items: Json
          order_id: number
          priority: number | null
          station_id: number
          status: string
        }
        Insert: {
          accepted_at?: string | null
          color_code?: string | null
          completed_at?: string | null
          created_at?: string
          id?: never
          items: Json
          order_id: number
          priority?: number | null
          station_id: number
          status?: string
        }
        Update: {
          accepted_at?: string | null
          color_code?: string | null
          completed_at?: string | null
          created_at?: string
          id?: never
          items?: Json
          order_id?: number
          priority?: number | null
          station_id?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_kds_tickets_order"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_kds_tickets_station"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "kds_stations"
            referencedColumns: ["id"]
          },
        ]
      }
      kds_timing_rules: {
        Row: {
          category_id: number
          created_at: string
          critical_min: number | null
          id: number
          prep_time_min: number
          station_id: number
          warning_min: number | null
        }
        Insert: {
          category_id: number
          created_at?: string
          critical_min?: number | null
          id?: never
          prep_time_min: number
          station_id: number
          warning_min?: number | null
        }
        Update: {
          category_id?: number
          created_at?: string
          critical_min?: number | null
          id?: never
          prep_time_min?: number
          station_id?: number
          warning_min?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_timing_category"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_timing_station"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "kds_stations"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          approved_by: string | null
          created_at: string
          days: number
          employee_id: number
          end_date: string
          id: number
          reason: string | null
          start_date: string
          status: string
          type: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          days: number
          employee_id: number
          end_date: string
          id?: never
          reason?: string | null
          start_date: string
          status?: string
          type: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          days?: number
          employee_id?: number
          end_date?: string
          id?: never
          reason?: string | null
          start_date?: string
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_leave_approver"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_leave_employee"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_tiers: {
        Row: {
          benefits: Json | null
          created_at: string
          discount_pct: number | null
          id: number
          min_points: number
          name: string
          sort_order: number | null
          tenant_id: number
        }
        Insert: {
          benefits?: Json | null
          created_at?: string
          discount_pct?: number | null
          id?: never
          min_points?: number
          name: string
          sort_order?: number | null
          tenant_id: number
        }
        Update: {
          benefits?: Json | null
          created_at?: string
          discount_pct?: number | null
          id?: never
          min_points?: number
          name?: string
          sort_order?: number | null
          tenant_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_loyalty_tiers_tenant"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_transactions: {
        Row: {
          balance_after: number | null
          created_at: string
          customer_id: number
          expires_at: string | null
          id: number
          points: number
          reference_id: number | null
          reference_type: string | null
          type: string
        }
        Insert: {
          balance_after?: number | null
          created_at?: string
          customer_id: number
          expires_at?: string | null
          id?: never
          points: number
          reference_id?: number | null
          reference_type?: string | null
          type: string
        }
        Update: {
          balance_after?: number | null
          created_at?: string
          customer_id?: number
          expires_at?: string | null
          id?: never
          points?: number
          reference_id?: number | null
          reference_type?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_loyalty_trans_customer"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_branches: {
        Row: {
          branch_id: number
          menu_id: number
        }
        Insert: {
          branch_id: number
          menu_id: number
        }
        Update: {
          branch_id?: number
          menu_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "menu_branches_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_branches_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_categories: {
        Row: {
          created_at: string
          id: number
          image_url: string | null
          menu_id: number
          name: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          id?: never
          image_url?: string | null
          menu_id: number
          name: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          id?: never
          image_url?: string | null
          menu_id?: number
          name?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_categories_menu"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_item_modifiers: {
        Row: {
          created_at: string
          id: number
          is_required: boolean
          max_selections: number | null
          menu_item_id: number
          name: string
          options: Json | null
        }
        Insert: {
          created_at?: string
          id?: never
          is_required?: boolean
          max_selections?: number | null
          menu_item_id: number
          name: string
          options?: Json | null
        }
        Update: {
          created_at?: string
          id?: never
          is_required?: boolean
          max_selections?: number | null
          menu_item_id?: number
          name?: string
          options?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_modifiers_item"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_item_variants: {
        Row: {
          created_at: string
          id: number
          is_available: boolean
          menu_item_id: number
          name: string
          price_adjustment: number
        }
        Insert: {
          created_at?: string
          id?: never
          is_available?: boolean
          menu_item_id: number
          name: string
          price_adjustment?: number
        }
        Update: {
          created_at?: string
          id?: never
          is_available?: boolean
          menu_item_id?: number
          name?: string
          price_adjustment?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_variants_item"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          allergens: string[] | null
          base_price: number
          category_id: number
          created_at: string
          description: string | null
          id: number
          image_url: string | null
          is_available: boolean
          name: string
          nutrition: Json | null
          prep_time_min: number | null
          tenant_id: number
          updated_at: string
        }
        Insert: {
          allergens?: string[] | null
          base_price: number
          category_id: number
          created_at?: string
          description?: string | null
          id?: never
          image_url?: string | null
          is_available?: boolean
          name: string
          nutrition?: Json | null
          prep_time_min?: number | null
          tenant_id: number
          updated_at?: string
        }
        Update: {
          allergens?: string[] | null
          base_price?: number
          category_id?: number
          created_at?: string
          description?: string | null
          id?: never
          image_url?: string | null
          is_available?: boolean
          name?: string
          nutrition?: Json | null
          prep_time_min?: number | null
          tenant_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_items_category"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_items_tenant"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      menus: {
        Row: {
          created_at: string
          id: number
          is_active: boolean
          name: string
          tenant_id: number
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: never
          is_active?: boolean
          name: string
          tenant_id: number
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: never
          is_active?: boolean
          name?: string
          tenant_id?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_menus_tenant"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          channel: string
          created_at: string
          customer_id: number | null
          data: Json | null
          id: number
          is_read: boolean
          tenant_id: number
          title: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          channel: string
          created_at?: string
          customer_id?: number | null
          data?: Json | null
          id?: never
          is_read?: boolean
          tenant_id: number
          title: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          channel?: string
          created_at?: string
          customer_id?: number | null
          data?: Json | null
          id?: never
          is_read?: boolean
          tenant_id?: number
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_notifications_customer"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_notifications_tenant"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_notifications_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_discounts: {
        Row: {
          applied_by: string | null
          created_at: string
          id: number
          order_id: number
          reason: string | null
          type: string
          value: number
          voucher_id: number | null
        }
        Insert: {
          applied_by?: string | null
          created_at?: string
          id?: never
          order_id: number
          reason?: string | null
          type: string
          value: number
          voucher_id?: number | null
        }
        Update: {
          applied_by?: string | null
          created_at?: string
          id?: never
          order_id?: number
          reason?: string | null
          type?: string
          value?: number
          voucher_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_discounts_applier"
            columns: ["applied_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_discounts_order"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_discounts_voucher"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: number
          item_total: number
          kds_station_id: number | null
          menu_item_id: number
          modifiers: Json | null
          notes: string | null
          order_id: number
          quantity: number
          sent_to_kds_at: string | null
          status: string
          unit_price: number
          variant_id: number | null
        }
        Insert: {
          created_at?: string
          id?: never
          item_total: number
          kds_station_id?: number | null
          menu_item_id: number
          modifiers?: Json | null
          notes?: string | null
          order_id: number
          quantity: number
          sent_to_kds_at?: string | null
          status?: string
          unit_price: number
          variant_id?: number | null
        }
        Update: {
          created_at?: string
          id?: never
          item_total?: number
          kds_station_id?: number | null
          menu_item_id?: number
          modifiers?: Json | null
          notes?: string | null
          order_id?: number
          quantity?: number
          sent_to_kds_at?: string | null
          status?: string
          unit_price?: number
          variant_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_order_items_menu"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_order_items_order"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_order_items_station"
            columns: ["kds_station_id"]
            isOneToOne: false
            referencedRelation: "kds_stations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_order_items_variant"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "menu_item_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          from_status: string | null
          id: number
          order_id: number
          reason: string | null
          terminal_id: number | null
          to_status: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          from_status?: string | null
          id?: never
          order_id: number
          reason?: string | null
          terminal_id?: number | null
          to_status: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          from_status?: string | null
          id?: never
          order_id?: number
          reason?: string | null
          terminal_id?: number | null
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_history_order"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_history_terminal"
            columns: ["terminal_id"]
            isOneToOne: false
            referencedRelation: "pos_terminals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_history_user"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          branch_id: number
          created_at: string
          created_by: string
          customer_id: number | null
          discount_total: number
          id: number
          idempotency_key: string
          notes: string | null
          order_number: string
          pos_session_id: number | null
          service_charge: number
          status: string
          subtotal: number
          table_id: number | null
          tax: number
          terminal_id: number
          total: number
          type: string
          updated_at: string
        }
        Insert: {
          branch_id: number
          created_at?: string
          created_by: string
          customer_id?: number | null
          discount_total?: number
          id?: never
          idempotency_key: string
          notes?: string | null
          order_number: string
          pos_session_id?: number | null
          service_charge?: number
          status?: string
          subtotal?: number
          table_id?: number | null
          tax?: number
          terminal_id: number
          total?: number
          type: string
          updated_at?: string
        }
        Update: {
          branch_id?: number
          created_at?: string
          created_by?: string
          customer_id?: number | null
          discount_total?: number
          id?: never
          idempotency_key?: string
          notes?: string | null
          order_number?: string
          pos_session_id?: number | null
          service_charge?: number
          status?: string
          subtotal?: number
          table_id?: number | null
          tax?: number
          terminal_id?: number
          total?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_orders_branch"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_creator"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_customer"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_session"
            columns: ["pos_session_id"]
            isOneToOne: false
            referencedRelation: "pos_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_table"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_terminal"
            columns: ["terminal_id"]
            isOneToOne: false
            referencedRelation: "pos_terminals"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: number
          idempotency_key: string
          method: string
          order_id: number
          paid_at: string | null
          pos_session_id: number
          provider: string | null
          reference_no: string | null
          status: string
          terminal_id: number
          tip: number
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: never
          idempotency_key: string
          method: string
          order_id: number
          paid_at?: string | null
          pos_session_id: number
          provider?: string | null
          reference_no?: string | null
          status?: string
          terminal_id: number
          tip?: number
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: never
          idempotency_key?: string
          method?: string
          order_id?: number
          paid_at?: string | null
          pos_session_id?: number
          provider?: string | null
          reference_no?: string | null
          status?: string
          terminal_id?: number
          tip?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_payments_order"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_payments_session"
            columns: ["pos_session_id"]
            isOneToOne: false
            referencedRelation: "pos_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_payments_terminal"
            columns: ["terminal_id"]
            isOneToOne: false
            referencedRelation: "pos_terminals"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_items: {
        Row: {
          base_pay: number | null
          bonuses: number | null
          created_at: string
          deductions: Json | null
          employee_id: number
          id: number
          net_pay: number | null
          notes: string | null
          overtime_pay: number | null
          period_id: number
          tax: number | null
          tips: number | null
        }
        Insert: {
          base_pay?: number | null
          bonuses?: number | null
          created_at?: string
          deductions?: Json | null
          employee_id: number
          id?: never
          net_pay?: number | null
          notes?: string | null
          overtime_pay?: number | null
          period_id: number
          tax?: number | null
          tips?: number | null
        }
        Update: {
          base_pay?: number | null
          bonuses?: number | null
          created_at?: string
          deductions?: Json | null
          employee_id?: number
          id?: never
          net_pay?: number | null
          notes?: string | null
          overtime_pay?: number | null
          period_id?: number
          tax?: number | null
          tips?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_payroll_items_employee"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_payroll_items_period"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_periods: {
        Row: {
          created_at: string
          id: number
          notes: string | null
          period_end: string
          period_start: string
          processed_at: string | null
          processed_by: string | null
          status: string
          tenant_id: number
          total: number | null
        }
        Insert: {
          created_at?: string
          id?: never
          notes?: string | null
          period_end: string
          period_start: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          tenant_id: number
          total?: number | null
        }
        Update: {
          created_at?: string
          id?: never
          notes?: string | null
          period_end?: string
          period_start?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          tenant_id?: number
          total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_payroll_processor"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_payroll_tenant"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_sessions: {
        Row: {
          branch_id: number
          cashier_id: string
          closed_at: string | null
          closing_amount: number | null
          created_at: string
          difference: number | null
          expected_amount: number | null
          id: number
          notes: string | null
          opened_at: string
          opening_amount: number
          status: string
          terminal_id: number
          updated_at: string
        }
        Insert: {
          branch_id: number
          cashier_id: string
          closed_at?: string | null
          closing_amount?: number | null
          created_at?: string
          difference?: number | null
          expected_amount?: number | null
          id?: never
          notes?: string | null
          opened_at?: string
          opening_amount?: number
          status?: string
          terminal_id: number
          updated_at?: string
        }
        Update: {
          branch_id?: number
          cashier_id?: string
          closed_at?: string | null
          closing_amount?: number | null
          created_at?: string
          difference?: number | null
          expected_amount?: number | null
          id?: never
          notes?: string | null
          opened_at?: string
          opening_amount?: number
          status?: string
          terminal_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_sessions_branch"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_sessions_cashier"
            columns: ["cashier_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_sessions_terminal"
            columns: ["terminal_id"]
            isOneToOne: false
            referencedRelation: "pos_terminals"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_terminals: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          branch_id: number
          created_at: string
          device_fingerprint: string
          id: number
          is_active: boolean
          last_seen_at: string | null
          name: string
          peripheral_config: Json | null
          registered_by: string | null
          type: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          branch_id: number
          created_at?: string
          device_fingerprint: string
          id?: never
          is_active?: boolean
          last_seen_at?: string | null
          name: string
          peripheral_config?: Json | null
          registered_by?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          branch_id?: number
          created_at?: string
          device_fingerprint?: string
          id?: never
          is_active?: boolean
          last_seen_at?: string | null
          name?: string
          peripheral_config?: Json | null
          registered_by?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_terminals_approved_by"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_terminals_branch"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_terminals_registered_by"
            columns: ["registered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          branch_id: number | null
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          role: string
          settings: Json | null
          tenant_id: number
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          branch_id?: number | null
          created_at?: string
          full_name: string
          id: string
          is_active?: boolean
          role: string
          settings?: Json | null
          tenant_id: number
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          branch_id?: number | null
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          role?: string
          settings?: Json | null
          tenant_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_profiles_branch"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_profiles_tenant"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          created_at: string
          id: number
          ingredient_id: number
          po_id: number
          quantity: number
          received_qty: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: never
          ingredient_id: number
          po_id: number
          quantity: number
          received_qty?: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: never
          ingredient_id?: number
          po_id?: number
          quantity?: number
          received_qty?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_po_items_ingredient"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_po_items_po"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          branch_id: number
          created_at: string
          created_by: string
          expected_at: string | null
          id: number
          notes: string | null
          ordered_at: string | null
          received_at: string | null
          status: string
          supplier_id: number
          tenant_id: number
          total: number | null
          updated_at: string
        }
        Insert: {
          branch_id: number
          created_at?: string
          created_by: string
          expected_at?: string | null
          id?: never
          notes?: string | null
          ordered_at?: string | null
          received_at?: string | null
          status?: string
          supplier_id: number
          tenant_id: number
          total?: number | null
          updated_at?: string
        }
        Update: {
          branch_id?: number
          created_at?: string
          created_by?: string
          expected_at?: string | null
          id?: never
          notes?: string | null
          ordered_at?: string | null
          received_at?: string | null
          status?: string
          supplier_id?: number
          tenant_id?: number
          total?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_po_branch"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_po_creator"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_po_supplier"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_po_tenant"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_ingredients: {
        Row: {
          created_at: string
          id: number
          ingredient_id: number
          quantity: number
          recipe_id: number
          unit: string
          waste_pct: number
        }
        Insert: {
          created_at?: string
          id?: never
          ingredient_id: number
          quantity: number
          recipe_id: number
          unit: string
          waste_pct?: number
        }
        Update: {
          created_at?: string
          id?: never
          ingredient_id?: number
          quantity?: number
          recipe_id?: number
          unit?: string
          waste_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_recipe_ing_ingredient"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_recipe_ing_recipe"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          created_at: string
          id: number
          menu_item_id: number
          total_cost: number | null
          updated_at: string
          version: number
          yield_qty: number | null
          yield_unit: string | null
        }
        Insert: {
          created_at?: string
          id?: never
          menu_item_id: number
          total_cost?: number | null
          updated_at?: string
          version?: number
          yield_qty?: number | null
          yield_unit?: string | null
        }
        Update: {
          created_at?: string
          id?: never
          menu_item_id?: number
          total_cost?: number | null
          updated_at?: string
          version?: number
          yield_qty?: number | null
          yield_unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_recipes_item"
            columns: ["menu_item_id"]
            isOneToOne: true
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      security_events: {
        Row: {
          created_at: string
          details: Json | null
          event_type: string
          id: number
          severity: string
          source_ip: unknown
          tenant_id: number | null
          terminal_id: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          event_type: string
          id?: never
          severity: string
          source_ip?: unknown
          tenant_id?: number | null
          terminal_id?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: never
          severity?: string
          source_ip?: unknown
          tenant_id?: number | null
          terminal_id?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      shift_assignments: {
        Row: {
          created_at: string
          date: string
          employee_id: number
          id: number
          notes: string | null
          shift_id: number
          status: string
          swap_with: number | null
        }
        Insert: {
          created_at?: string
          date: string
          employee_id: number
          id?: never
          notes?: string | null
          shift_id: number
          status?: string
          swap_with?: number | null
        }
        Update: {
          created_at?: string
          date?: string
          employee_id?: number
          id?: never
          notes?: string | null
          shift_id?: number
          status?: string
          swap_with?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_assignment_employee"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_assignment_shift"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_assignment_swap"
            columns: ["swap_with"]
            isOneToOne: false
            referencedRelation: "shift_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          branch_id: number
          break_min: number | null
          created_at: string
          end_time: string
          id: number
          max_employees: number | null
          name: string
          start_time: string
        }
        Insert: {
          branch_id: number
          break_min?: number | null
          created_at?: string
          end_time: string
          id?: never
          max_employees?: number | null
          name: string
          start_time: string
        }
        Update: {
          branch_id?: number
          break_min?: number | null
          created_at?: string
          end_time?: string
          id?: never
          max_employees?: number | null
          name?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_shifts_branch"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_levels: {
        Row: {
          branch_id: number
          id: number
          ingredient_id: number
          quantity: number
          updated_at: string
          version: number
        }
        Insert: {
          branch_id: number
          id?: never
          ingredient_id: number
          quantity?: number
          updated_at?: string
          version?: number
        }
        Update: {
          branch_id?: number
          id?: never
          ingredient_id?: number
          quantity?: number
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_stock_branch"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_stock_ingredient"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          branch_id: number
          cost_at_time: number | null
          created_at: string
          created_by: string | null
          id: number
          ingredient_id: number
          notes: string | null
          quantity: number
          reference_id: number | null
          reference_type: string | null
          type: string
        }
        Insert: {
          branch_id: number
          cost_at_time?: number | null
          created_at?: string
          created_by?: string | null
          id?: never
          ingredient_id: number
          notes?: string | null
          quantity: number
          reference_id?: number | null
          reference_type?: string | null
          type: string
        }
        Update: {
          branch_id?: number
          cost_at_time?: number | null
          created_at?: string
          created_by?: string | null
          id?: never
          ingredient_id?: number
          notes?: string | null
          quantity?: number
          reference_id?: number | null
          reference_type?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_movement_branch"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_movement_ingredient"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_movement_user"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          contact_name: string | null
          created_at: string
          email: string | null
          id: number
          is_active: boolean
          name: string
          payment_terms: string | null
          phone: string | null
          rating: number | null
          tenant_id: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: never
          is_active?: boolean
          name: string
          payment_terms?: string | null
          phone?: string | null
          rating?: number | null
          tenant_id: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: never
          is_active?: boolean
          name?: string
          payment_terms?: string | null
          phone?: string | null
          rating?: number | null
          tenant_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_suppliers_tenant"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          id: number
          key: string
          tenant_id: number
          updated_at: string
          updated_by: string | null
          value: Json | null
        }
        Insert: {
          id?: never
          key: string
          tenant_id: number
          updated_at?: string
          updated_by?: string | null
          value?: Json | null
        }
        Update: {
          id?: never
          key?: string
          tenant_id?: number
          updated_at?: string
          updated_by?: string | null
          value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_settings_tenant"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_settings_updater"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tables: {
        Row: {
          branch_id: number
          capacity: number | null
          created_at: string
          id: number
          number: number
          qr_code_url: string | null
          status: string
          zone_id: number
        }
        Insert: {
          branch_id: number
          capacity?: number | null
          created_at?: string
          id?: never
          number: number
          qr_code_url?: string | null
          status?: string
          zone_id: number
        }
        Update: {
          branch_id?: number
          capacity?: number | null
          created_at?: string
          id?: never
          number?: number
          qr_code_url?: string | null
          status?: string
          zone_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_tables_branch"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_tables_zone"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "branch_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          id: number
          is_active: boolean
          logo_url: string | null
          name: string
          settings: Json | null
          slug: string
          subscription_plan: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: never
          is_active?: boolean
          logo_url?: string | null
          name: string
          settings?: Json | null
          slug: string
          subscription_plan?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: never
          is_active?: boolean
          logo_url?: string | null
          name?: string
          settings?: Json | null
          slug?: string
          subscription_plan?: string
          updated_at?: string
        }
        Relationships: []
      }
      voucher_branches: {
        Row: {
          branch_id: number
          voucher_id: number
        }
        Insert: {
          branch_id: number
          voucher_id: number
        }
        Update: {
          branch_id?: number
          voucher_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "voucher_branches_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voucher_branches_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      vouchers: {
        Row: {
          code: string
          created_at: string
          id: number
          is_active: boolean
          max_discount: number | null
          max_uses: number | null
          min_order: number | null
          tenant_id: number
          type: string
          updated_at: string
          used_count: number
          valid_from: string
          valid_to: string
          value: number
        }
        Insert: {
          code: string
          created_at?: string
          id?: never
          is_active?: boolean
          max_discount?: number | null
          max_uses?: number | null
          min_order?: number | null
          tenant_id: number
          type: string
          updated_at?: string
          used_count?: number
          valid_from: string
          valid_to: string
          value: number
        }
        Update: {
          code?: string
          created_at?: string
          id?: never
          is_active?: boolean
          max_discount?: number | null
          max_uses?: number | null
          min_order?: number | null
          tenant_id?: number
          type?: string
          updated_at?: string
          used_count?: number
          valid_from?: string
          valid_to?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_vouchers_tenant"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      waste_logs: {
        Row: {
          branch_id: number
          id: number
          ingredient_id: number
          logged_at: string
          logged_by: string
          notes: string | null
          quantity: number
          reason: string
        }
        Insert: {
          branch_id: number
          id?: never
          ingredient_id: number
          logged_at?: string
          logged_by: string
          notes?: string | null
          quantity: number
          reason: string
        }
        Update: {
          branch_id?: number
          id?: never
          ingredient_id?: number
          logged_at?: string
          logged_by?: string
          notes?: string | null
          quantity?: number
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_waste_branch"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_waste_ingredient"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_waste_user"
            columns: ["logged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_branch_id: { Args: never; Returns: number }
      auth_role: { Args: never; Returns: string }
      auth_tenant_id: { Args: never; Returns: number }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
