import { deleteTemplate, listTemplates as list, uploadTemplate as upload, type Template } from "@/core/util/templates";

export type MenuTemplate = Template;

const KIND = "menus";

export const listTemplates = (): Promise<MenuTemplate[]> => list(KIND);
export const uploadTemplate = (dataUrl: string): Promise<MenuTemplate> => upload(KIND, dataUrl);
export { deleteTemplate };
