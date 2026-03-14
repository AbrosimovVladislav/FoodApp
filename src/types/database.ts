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
      dish_ingredients: {
        Row: {
          amount_g: number
          dish_id: string
          id: string
          ingredient_id: string
        }
        Insert: {
          amount_g: number
          dish_id: string
          id?: string
          ingredient_id: string
        }
        Update: {
          amount_g?: number
          dish_id?: string
          id?: string
          ingredient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dish_ingredients_dish_id_fkey"
            columns: ["dish_id"]
            isOneToOne: false
            referencedRelation: "dishes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dish_ingredients_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
        ]
      }
      dishes: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          meal_type: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          meal_type: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          meal_type?: string
          name?: string
        }
        Relationships: []
      }
      food_log: {
        Row: {
          created_at: string | null
          custom_note: string | null
          date: string
          dish_id: string | null
          id: string
          total_calories: number
          total_carbs: number
          total_fat: number
          total_protein: number
        }
        Insert: {
          created_at?: string | null
          custom_note?: string | null
          date: string
          dish_id?: string | null
          id?: string
          total_calories?: number
          total_carbs?: number
          total_fat?: number
          total_protein?: number
        }
        Update: {
          created_at?: string | null
          custom_note?: string | null
          date?: string
          dish_id?: string | null
          id?: string
          total_calories?: number
          total_carbs?: number
          total_fat?: number
          total_protein?: number
        }
        Relationships: [
          {
            foreignKeyName: "food_log_dish_id_fkey"
            columns: ["dish_id"]
            isOneToOne: false
            referencedRelation: "dishes"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredients: {
        Row: {
          calories_per_100g: number
          carbs_per_100g: number
          category: string
          created_at: string | null
          fat_per_100g: number
          id: string
          name: string
          protein_per_100g: number
          unit: string
        }
        Insert: {
          calories_per_100g?: number
          carbs_per_100g?: number
          category?: string
          created_at?: string | null
          fat_per_100g?: number
          id?: string
          name: string
          protein_per_100g?: number
          unit?: string
        }
        Update: {
          calories_per_100g?: number
          carbs_per_100g?: number
          category?: string
          created_at?: string | null
          fat_per_100g?: number
          id?: string
          name?: string
          protein_per_100g?: number
          unit?: string
        }
        Relationships: []
      }
      meal_plan: {
        Row: {
          amount_g: number | null
          created_at: string | null
          date: string
          dish_id: string | null
          id: string
          ingredient_id: string | null
          slot: string
        }
        Insert: {
          amount_g?: number | null
          created_at?: string | null
          date: string
          dish_id?: string | null
          id?: string
          ingredient_id?: string | null
          slot?: string
        }
        Update: {
          amount_g?: number | null
          created_at?: string | null
          date?: string
          dish_id?: string | null
          id?: string
          ingredient_id?: string | null
          slot?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_dish_id_fkey"
            columns: ["dish_id"]
            isOneToOne: false
            referencedRelation: "dishes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_plan_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
        ]
      }
      pantry: {
        Row: {
          amount_g: number
          id: string
          ingredient_id: string
          updated_at: string | null
        }
        Insert: {
          amount_g?: number
          id?: string
          ingredient_id: string
          updated_at?: string | null
        }
        Update: {
          amount_g?: number
          id?: string
          ingredient_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pantry_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: true
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          daily_calorie_limit: number
          daily_protein_goal: number
          id: number
          updated_at: string | null
        }
        Insert: {
          daily_calorie_limit?: number
          daily_protein_goal?: number
          id?: number
          updated_at?: string | null
        }
        Update: {
          daily_calorie_limit?: number
          daily_protein_goal?: number
          id?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      shopping_list: {
        Row: {
          amount_g: number
          created_at: string | null
          id: string
          ingredient_id: string
          purchased: boolean
          week_start_date: string
        }
        Insert: {
          amount_g: number
          created_at?: string | null
          id?: string
          ingredient_id: string
          purchased?: boolean
          week_start_date: string
        }
        Update: {
          amount_g?: number
          created_at?: string | null
          id?: string
          ingredient_id?: string
          purchased?: boolean
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_list_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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

// Convenient row-level type aliases
export type Ingredient = Tables<"ingredients">
export type Dish = Tables<"dishes">
export type DishIngredient = Tables<"dish_ingredients">
export type MealPlan = Tables<"meal_plan">
export type Pantry = Tables<"pantry">
export type ShoppingList = Tables<"shopping_list">
export type FoodLog = Tables<"food_log">
export type Settings = Tables<"settings">
