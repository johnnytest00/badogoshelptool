
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
            "calculation_project_associations": {
                  Row: { "calculator_type": string,"created_at": string,"created_by": string,"id": string,"operation_id": string,"organization_id": string,"project_calculation_id": string,"project_id": string,"project_revision_id": string,"request_payload": NonNullable<Json>,"source_calculation_id": string,"source_creator_id": string,"source_revision_id": string,"source_revision_snapshot": NonNullable<Json> }
                  Insert: { "calculator_type": string,"created_at"?: string,"created_by": string,"id"?: string,"operation_id": string,"organization_id": string,"project_calculation_id": string,"project_id": string,"project_revision_id": string,"request_payload": NonNullable<Json>,"source_calculation_id": string,"source_creator_id": string,"source_revision_id": string,"source_revision_snapshot": NonNullable<Json> }
                  Update: { "calculator_type"?: string,"created_at"?: string,"created_by"?: string,"id"?: string,"operation_id"?: string,"organization_id"?: string,"project_calculation_id"?: string,"project_id"?: string,"project_revision_id"?: string,"request_payload"?: NonNullable<Json>,"source_calculation_id"?: string,"source_creator_id"?: string,"source_revision_id"?: string,"source_revision_snapshot"?: NonNullable<Json> }
                  Relationships: [
                    {
      foreignKeyName: "calculation_project_associations_project_fk"
      columns: ["project_id","organization_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id","organization_id"]
    },{
      foreignKeyName: "calculation_project_associations_source_fk"
      columns: ["source_calculation_id","organization_id"]
isOneToOne: false
      referencedRelation: "calculations"
      referencedColumns: ["id","organization_id"]
    },{
      foreignKeyName: "calculation_project_associations_source_revision_fk"
      columns: ["source_revision_id","source_calculation_id"]
isOneToOne: false
      referencedRelation: "calculation_revisions"
      referencedColumns: ["id","calculation_id"]
    },{
      foreignKeyName: "calculation_project_associations_target_fk"
      columns: ["project_calculation_id","organization_id"]
isOneToOne: false
      referencedRelation: "calculations"
      referencedColumns: ["id","organization_id"]
    },{
      foreignKeyName: "calculation_project_associations_target_revision_fk"
      columns: ["project_revision_id","project_calculation_id"]
isOneToOne: false
      referencedRelation: "calculation_revisions"
      referencedColumns: ["id","calculation_id"]
    }
                  ]
                },
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
                    "calculation_id": string,"calculator_implementation_version": string,"created_at": string,"created_by": string | null,"data_provenance": NonNullable<Json>,"id": string,"input_schema_version": string,"input_snapshot": NonNullable<Json>,"material_variant_id": string | null,"organization_id": string,"output_snapshot": NonNullable<Json>,"revision_number": number,"validation_status": string,"warnings": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "calculation_id": string,"calculator_implementation_version": string,"created_at"?: string,"created_by"?: string | null,"data_provenance"?: NonNullable<Json>,"id"?: string,"input_schema_version": string,"input_snapshot"?: NonNullable<Json>,"material_variant_id"?: string | null,"organization_id": string,"output_snapshot"?: NonNullable<Json>,"revision_number": number,"validation_status"?: string,"warnings"?: NonNullable<Json>
                  }
                  Update: {
                    "calculation_id"?: string,"calculator_implementation_version"?: string,"created_at"?: string,"created_by"?: string | null,"data_provenance"?: NonNullable<Json>,"id"?: string,"input_schema_version"?: string,"input_snapshot"?: NonNullable<Json>,"material_variant_id"?: string | null,"organization_id"?: string,"output_snapshot"?: NonNullable<Json>,"revision_number"?: number,"validation_status"?: string,"warnings"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "calculation_revisions_calculation_same_organization_fk"
      columns: ["calculation_id","organization_id"]
isOneToOne: false
      referencedRelation: "calculations"
      referencedColumns: ["id","organization_id"]
    },{
      foreignKeyName: "calculation_revisions_material_variant_same_organization_fk"
      columns: ["material_variant_id","organization_id"]
isOneToOne: false
      referencedRelation: "material_variants"
      referencedColumns: ["id","organization_id"]
    }
                  ]
                },"calculations": {
                  Row: {
                    "calculator_type": string,"created_at": string,"created_by": string | null,"current_revision_id": string | null,"display_name": string,"id": string,"organization_id": string,"ownership_scope": string,"project_id": string | null,"roof_model_id": string | null,"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "calculator_type": string,"created_at"?: string,"created_by"?: string | null,"current_revision_id"?: string | null,"display_name": string,"id"?: string,"organization_id": string,"ownership_scope"?: string,"project_id"?: string | null,"roof_model_id"?: string | null,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "calculator_type"?: string,"created_at"?: string,"created_by"?: string | null,"current_revision_id"?: string | null,"display_name"?: string,"id"?: string,"organization_id"?: string,"ownership_scope"?: string,"project_id"?: string | null,"roof_model_id"?: string | null,"status"?: string,"updated_at"?: string
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
                },"execution_journal_entries": {
                  Row: {
                    "category": Database["public"]['Enums']["execution_journal_category"],"content": string,"correction_of_entry_id": string | null,"created_at": string,"created_by": string,"id": string,"next_steps": string | null,"organization_id": string,"plan_id": string,"problems": string | null,"request_key": string,"task_id": string | null,"work_date": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category"?: Database["public"]['Enums']["execution_journal_category"],"content": string,"correction_of_entry_id"?: string | null,"created_at"?: string,"created_by": string,"id"?: string,"next_steps"?: string | null,"organization_id": string,"plan_id": string,"problems"?: string | null,"request_key"?: string,"task_id"?: string | null,"work_date": string
                  }
                  Update: {
                    "category"?: Database["public"]['Enums']["execution_journal_category"],"content"?: string,"correction_of_entry_id"?: string | null,"created_at"?: string,"created_by"?: string,"id"?: string,"next_steps"?: string | null,"organization_id"?: string,"plan_id"?: string,"problems"?: string | null,"request_key"?: string,"task_id"?: string | null,"work_date"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "execution_journal_correction_org_fk"
      columns: ["correction_of_entry_id","organization_id"]
isOneToOne: false
      referencedRelation: "execution_journal_entries"
      referencedColumns: ["id","organization_id"]
    },{
      foreignKeyName: "execution_journal_entries_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "execution_journal_plan_org_fk"
      columns: ["plan_id","organization_id"]
isOneToOne: false
      referencedRelation: "execution_plans"
      referencedColumns: ["id","organization_id"]
    },{
      foreignKeyName: "execution_journal_task_org_fk"
      columns: ["task_id","organization_id"]
isOneToOne: false
      referencedRelation: "execution_tasks"
      referencedColumns: ["id","organization_id"]
    }
                  ]
                },"execution_photos": {
                  Row: {
                    "caption": string | null,"category": string,"display_filename": string,"file_size": number,"id": string,"journal_entry_id": string | null,"mime_type": string,"object_key": string,"organization_id": string,"plan_id": string,"project_id": string,"request_key": string,"task_id": string | null,"uploaded_at": string,"uploaded_by": string
                  }
                  ComputedFields: never
                  Insert: {
                    "caption"?: string | null,"category"?: string,"display_filename": string,"file_size": number,"id"?: string,"journal_entry_id"?: string | null,"mime_type": string,"object_key": string,"organization_id": string,"plan_id": string,"project_id": string,"request_key"?: string,"task_id"?: string | null,"uploaded_at"?: string,"uploaded_by": string
                  }
                  Update: {
                    "caption"?: string | null,"category"?: string,"display_filename"?: string,"file_size"?: number,"id"?: string,"journal_entry_id"?: string | null,"mime_type"?: string,"object_key"?: string,"organization_id"?: string,"plan_id"?: string,"project_id"?: string,"request_key"?: string,"task_id"?: string | null,"uploaded_at"?: string,"uploaded_by"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "execution_photos_journal_org_fk"
      columns: ["journal_entry_id","organization_id"]
isOneToOne: false
      referencedRelation: "execution_journal_entries"
      referencedColumns: ["id","organization_id"]
    },{
      foreignKeyName: "execution_photos_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "execution_photos_plan_org_fk"
      columns: ["plan_id","organization_id"]
isOneToOne: false
      referencedRelation: "execution_plans"
      referencedColumns: ["id","organization_id"]
    },{
      foreignKeyName: "execution_photos_project_org_fk"
      columns: ["project_id","organization_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id","organization_id"]
    },{
      foreignKeyName: "execution_photos_task_org_fk"
      columns: ["task_id","organization_id"]
isOneToOne: false
      referencedRelation: "execution_tasks"
      referencedColumns: ["id","organization_id"]
    }
                  ]
                },"execution_plans": {
                  Row: {
                    "created_at": string,"created_by": string,"description": string | null,"id": string,"organization_id": string,"project_id": string,"request_key": string,"source_quotation_id": string | null,"source_revision_id": string | null,"title": string,"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by": string,"description"?: string | null,"id"?: string,"organization_id": string,"project_id": string,"request_key"?: string,"source_quotation_id"?: string | null,"source_revision_id"?: string | null,"title": string,"updated_at"?: string,"version"?: number
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string,"description"?: string | null,"id"?: string,"organization_id"?: string,"project_id"?: string,"request_key"?: string,"source_quotation_id"?: string | null,"source_revision_id"?: string | null,"title"?: string,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "execution_plans_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "execution_plans_project_org_fk"
      columns: ["project_id","organization_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id","organization_id"]
    }
                  ]
                },"execution_task_events": {
                  Row: {
                    "changed_at": string,"changed_by": string | null,"from_status": Database["public"]['Enums']["execution_task_status"],"id": string,"organization_id": string,"plan_id": string,"task_id": string,"to_status": Database["public"]['Enums']["execution_task_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "changed_at"?: string,"changed_by"?: string | null,"from_status": Database["public"]['Enums']["execution_task_status"],"id"?: string,"organization_id": string,"plan_id": string,"task_id": string,"to_status": Database["public"]['Enums']["execution_task_status"]
                  }
                  Update: {
                    "changed_at"?: string,"changed_by"?: string | null,"from_status"?: Database["public"]['Enums']["execution_task_status"],"id"?: string,"organization_id"?: string,"plan_id"?: string,"task_id"?: string,"to_status"?: Database["public"]['Enums']["execution_task_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "execution_task_events_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "execution_task_events_plan_org_fk"
      columns: ["plan_id","organization_id"]
isOneToOne: false
      referencedRelation: "execution_plans"
      referencedColumns: ["id","organization_id"]
    },{
      foreignKeyName: "execution_task_events_task_org_fk"
      columns: ["task_id","organization_id"]
isOneToOne: false
      referencedRelation: "execution_tasks"
      referencedColumns: ["id","organization_id"]
    }
                  ]
                },"execution_tasks": {
                  Row: {
                    "created_at": string,"created_by": string,"description": string | null,"due_date": string | null,"id": string,"organization_id": string,"plan_id": string,"priority": Database["public"]['Enums']["execution_task_priority"],"request_key": string,"sort_order": number,"status": Database["public"]['Enums']["execution_task_status"],"title": string,"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by": string,"description"?: string | null,"due_date"?: string | null,"id"?: string,"organization_id": string,"plan_id": string,"priority"?: Database["public"]['Enums']["execution_task_priority"],"request_key"?: string,"sort_order"?: number,"status"?: Database["public"]['Enums']["execution_task_status"],"title": string,"updated_at"?: string,"version"?: number
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string,"description"?: string | null,"due_date"?: string | null,"id"?: string,"organization_id"?: string,"plan_id"?: string,"priority"?: Database["public"]['Enums']["execution_task_priority"],"request_key"?: string,"sort_order"?: number,"status"?: Database["public"]['Enums']["execution_task_status"],"title"?: string,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "execution_tasks_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "execution_tasks_plan_org_fk"
      columns: ["plan_id","organization_id"]
isOneToOne: false
      referencedRelation: "execution_plans"
      referencedColumns: ["id","organization_id"]
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
                },"material_takeoff_items": {
                  Row: {
                    "adjustment_reason": string | null,"allowance_percent": number | null,"calculated_quantity": number | null,"created_at": string,"created_by": string | null,"data_provenance": Database["public"]['Enums']["material_data_provenance"],"estimation_method": Database["public"]['Enums']["material_takeoff_method"],"final_quantity": number,"id": string,"material_snapshot": NonNullable<Json>,"measurement_source": string,"organization_id": string,"price_snapshot": Json | null,"quantity_unit": Database["public"]['Enums']["material_purchasing_unit"],"selected_measurement_value": number | null,"takeoff_id": string,"updated_at": string,"variant_id": string,"warnings": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "adjustment_reason"?: string | null,"allowance_percent"?: number | null,"calculated_quantity"?: number | null,"created_at"?: string,"created_by"?: string | null,"data_provenance"?: Database["public"]['Enums']["material_data_provenance"],"estimation_method": Database["public"]['Enums']["material_takeoff_method"],"final_quantity": number,"id"?: string,"material_snapshot"?: NonNullable<Json>,"measurement_source": string,"organization_id": string,"price_snapshot"?: Json | null,"quantity_unit": Database["public"]['Enums']["material_purchasing_unit"],"selected_measurement_value"?: number | null,"takeoff_id": string,"updated_at"?: string,"variant_id": string,"warnings"?: NonNullable<Json>
                  }
                  Update: {
                    "adjustment_reason"?: string | null,"allowance_percent"?: number | null,"calculated_quantity"?: number | null,"created_at"?: string,"created_by"?: string | null,"data_provenance"?: Database["public"]['Enums']["material_data_provenance"],"estimation_method"?: Database["public"]['Enums']["material_takeoff_method"],"final_quantity"?: number,"id"?: string,"material_snapshot"?: NonNullable<Json>,"measurement_source"?: string,"organization_id"?: string,"price_snapshot"?: Json | null,"quantity_unit"?: Database["public"]['Enums']["material_purchasing_unit"],"selected_measurement_value"?: number | null,"takeoff_id"?: string,"updated_at"?: string,"variant_id"?: string,"warnings"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "material_takeoff_items_takeoff_fk"
      columns: ["takeoff_id","organization_id"]
isOneToOne: false
      referencedRelation: "material_takeoffs"
      referencedColumns: ["id","organization_id"]
    },{
      foreignKeyName: "material_takeoff_items_variant_fk"
      columns: ["variant_id","organization_id"]
isOneToOne: false
      referencedRelation: "material_variants"
      referencedColumns: ["id","organization_id"]
    }
                  ]
                },"material_takeoffs": {
                  Row: {
                    "approved_at": string | null,"approved_by": string | null,"created_at": string,"created_by": string | null,"id": string,"name": string,"organization_id": string,"project_id": string,"source_calculation_id": string,"source_calculation_revision_id": string,"source_roof_model_id": string | null,"source_roof_model_revision_id": string | null,"status": Database["public"]['Enums']["material_takeoff_status"],"transfer_payload": Json | null,"transfer_request_key": string | null,"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "approved_at"?: string | null,"approved_by"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"name": string,"organization_id": string,"project_id": string,"source_calculation_id": string,"source_calculation_revision_id": string,"source_roof_model_id"?: string | null,"source_roof_model_revision_id"?: string | null,"status"?: Database["public"]['Enums']["material_takeoff_status"],"transfer_payload"?: Json | null,"transfer_request_key"?: string | null,"updated_at"?: string,"version"?: number
                  }
                  Update: {
                    "approved_at"?: string | null,"approved_by"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"name"?: string,"organization_id"?: string,"project_id"?: string,"source_calculation_id"?: string,"source_calculation_revision_id"?: string,"source_roof_model_id"?: string | null,"source_roof_model_revision_id"?: string | null,"status"?: Database["public"]['Enums']["material_takeoff_status"],"transfer_payload"?: Json | null,"transfer_request_key"?: string | null,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "material_takeoffs_calculation_fk"
      columns: ["source_calculation_id","organization_id"]
isOneToOne: false
      referencedRelation: "calculations"
      referencedColumns: ["id","organization_id"]
    },{
      foreignKeyName: "material_takeoffs_calculation_revision_fk"
      columns: ["source_calculation_revision_id","source_calculation_id"]
isOneToOne: false
      referencedRelation: "calculation_revisions"
      referencedColumns: ["id","calculation_id"]
    },{
      foreignKeyName: "material_takeoffs_project_fk"
      columns: ["project_id","organization_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id","organization_id"]
    },{
      foreignKeyName: "material_takeoffs_roof_model_fk"
      columns: ["source_roof_model_id","organization_id"]
isOneToOne: false
      referencedRelation: "roof_models"
      referencedColumns: ["id","organization_id"]
    },{
      foreignKeyName: "material_takeoffs_roof_revision_fk"
      columns: ["source_roof_model_revision_id","source_roof_model_id"]
isOneToOne: false
      referencedRelation: "roof_model_revisions"
      referencedColumns: ["id","roof_model_id"]
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
                    "business_address": string | null,"business_name": string | null,"contact_email": string | null,"contact_phone": string | null,"created_at": string,"id": string,"name": string,"tax_identifier": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "business_address"?: string | null,"business_name"?: string | null,"contact_email"?: string | null,"contact_phone"?: string | null,"created_at"?: string,"id"?: string,"name": string,"tax_identifier"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "business_address"?: string | null,"business_name"?: string | null,"contact_email"?: string | null,"contact_phone"?: string | null,"created_at"?: string,"id"?: string,"name"?: string,"tax_identifier"?: string | null,"updated_at"?: string
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
                },"quotation_document_sequences": {
                  Row: { "created_at": string,"last_issued_number": number,"organization_id": string,"updated_at": string }
                  ComputedFields: never
                  Insert: { "created_at"?: string,"last_issued_number"?: number,"organization_id": string,"updated_at"?: string }
                  Update: { "created_at"?: string,"last_issued_number"?: number,"organization_id"?: string,"updated_at"?: string }
                  Relationships: [{ foreignKeyName: "quotation_document_sequences_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: true; referencedRelation: "organizations"; referencedColumns: ["id"] }]
                },"quotation_revisions": {
                  Row: {
                    "created_at": string,"created_by": string,"currency": string,"financial_contract": Json | null,"id": string,"input_snapshot": NonNullable<Json>,"line_items_snapshot": NonNullable<Json>,"organization_id": string,"price_class": Database["public"]['Enums']["quotation_price_class"] | null,"quotation_id": string,"revision_number": number,"subtotal": number | null,"totals_snapshot": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by": string,"currency": string,"financial_contract"?: Json | null,"id"?: string,"input_snapshot": NonNullable<Json>,"line_items_snapshot": NonNullable<Json>,"organization_id": string,"price_class"?: Database["public"]['Enums']["quotation_price_class"] | null,"quotation_id": string,"revision_number": number,"subtotal"?: number | null,"totals_snapshot": NonNullable<Json>
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string,"currency"?: string,"financial_contract"?: Json | null,"id"?: string,"input_snapshot"?: NonNullable<Json>,"line_items_snapshot"?: NonNullable<Json>,"organization_id"?: string,"price_class"?: Database["public"]['Enums']["quotation_price_class"] | null,"quotation_id"?: string,"revision_number"?: number,"subtotal"?: number | null,"totals_snapshot"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "quotation_revisions_quotation_id_organization_id_fkey"
      columns: ["quotation_id","organization_id"]
isOneToOne: false
      referencedRelation: "quotations"
      referencedColumns: ["id","organization_id"]
    }
                  ]
                },"quotation_status_events": {
                  Row: {
                    "acted_by": string | null,"event_at": string,"finalized_revision_id": string | null,"from_status": Database["public"]['Enums']["quotation_status"],"id": string,"note": string | null,"organization_id": string,"quotation_id": string,"to_status": Database["public"]['Enums']["quotation_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "acted_by"?: string | null,"event_at"?: string,"finalized_revision_id"?: string | null,"from_status": Database["public"]['Enums']["quotation_status"],"id"?: string,"note"?: string | null,"organization_id": string,"quotation_id": string,"to_status": Database["public"]['Enums']["quotation_status"]
                  }
                  Update: {
                    "acted_by"?: string | null,"event_at"?: string,"finalized_revision_id"?: string | null,"from_status"?: Database["public"]['Enums']["quotation_status"],"id"?: string,"note"?: string | null,"organization_id"?: string,"quotation_id"?: string,"to_status"?: Database["public"]['Enums']["quotation_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "quotation_status_events_finalized_revision_id_organization_fkey"
      columns: ["finalized_revision_id","organization_id"]
isOneToOne: false
      referencedRelation: "quotation_revisions"
      referencedColumns: ["id","organization_id"]
    },{
      foreignKeyName: "quotation_status_events_quotation_id_organization_id_fkey"
      columns: ["quotation_id","organization_id"]
isOneToOne: false
      referencedRelation: "quotations"
      referencedColumns: ["id","organization_id"]
    }
                  ]
                },"quotations": {
                  Row: {
                    "client_id": string | null,"created_at": string,"created_by": string,"currency": string,"current_revision_id": string | null,"finalized_at": string | null,"finalized_by": string | null,"finalized_revision_id": string | null,"id": string,"name": string,"organization_id": string,"ownership_scope": "project" | "standalone","project_id": string | null,"status": Database["public"]['Enums']["quotation_status"],"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "client_id"?: string | null,"created_at"?: string,"created_by": string,"currency"?: string,"current_revision_id"?: string | null,"finalized_at"?: string | null,"finalized_by"?: string | null,"finalized_revision_id"?: string | null,"id"?: string,"name": string,"organization_id": string,"ownership_scope"?: "project" | "standalone","project_id"?: string | null,"status"?: Database["public"]['Enums']["quotation_status"],"updated_at"?: string,"version"?: number
                  }
                  Update: {
                    "client_id"?: string | null,"created_at"?: string,"created_by"?: string,"currency"?: string,"current_revision_id"?: string | null,"finalized_at"?: string | null,"finalized_by"?: string | null,"finalized_revision_id"?: string | null,"id"?: string,"name"?: string,"organization_id"?: string,"ownership_scope"?: "project" | "standalone","project_id"?: string | null,"status"?: Database["public"]['Enums']["quotation_status"],"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "quotations_client_id_organization_id_fkey"
      columns: ["client_id","organization_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id","organization_id"]
    },{
      foreignKeyName: "quotations_current_revision_fk"
      columns: ["current_revision_id","organization_id"]
isOneToOne: false
      referencedRelation: "quotation_revisions"
      referencedColumns: ["id","organization_id"]
    },{
      foreignKeyName: "quotations_finalized_revision_fk"
      columns: ["finalized_revision_id","organization_id"]
isOneToOne: false
      referencedRelation: "quotation_revisions"
      referencedColumns: ["id","organization_id"]
    },{
      foreignKeyName: "quotations_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quotations_project_id_organization_id_fkey"
      columns: ["project_id","organization_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id","organization_id"]
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
            "associate_standalone_calculation_to_project":
{ Args: { "p_expected_project_revision_number": number,"p_input_data": Json,"p_name": string,"p_operation_id": string,"p_organization_id": string,"p_output_data": Json,"p_project_calculation_id": string | null,"p_project_id": string,"p_source_calculation_id": string,"p_source_revision_id": string }; Returns: {
              "association_id": string,
              "project_calculation_id": string,
              "project_revision_id": string,
              "revision_number": number,
              "reused": boolean
            }[]
                           },
            "approve_material_takeoff":
{ Args: { "p_expected_version": number,"p_organization_id": string,"p_takeoff_id": string }; Returns: {
              "approved_at": string | null,
"approved_by": string | null,
"created_at": string,
"created_by": string | null,
"id": string,
"name": string,
"organization_id": string,
"project_id": string,
"source_calculation_id": string,
"source_calculation_revision_id": string,
"source_roof_model_id": string | null,
"source_roof_model_revision_id": string | null,
"status": Database["public"]['Enums']["material_takeoff_status"],
"transfer_payload": Json | null,
"transfer_request_key": string | null,
"updated_at": string,
"version": number
            }
                          SetofOptions: {
        from: "*"
        to: "material_takeoffs"
        isOneToOne: true
        isSetofReturn: false
      } },
"create_execution_journal_entry":
{ Args: { "p_category": Database["public"]['Enums']["execution_journal_category"],"p_content": string,"p_correction_of_entry_id"?: string,"p_next_steps"?: string,"p_organization_id": string,"p_plan_id": string,"p_problems"?: string,"p_request_key"?: string,"p_task_id": string,"p_work_date": string }; Returns: {
              "entry_id": string
            }[]
                           },
"create_execution_photo":
{ Args: { "p_caption": string,"p_display_filename": string,"p_file_size": number,"p_journal_entry_id": string,"p_mime_type": string,"p_object_key": string,"p_organization_id": string,"p_plan_id": string,"p_project_id": string,"p_request_key": string,"p_task_id": string }; Returns: {
              "photo_id": string
            }[]
                           },
"create_execution_plan":
{ Args: { "p_description": string,"p_organization_id": string,"p_project_id": string,"p_request_key"?: string,"p_source_quotation_id"?: string,"p_source_revision_id"?: string,"p_title": string }; Returns: {
              "plan_id": string
            }[]
                           },
"create_flashing_takeoff_draft":
{ Args: { "p_calculation_id": string,"p_mappings": Json,"p_name": string,"p_organization_id": string,"p_project_id": string,"p_request_key": string,"p_revision_id": string }; Returns: {
              "draft_created": boolean,"takeoff_id": string
            }[]
                           },
"create_gutter_takeoff_draft":
{ Args: { "p_calculation_id": string,"p_mappings": Json,"p_name": string,"p_organization_id": string,"p_project_id": string,"p_request_key": string,"p_revision_id": string }; Returns: {
              "draft_created": boolean,"takeoff_id": string
            }[]
                           },
"create_profile_takeoff_draft":
{ Args: { "p_calculation_id": string,"p_name": string,"p_organization_id": string,"p_project_id": string,"p_request_key": string,"p_revision_id": string,"p_variant_id": string }; Returns: {
              "draft_created": boolean,"takeoff_id": string
            }[]
                           },
"create_sheet_layout_takeoff_draft":
{ Args: { "p_allowance_percent": number,"p_layout_calculation_id": string,"p_layout_revision_id": string,"p_name": string,"p_organization_id": string,"p_project_id": string }; Returns: string
                           },
"finalize_quotation":
{ Args: { "p_expected_version": number,"p_organization_id": string,"p_project_id": string,"p_quotation_id": string,"p_revision_id": string }; Returns: {
              "finalized_at": string,"quotation_id": string,"revision_id": string
            }[]
                           },
"save_execution_task":
{ Args: { "p_description": string,"p_due_date": string,"p_expected_version"?: number,"p_organization_id": string,"p_plan_id": string,"p_priority": Database["public"]['Enums']["execution_task_priority"],"p_request_key"?: string,"p_sort_order": number,"p_status": Database["public"]['Enums']["execution_task_status"],"p_task_id": string,"p_title": string }; Returns: {
              "task_id": string,"task_version": number
            }[]
                           },
"save_flashing_material_calculation":
{ Args: { "p_data_provenance": Json,"p_expected_revision_number": number,"p_input_data": Json,"p_name": string,"p_organization_id": string,"p_output_data": Json,"p_project_id": string,"p_warnings": Json }; Returns: {
              "calculation_id": string,"calculation_revision_id": string,"revision_number": number
            }[]
                           },
"save_gable_roof_calculation":
{ Args: { "p_data_provenance": Json,"p_expected_revision_number": number,"p_input_data": Json,"p_name": string,"p_organization_id": string,"p_output_data": Json,"p_project_id": string,"p_roof_model_id": string,"p_warnings": Json }; Returns: {
              "calculation_id": string,"calculation_revision_id": string,"revision_number": number,"roof_model_id": string,"roof_model_revision_id": string
            }[]
                           },
"save_gable_trapezoidal_covering_calculation":
{ Args: { "p_actor_id": string,"p_calculation_id": string,"p_data_provenance": Json,"p_expected_revision_number": number,"p_input_data": Json,"p_name": string,"p_operation_id": string,"p_organization_id": string,"p_output_data": Json,"p_project_id": string | null,"p_roof_model_id": string | null,"p_source_roof_revision_id": string | null }; Returns: {
              "calculation_id": string,"calculation_revision_id": string,"revision_number": number,"reused": boolean
            }[]
                           },
"save_gutter_material_calculation":
{ Args: { "p_data_provenance": Json,"p_expected_revision_number": number,"p_input_data": Json,"p_name": string,"p_organization_id": string,"p_output_data": Json,"p_project_id": string,"p_source_roof_revision_id": string,"p_warnings": Json }; Returns: {
              "calculation_id": string,"calculation_revision_id": string,"revision_number": number
            }[]
                           },
"save_metal_sheet_layout":
{ Args: { "p_data_provenance": Json,"p_display_name": string,"p_expected_revision_number": number,"p_input_data": Json,"p_layout_calculation_id": string,"p_material_variant_id": string,"p_organization_id": string,"p_output_data": Json,"p_project_id": string,"p_roof_model_id": string,"p_source_geometry_calculation_revision_id": string,"p_source_roof_revision_id": string,"p_warnings": Json }; Returns: {
              "calculation_id": string,"calculation_revision_id": string,"revision_created": boolean,"revision_number": number
            }[]
                           },
"save_standalone_quotation_draft_with_document": { Args: { "p_client_id": string | null,"p_document": Json,"p_expected_version": number,"p_lines": Json,"p_name": string,"p_operation_id": string,"p_organization_id": string,"p_quotation_id": string | null }; Returns: { "quotation_id": string,"revision_created": boolean,"revision_id": string,"revision_number": number,"totals_snapshot": Json }[] },
"save_quotation_draft":
{ Args: { "p_client_id": string,"p_currency": string,"p_expected_version": number,"p_input_snapshot": Json,"p_line_items_snapshot": Json,"p_name": string,"p_organization_id": string,"p_project_id": string,"p_quotation_id": string,"p_subtotal": number,"p_totals_snapshot": Json }; Returns: {
              "quotation_id": string,"revision_created": boolean,"revision_id": string,"revision_number": number
            }[]
                           },
"save_sheet_metal_profile_calculation":
{ Args: { "p_calculation_id": string,"p_expected_revision_number": number,"p_input_data": Json,"p_name": string,"p_organization_id": string,"p_project_id": string }; Returns: {
              "calculation_id": string,"calculation_revision_id": string,"revision_number": number
            }[]
                           },
"save_standalone_flashing_calculation":
{ Args: { "p_calculation_id": string,"p_expected_revision_number": number,"p_input_data": Json,"p_name": string,"p_organization_id": string,"p_output_data": Json }; Returns: {
              "calculation_id": string,"calculation_revision_id": string,"revision_number": number
            }[]
                           },
"save_standalone_gutter_calculation":
{ Args: { "p_calculation_id": string,"p_expected_revision_number": number,"p_input_data": Json,"p_name": string,"p_organization_id": string,"p_output_data": Json }; Returns: {
              "calculation_id": string,"calculation_revision_id": string,"revision_number": number
            }[]
                           },
"save_standalone_profile_calculation":
{ Args: { "p_calculation_id": string,"p_expected_revision_number": number,"p_input_data": Json,"p_name": string,"p_organization_id": string,"p_output_data": Json }; Returns: {
              "calculation_id": string,"calculation_revision_id": string,"revision_number": number
            }[]
                           },
"set_execution_photo_category":
{ Args: { "p_category": string,"p_organization_id": string,"p_photo_id": string }; Returns: boolean
                           },
"transition_quotation_status":
{ Args: { "p_expected_version": number,"p_note"?: string,"p_organization_id": string,"p_project_id": string,"p_quotation_id": string,"p_target_status": Database["public"]['Enums']["quotation_status"] }; Returns: {
              "event_id": string,"quotation_id": string,"status": Database["public"]['Enums']["quotation_status"]
            }[]
                           }
          }
          Enums: {
            "execution_journal_category": "general"|"work_done"|"problem"|"next_step","execution_task_priority": "low"|"normal"|"high","execution_task_status": "todo"|"in_progress"|"done","material_category": "roof_covering"|"sheet_metal"|"gutter"|"flashing"|"insulation"|"timber"|"accessory"|"other","material_data_provenance": "verified"|"user_provided"|"estimated"|"demo"|"missing","material_price_kind": "net"|"gross","material_product_status": "active"|"archived","material_purchasing_unit": "piece"|"linear_meter"|"square_meter"|"cubic_meter"|"kilogram"|"package","material_takeoff_method": "area"|"linear"|"manual","material_takeoff_status": "draft"|"approved","organization_role": "owner"|"admin"|"member","project_status": "draft"|"in_progress"|"quoted"|"accepted"|"completed"|"archived","project_type": "roof_renovation"|"roof_construction"|"gutter_work"|"other","quotation_line_type": "MATERIAL"|"LABOR"|"OTHER","quotation_price_class": "net"|"gross","quotation_status": "draft"|"finalized"|"sent"|"accepted"|"rejected"
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
            "execution_journal_category": ["general", "work_done", "problem", "next_step"],"execution_task_priority": ["low", "normal", "high"],"execution_task_status": ["todo", "in_progress", "done"],"material_category": ["roof_covering", "sheet_metal", "gutter", "flashing", "insulation", "timber", "accessory", "other"],"material_data_provenance": ["verified", "user_provided", "estimated", "demo", "missing"],"material_price_kind": ["net", "gross"],"material_product_status": ["active", "archived"],"material_purchasing_unit": ["piece", "linear_meter", "square_meter", "cubic_meter", "kilogram", "package"],"material_takeoff_method": ["area", "linear", "manual"],"material_takeoff_status": ["draft", "approved"],"organization_role": ["owner", "admin", "member"],"project_status": ["draft", "in_progress", "quoted", "accepted", "completed", "archived"],"project_type": ["roof_renovation", "roof_construction", "gutter_work", "other"],"quotation_line_type": ["MATERIAL", "LABOR", "OTHER"],"quotation_price_class": ["net", "gross"],"quotation_status": ["draft", "finalized", "sent", "accepted", "rejected"]
          }
        }
} as const
