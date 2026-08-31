export type FieldType =
  | "text"
  | "textarea"
  | "image"
  | "phone"
  | "email"
  | "url"
  | "address"
  | "social"
  | "date";

export interface FieldDefinition {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  visible?: boolean;
  placeholder?: string;
}

export interface CardFieldSchema {
  fields: FieldDefinition[];
}
