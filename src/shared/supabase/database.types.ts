
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "customers": {
                  Row: {
                    "created_at": string,"display_name": string,"locale": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"display_name"?: string,"locale"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"display_name"?: string,"locale"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"event_deliveries": {
                  Row: {
                    "attempts": number,"created_at": string,"event_id": string,"handler": string,"id": string,"last_error": string | null,"locked_until": string | null,"next_attempt_at": string,"processed_at": string | null,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attempts"?: number,"created_at"?: string,"event_id": string,"handler": string,"id"?: string,"last_error"?: string | null,"locked_until"?: string | null,"next_attempt_at"?: string,"processed_at"?: string | null,"status"?: string
                  }
                  Update: {
                    "attempts"?: number,"created_at"?: string,"event_id"?: string,"handler"?: string,"id"?: string,"last_error"?: string | null,"locked_until"?: string | null,"next_attempt_at"?: string,"processed_at"?: string | null,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "event_deliveries_event_id_fkey"
      columns: ["event_id"]
isOneToOne: false
      referencedRelation: "events"
      referencedColumns: ["id"]
    }
                  ]
                },"events": {
                  Row: {
                    "created_at": string,"fanned_out_at": string | null,"id": string,"payload": NonNullable<Json>,"source_module": string,"type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"fanned_out_at"?: string | null,"id"?: string,"payload"?: NonNullable<Json>,"source_module": string,"type": string
                  }
                  Update: {
                    "created_at"?: string,"fanned_out_at"?: string | null,"id"?: string,"payload"?: NonNullable<Json>,"source_module"?: string,"type"?: string
                  }
                  Relationships: [
                    
                  ]
                },"health_check": {
                  Row: {
                    "checked_at": string,"id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "checked_at"?: string,"id": number
                  }
                  Update: {
                    "checked_at"?: string,"id"?: number
                  }
                  Relationships: [
                    
                  ]
                },"help_requests": {
                  Row: {
                    "category_code": string,"created_at": string,"customer_id": string,"description": string,"district": string,"id": string,"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category_code": string,"created_at"?: string,"customer_id"?: string,"description": string,"district": string,"id"?: string,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "category_code"?: string,"created_at"?: string,"customer_id"?: string,"description"?: string,"district"?: string,"id"?: string,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "help_requests_category_code_fkey"
      columns: ["category_code"]
isOneToOne: false
      referencedRelation: "service_categories"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "help_requests_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["user_id"]
    }
                  ]
                },"platform_settings": {
                  Row: {
                    "amount": number | null,"currency": string | null,"description": string,"int_value": number | null,"key": string,"text_value": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount"?: number | null,"currency"?: string | null,"description"?: string,"int_value"?: number | null,"key": string,"text_value"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "amount"?: number | null,"currency"?: string | null,"description"?: string,"int_value"?: number | null,"key"?: string,"text_value"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"provider_logs": {
                  Row: {
                    "action": string,"amount": number | null,"created_at": string,"currency": string | null,"error_message": string | null,"external_id": string | null,"id": string,"idempotency_key": string | null,"implementation": string,"request": NonNullable<Json>,"response": Json | null,"result_code": string | null,"service": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"amount"?: number | null,"created_at"?: string,"currency"?: string | null,"error_message"?: string | null,"external_id"?: string | null,"id"?: string,"idempotency_key"?: string | null,"implementation": string,"request"?: NonNullable<Json>,"response"?: Json | null,"result_code"?: string | null,"service": string,"status": string
                  }
                  Update: {
                    "action"?: string,"amount"?: number | null,"created_at"?: string,"currency"?: string | null,"error_message"?: string | null,"external_id"?: string | null,"id"?: string,"idempotency_key"?: string | null,"implementation"?: string,"request"?: NonNullable<Json>,"response"?: Json | null,"result_code"?: string | null,"service"?: string,"status"?: string
                  }
                  Relationships: [
                    
                  ]
                },"request_attachments": {
                  Row: {
                    "content_type": string,"created_at": string,"id": string,"kind": string,"request_id": string,"size_bytes": number,"storage_path": string
                  }
                  ComputedFields: never
                  Insert: {
                    "content_type": string,"created_at"?: string,"id"?: string,"kind": string,"request_id": string,"size_bytes": number,"storage_path": string
                  }
                  Update: {
                    "content_type"?: string,"created_at"?: string,"id"?: string,"kind"?: string,"request_id"?: string,"size_bytes"?: number,"storage_path"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "request_attachments_request_id_fkey"
      columns: ["request_id"]
isOneToOne: false
      referencedRelation: "help_requests"
      referencedColumns: ["id"]
    }
                  ]
                },"service_categories": {
                  Row: {
                    "active": boolean,"code": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"code": string,"sort_order": number
                  }
                  Update: {
                    "active"?: boolean,"code"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"technicians": {
                  Row: {
                    "approved_at": string | null,"categories": (string)[],"created_at": string,"display_name": string,"gender": string,"identity_verified_at": string | null,"languages": (string)[],"license_name": string | null,"license_verified_at": string | null,"license_years": number | null,"other_license_count": number,"police_record_verified_at": string | null,"rating": number | null,"response_minutes": number | null,"review_count": number,"service_areas": (string)[],"service_count": number,"skills": (string)[],"status": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "approved_at"?: string | null,"categories"?: (string)[],"created_at"?: string,"display_name": string,"gender": string,"identity_verified_at"?: string | null,"languages"?: (string)[],"license_name"?: string | null,"license_verified_at"?: string | null,"license_years"?: number | null,"other_license_count"?: number,"police_record_verified_at"?: string | null,"rating"?: number | null,"response_minutes"?: number | null,"review_count"?: number,"service_areas"?: (string)[],"service_count"?: number,"skills"?: (string)[],"status"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "approved_at"?: string | null,"categories"?: (string)[],"created_at"?: string,"display_name"?: string,"gender"?: string,"identity_verified_at"?: string | null,"languages"?: (string)[],"license_name"?: string | null,"license_verified_at"?: string | null,"license_years"?: number | null,"other_license_count"?: number,"police_record_verified_at"?: string | null,"rating"?: number | null,"response_minutes"?: number | null,"review_count"?: number,"service_areas"?: (string)[],"service_count"?: number,"skills"?: (string)[],"status"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"terms_acceptances": {
                  Row: {
                    "accepted_at": string,"document": string,"id": string,"user_id": string,"version": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_at"?: string,"document": string,"id"?: string,"user_id"?: string,"version": string
                  }
                  Update: {
                    "accepted_at"?: string,"document"?: string,"id"?: string,"user_id"?: string,"version"?: string
                  }
                  Relationships: [
                    
                  ]
                },"user_roles": {
                  Row: {
                    "granted_at": string,"role": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "granted_at"?: string,"role": string,"user_id": string
                  }
                  Update: {
                    "granted_at"?: string,"role"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"video_bookings": {
                  Row: {
                    "created_at": string,"customer_id": string,"ended_at": string | null,"id": string,"request_id": string,"scheduled_at": string | null,"sequence": number,"started_at": string | null,"status": string,"technician_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"customer_id": string,"ended_at"?: string | null,"id"?: string,"request_id": string,"scheduled_at"?: string | null,"sequence": number,"started_at"?: string | null,"status"?: string,"technician_id": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"customer_id"?: string,"ended_at"?: string | null,"id"?: string,"request_id"?: string,"scheduled_at"?: string | null,"sequence"?: number,"started_at"?: string | null,"status"?: string,"technician_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "video_bookings_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "video_bookings_request_id_fkey"
      columns: ["request_id"]
isOneToOne: false
      referencedRelation: "help_requests"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "video_bookings_technician_id_fkey"
      columns: ["technician_id"]
isOneToOne: false
      referencedRelation: "public_technicians"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "video_bookings_technician_id_fkey"
      columns: ["technician_id"]
isOneToOne: false
      referencedRelation: "technicians"
      referencedColumns: ["user_id"]
    }
                  ]
                }
          }
          Views: {
            "public_technicians": {
                  Row: {
                    "categories": (string)[],"display_name": string,"gender": string,"id": string,"identity_verified_at": string | null,"languages": (string)[],"license_name": string | null,"license_verified_at": string | null,"license_years": number | null,"other_license_count": number,"police_record_verified_at": string | null,"rating": number | null,"response_minutes": number | null,"review_count": number,"service_areas": (string)[],"service_count": number,"skills": (string)[]
                  }
                  ComputedFields: never
                  Insert: {
                           "categories"?: (string)[] | null,"display_name"?: string | null,"gender"?: string | null,"id"?: string | null,"identity_verified_at"?: string | null,"languages"?: (string)[] | null,"license_name"?: string | null,"license_verified_at"?: string | null,"license_years"?: number | null,"other_license_count"?: number | null,"police_record_verified_at"?: string | null,"rating"?: number | null,"response_minutes"?: number | null,"review_count"?: number | null,"service_areas"?: (string)[] | null,"service_count"?: number | null,"skills"?: (string)[] | null
                         }
                        Update: {
                           "categories"?: (string)[] | null,"display_name"?: string | null,"gender"?: string | null,"id"?: string | null,"identity_verified_at"?: string | null,"languages"?: (string)[] | null,"license_name"?: string | null,"license_verified_at"?: string | null,"license_years"?: number | null,"other_license_count"?: number | null,"police_record_verified_at"?: string | null,"rating"?: number | null,"response_minutes"?: number | null,"review_count"?: number | null,"service_areas"?: (string)[] | null,"service_count"?: number | null,"skills"?: (string)[] | null
                         }
                        Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "claim_event_deliveries":
{ Args: { "p_limit"?: number,"p_lock_seconds"?: number,"p_max_attempts"?: number }; Returns: {
              "attempts": number,"delivery_id": string,"event_created_at": string,"event_id": string,"event_type": string,"handler": string,"payload": Json
            }[]
                           },
"current_terms_version":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"emit_event":
{ Args: { "p_payload"?: Json,"p_source": string,"p_type": string }; Returns: string
                           },
"event_key_is_forbidden":
{ Args: { "k": string }; Returns: boolean
                           },
"event_payload_forbidden_keys":
{ Args: { "doc": Json }; Returns: (string)[]
                           },
"fan_out_events":
{ Args: { "p_limit"?: number,"p_subscriptions": Json }; Returns: number
                           },
"has_any_role":
{ Args: { "p_roles": (string)[] }; Returns: boolean
                           },
"has_role":
{ Args: { "p_role": string }; Returns: boolean
                           },
"purge_provider_logs":
{ Args: Record<PropertyKey, never>; Returns: number
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            
          }
        }
} as const
