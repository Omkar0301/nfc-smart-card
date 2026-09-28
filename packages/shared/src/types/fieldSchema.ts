export type FieldType =
  | 'text'
  | 'long_text'
  | 'image'
  | 'phone'
  | 'email'
  | 'url'
  | 'address'
  | 'list_of_strings'
  | 'select';

export interface FieldSchemaItem {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  defaultVisible: boolean;
  placeholder?: string;
  options?: string[];
  helpText?: string;
}

export type FieldSchema = FieldSchemaItem[];

// Alias for backwards compatibility
export type FieldDefinition = FieldSchemaItem;

export interface CardFieldSchema {
  fields: FieldDefinition[];
}

export interface CardType {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  fieldSchema: FieldSchema;
  status: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  _count?: {
    cards?: number;
  };
}
