
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "calculation_dependencies": {
                  Row: {
                    "created_at": string,"dependency_type": string,"downstream_calculation_revision_id": string,"id": string,"organization_id": string,"upstream_calculation_revision_id": string | null,"upstream_roof_model_revision_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"dependency_type": string,"downstream_calculation_revision_id": string,"id"?: string,"organization_id": string,"upstream_calculation_revision_id"?: string | null,"upstream_roof_model_revision_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"dependency_type"?: string,"downstream_calculation_revision_id"?: string,"id"?: string,"organization_id"?: string,"upstream_calculation_revision_id"?: string | null,"upstream_roof_model_revision_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "calculation_dependencies_calculation_upstream_same_organization"
      columns: ["upstream_calculation_revision_id","organization_id"]
isOneToOne: false
      referencedRelation: "calculation_revisions"
      referencedColumns: ["id","organization_id"]
    },{
      foreignKeyName: "calculation_dependencies_downstream_same_organization_fk"
      columns: ["downstream_calculation_revision_id","organization_id"]
isOneToOne: false
      referencedRelation: "calculation_revisions"
      referencedColumns: ["id","organization_id"]
    },{
      foreignKeyName: "calculation_dependencies_roof_upstream_same_organization_fk"
      columns: ["upstream_roof_model_revision_id","organization_id"]
isOneToOne: false
      referencedRelation: "roof_model_revisions"
      referencedColumns: ["id","organization_id"]
    }
                  ]
                },"calculation_revisions": {
                  Row: {
                    "calculation_id": string,"calculator_implementation_version": string,"created_at": string,"created_by": string | null,"data_provenance": NonNullable<Json>,"id": string,"input_schema_version": string,"input_snapshot": NonNullable<Json>,"organization_id": string,"output_snapshot": NonNullable<Json>,"revision_number": number,"validation_status": string,"warnings": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "calculation_id": string,"calculator_implementation_version": string,"created_at"?: string,"created_by"?: string | null,"data_provenance"?: NonNullable<Json>,"id"?: string,"input_schema_version": string,"input_snapshot"?: NonNullable<Json>,"organization_id": string,"output_snapshot"?: NonNullable<Json>,"revision_number": number,"validation_status"?: string,"warnings"?: NonNullable<Json>
                  }
                  Update: {
                    "calculation_id"?: string,"calculator_implementation_version"?: string,"created_at"?: string,"created_by"?: string | null,"data_provenance"?: NonNullable<Json>,"id"?: string,"input_schema_version"?: string,"input_snapshot"?: NonNullable<Json>,"organization_id"?: string,"output_snapshot"?: NonNullable<Json>,"revision_number"?: number,"validation_status"?: string,"warnings"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "calculation_revisions_calculation_same_organization_fk"
      columns: ["calculation_id","organization_id"]
isOneToOne: false
      referencedRelation: "calculations"
      referencedColumns: ["id","organization_id"]
    }
                  ]
                },"calculations": {
                  Row: {
                    "calculator_type": string,"created_at": string,"current_revision_id": string | null,"display_name": string,"id": string,"organization_id": string,"project_id": string,"roof_model_id": string | null,"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "calculator_type": string,"created_at"?: string,"current_revision_id"?: string | null,"display_name": string,"id"?: string,"organization_id": string,"project_id": string,"roof_model_id"?: string | null,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "calculator_type"?: string,"created_at"?: string,"current_revision_id"?: string | null,"display_name"?: string,"id"?: string,"organization_id"?: string,"project_id"?: string,"roof_model_id"?: string | null,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "calculations_current_revision_fk"
      columns: ["current_revision_id","id"]
isOneToOne: false
      referencedRelation: "calculation_revisions"
      referencedColumns: ["id","calculation_id"]
    },{
      foreignKeyName: "calculations_project_same_organization_fk"
      columns: ["project_id","organization_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id","organization_id"]
    },{
      foreignKeyName: "calculations_roof_model_same_organization_fk"
      columns: ["roof_model_id","organization_id"]
isOneToOne: false
      referencedRelation: "roof_models"
      referencedColumns: ["id","organization_id"]
    }
                  ]
                },"clients": {
                  Row: {
                    "billing_address": string | null,"created_at": string,"email": string | null,"id": string,"name": string,"notes": string | null,"organization_id": string,"phone": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "billing_address"?: string | null,"created_at"?: string,"email"?: string | null,"id"?: string,"name": string,"notes"?: string | null,"organization_id": string,"phone"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "billing_address"?: string | null,"created_at"?: string,"email"?: string | null,"id"?: string,"name"?: string,"notes"?: string | null,"organization_id"?: string,"phone"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "clients_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"material_manufacturers": {
                  Row: {
                    "created_at": string,"created_by": string | null,"id": string,"name": string,"notes": string | null,"organization_id": string,"updated_at": string,"website": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"name": string,"notes"?: string | null,"organization_id": string,"updated_at"?: string,"website"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"name"?: string,"notes"?: string | null,"organization_id"?: string,"updated_at"?: string,"website"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "material_manufacturers_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"material_prices": {
                  Row: {
                    "amount": number,"created_at": string,"created_by": string | null,"currency": string,"data_provenance": Database["public"]['Enums']["material_data_provenance"],"effective_date": string,"id": string,"organization_id": string,"price_kind": Database["public"]['Enums']["material_price_kind"],"price_source": string | null,"purchasing_unit": Database["public"]['Enums']["material_purchasing_unit"],"recorded_at": string,"source_date": string | null,"source_name": string | null,"source_notes": string | null,"source_url": string | null,"variant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"created_at"?: string,"created_by"?: string | null,"currency"?: string,"data_provenance"?: Database["public"]['Enums']["material_data_provenance"],"effective_date": string,"id"?: string,"organization_id": string,"price_kind": Database["public"]['Enums']["material_price_kind"],"price_source"?: string | null,"purchasing_unit": Database["public"]['Enums']["material_purchasing_unit"],"recorded_at"?: string,"source_date"?: string | null,"source_name"?: string | null,"source_notes"?: string | null,"source_url"?: string | null,"variant_id": string
                  }
                  Update: {
                    "amount"?: number,"created_at"?: string,"created_by"?: string | null,"currency"?: string,"data_provenance"?: Database["public"]['Enums']["material_data_provenance"],"effective_date"?: string,"id"?: string,"organization_id"?: string,"price_kind"?: Database["public"]['Enums']["material_price_kind"],"price_source"?: string | null,"purchasing_unit"?: Database["public"]['Enums']["material_purchasing_unit"],"recorded_at"?: string,"source_date"?: string | null,"source_name"?: string | null,"source_notes"?: string | null,"source_url"?: string | null,"variant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "material_prices_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "material_prices_variant_same_organization_fk"
      columns: ["variant_id","organization_id"]
isOneToOne: false
      referencedRelation: "material_variants"
      referencedColumns: ["id","organization_id"]
    }
                  ]
                },"material_products": {
                  Row: {
                    "category": Database["public"]['Enums']["material_category"],"created_at": string,"created_by": string | null,"data_provenance": Database["public"]['Enums']["material_data_provenance"],"description": string | null,"id": string,"manufacturer_id": string | null,"name": string,"organization_id": string,"product_code": string | null,"source_date": string | null,"source_name": string | null,"source_notes": string | null,"source_url": string | null,"status": Database["public"]['Enums']["material_product_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category": Database["public"]['Enums']["material_category"],"created_at"?: string,"created_by"?: string | null,"data_provenance"?: Database["public"]['Enums']["material_data_provenance"],"description"?: string | null,"id"?: string,"manufacturer_id"?: string | null,"name": string,"organization_id": string,"product_code"?: string | null,"source_date"?: string | null,"source_name"?: string | null,"source_notes"?: string | null,"source_url"?: string | null,"status"?: Database["public"]['Enums']["material_product_status"],"updated_at"?: string
                  }
                  Update: {
                    "category"?: Database["public"]['Enums']["material_category"],"created_at"?: string,"created_by"?: string | null,"data_provenance"?: Database["public"]['Enums']["material_data_provenance"],"description"?: string | null,"id"?: string,"manufacturer_id"?: string | null,"name"?: string,"organization_id"?: string,"product_code"?: string | null,"source_date"?: string | null,"source_name"?: string | null,"source_notes"?: string | null,"source_url"?: string | null,"status"?: Database["public"]['Enums']["material_product_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "material_products_manufacturer_same_organization_fk"
      columns: ["manufacturer_id","organization_id"]
isOneToOne: false
      referencedRelation: "material_manufacturers"
      referencedColumns: ["id","organization_id"]
    },{
      foreignKeyName: "material_products_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"material_variants": {
                  Row: {
                    "created_at": string,"created_by": string | null,"data_provenance": Database["public"]['Enums']["material_data_provenance"],"effective_width_mm": number | null,"id": string,"length_mm": number | null,"name": string,"nominal_width_mm": number | null,"organization_id": string,"packaging_quantity": number | null,"product_id": string,"purchasing_unit": Database["public"]['Enums']["material_purchasing_unit"],"sku": string | null,"source_date": string | null,"source_name": string | null,"source_notes": string | null,"source_url": string | null,"technical_specs": NonNullable<Json>,"thickness_mm": number | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"data_provenance"?: Database["public"]['Enums']["material_data_provenance"],"effective_width_mm"?: number | null,"id"?: string,"length_mm"?: number | null,"name": string,"nominal_width_mm"?: number | null,"organization_id": string,"packaging_quantity"?: number | null,"product_id": string,"purchasing_unit": Database["public"]['Enums']["material_purchasing_unit"],"sku"?: string | null,"source_date"?: string | null,"source_name"?: string | null,"source_notes"?: string | null,"source_url"?: string | null,"technical_specs"?: NonNullable<Json>,"thickness_mm"?: number | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"data_provenance"?: Database["public"]['Enums']["material_data_provenance"],"effective_width_mm"?: number | null,"id"?: string,"length_mm"?: number | null,"name"?: string,"nominal_width_mm"?: number | null,"organization_id"?: string,"packaging_quantity"?: number | null,"product_id"?: string,"purchasing_unit"?: Database["public"]['Enums']["material_purchasing_unit"],"sku"?: string | null,"source_date"?: string | null,"source_name"?: string | null,"source_notes"?: string | null,"source_url"?: string | null,"technical_specs"?: NonNullable<Json>,"thickness_mm"?: number | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "material_variants_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "material_variants_product_same_organization_fk"
      columns: ["product_id","organization_id"]
isOneToOne: false
      referencedRelation: "material_products"
      referencedColumns: ["id","organization_id"]
    }
                  ]
                },"organization_members": {
                  Row: {
                    "created_at": string,"organization_id": string,"role": Database["public"]['Enums']["organization_role"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"organization_id": string,"role"?: Database["public"]['Enums']["organization_role"],"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"organization_id"?: string,"role"?: Database["public"]['Enums']["organization_role"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "organization_members_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"organizations": {
                  Row: {
                    "created_at": string,"id": string,"name": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"name": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"display_name": string | null,"id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"display_name"?: string | null,"id": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"display_name"?: string | null,"id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"projects": {
                  Row: {
                    "client_id": string | null,"created_at": string,"created_by": string | null,"description": string | null,"id": string,"location": string | null,"name": string,"organization_id": string,"previous_status": Database["public"]['Enums']["project_status"] | null,"project_type": Database["public"]['Enums']["project_type"],"status": Database["public"]['Enums']["project_status"],"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "client_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"id"?: string,"location"?: string | null,"name": string,"organization_id": string,"previous_status"?: Database["public"]['Enums']["project_status"] | null,"project_type"?: Database["public"]['Enums']["project_type"],"status"?: Database["public"]['Enums']["project_status"],"updated_at"?: string,"version"?: number
                  }
                  Update: {
                    "client_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"id"?: string,"location"?: string | null,"name"?: string,"organization_id"?: string,"previous_status"?: Database["public"]['Enums']["project_status"] | null,"project_type"?: Database["public"]['Enums']["project_type"],"status"?: Database["public"]['Enums']["project_status"],"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "projects_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "projects_client_same_organization_fk"
      columns: ["client_id","organization_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id","organization_id"]
    },{
      foreignKeyName: "projects_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"roof_model_revisions": {
                  Row: {
                    "created_at": string,"created_by": string | null,"id": string,"input_data": NonNullable<Json>,"organization_id": string,"revision_number": number,"roof_model_id": string,"schema_version": string,"validation_status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"input_data"?: NonNullable<Json>,"organization_id": string,"revision_number": number,"roof_model_id": string,"schema_version": string,"validation_status"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"input_data"?: NonNullable<Json>,"organization_id"?: string,"revision_number"?: number,"roof_model_id"?: string,"schema_version"?: string,"validation_status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "roof_model_revisions_model_same_organization_fk"
      columns: ["roof_model_id","organization_id"]
isOneToOne: false
      referencedRelation: "roof_models"
      referencedColumns: ["id","organization_id"]
    }
                  ]
                },"roof_models": {
                  Row: {
                    "created_at": string,"current_revision_id": string | null,"id": string,"name": string,"organization_id": string,"project_id": string,"roof_type": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"current_revision_id"?: string | null,"id"?: string,"name": string,"organization_id": string,"project_id": string,"roof_type": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"current_revision_id"?: string | null,"id"?: string,"name"?: string,"organization_id"?: string,"project_id"?: string,"roof_type"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "roof_models_current_revision_fk"
      columns: ["current_revision_id","id"]
isOneToOne: false
      referencedRelation: "roof_model_revisions"
      referencedColumns: ["id","roof_model_id"]
    },{
      foreignKeyName: "roof_models_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "roof_models_project_same_organization_fk"
      columns: ["project_id","organization_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id","organization_id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "save_gable_roof_calculation":
{ Args: { "p_data_provenance": Json,"p_expected_revision_number": number,"p_input_data": Json,"p_name": string,"p_organization_id": string,"p_output_data": Json,"p_project_id": string,"p_roof_model_id": string,"p_warnings": Json }; Returns: {
              "calculation_id": string,"calculation_revision_id": string,"revision_number": number,"roof_model_id": string,"roof_model_revision_id": string
            }[]
                           }
          }
          Enums: {
            "material_category": "roof_covering"|"sheet_metal"|"gutter"|"flashing"|"insulation"|"timber"|"accessory"|"other","material_data_provenance": "verified"|"user_provided"|"estimated"|"demo"|"missing","material_price_kind": "net"|"gross","material_product_status": "active"|"archived","material_purchasing_unit": "piece"|"linear_meter"|"square_meter"|"cubic_meter"|"kilogram"|"package","organization_role": "owner"|"admin"|"member","project_status": "draft"|"in_progress"|"quoted"|"accepted"|"completed"|"archived","project_type": "roof_renovation"|"roof_construction"|"gutter_work"|"other"
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
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "material_category": ["roof_covering", "sheet_metal", "gutter", "flashing", "insulation", "timber", "accessory", "other"],"material_data_provenance": ["verified", "user_provided", "estimated", "demo", "missing"],"material_price_kind": ["net", "gross"],"material_product_status": ["active", "archived"],"material_purchasing_unit": ["piece", "linear_meter", "square_meter", "cubic_meter", "kilogram", "package"],"organization_role": ["owner", "admin", "member"],"project_status": ["draft", "in_progress", "quoted", "accepted", "completed", "archived"],"project_type": ["roof_renovation", "roof_construction", "gutter_work", "other"]
          }
        }
} as const
