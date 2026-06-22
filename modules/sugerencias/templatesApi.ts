import { deleteTemplate, listTemplates as list, uploadTemplate as upload, type Template } from "@/core/util/templates";

export type SuggestionTemplate = Template;

const KIND = "sugerencias";

export const listTemplates = (): Promise<SuggestionTemplate[]> => list(KIND);
export const uploadTemplate = (dataUrl: string): Promise<SuggestionTemplate> => upload(KIND, dataUrl);
export { deleteTemplate };
