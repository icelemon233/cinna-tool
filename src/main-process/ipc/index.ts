import type { IpcContext } from '../types';
import { registerAppHandlers } from './appHandlers';
import { registerClaudeCodeHandlers } from './claudeCodeHandlers';
import { registerDocumentHandlers } from './documentHandlers';
import { registerFilePickerHandlers } from './filePickerHandlers';
import { registerStoreHandlers } from './storeHandlers';
import { registerWindowHandlers } from './windowHandlers';

export function registerIpcHandlers(context: IpcContext): void {
  registerWindowHandlers(context);
  registerStoreHandlers();
  registerAppHandlers();
  registerFilePickerHandlers(context);
  registerDocumentHandlers();
  registerClaudeCodeHandlers(context);
}
