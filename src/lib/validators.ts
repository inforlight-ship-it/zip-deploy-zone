import { z } from "zod";

/**
 * Zod schemas for critical form inputs — server-ready validation.
 */

// CPF format: 000.000.000-00 or 00000000000
const cpfRegex = /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/;

export const dsarRequestSchema = z.object({
  name: z.string().trim().min(2, "Nome deve ter ao menos 2 caracteres").max(200, "Nome muito longo"),
  email: z.string().trim().email("E-mail inválido").max(255, "E-mail muito longo"),
  cpf: z.string().trim().regex(cpfRegex, "CPF inválido (formato: 000.000.000-00)"),
  right_type: z.enum(["access", "correction", "deletion", "portability", "opposition", "revoke", "info", "other"], {
    required_error: "Selecione o tipo de solicitação",
  }),
  details: z.string().trim().min(10, "Descreva com mais detalhes (mínimo 10 caracteres)").max(2000, "Texto muito longo (máximo 2000 caracteres)"),
});

export const loginSchema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(6, "Senha deve ter ao menos 6 caracteres").max(128, "Senha muito longa"),
});

export const signUpSchema = z.object({
  fullName: z.string().trim().min(2, "Nome deve ter ao menos 2 caracteres").max(200),
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(8, "Senha deve ter ao menos 8 caracteres").max(128),
});

export type DsarRequestInput = z.infer<typeof dsarRequestSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
