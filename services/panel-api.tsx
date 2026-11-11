import { createContext, useContext } from 'react';
import { adminRequest, shareInvoice } from './admin';

// Production remains the default. Only the explicit demo subtree overrides these operations.
export const PanelApiContext = createContext({ adminRequest, shareInvoice });
export const usePanelApi = () => useContext(PanelApiContext);
