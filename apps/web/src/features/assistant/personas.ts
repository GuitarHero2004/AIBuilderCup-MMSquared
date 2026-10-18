export const agentPersonas = {
  coordinator: { name: 'Luma', role: 'Workspace assistant', description: 'Helps you find the right case, navigate the platform and understand saved sourcing records.' },
  quotation_specialist: { name: 'Quill', role: 'Quotation specialist', description: 'Explains saved quotation evidence, identifies missing information and drafts supplier clarification questions.' },
  sourcing_specialist: { name: 'Sage', role: 'Sourcing specialist', description: 'Explains checked cost and delivery comparisons and the trade-offs in your saved buyer selection.' },
} as const;
export type AgentPersona = keyof typeof agentPersonas;
