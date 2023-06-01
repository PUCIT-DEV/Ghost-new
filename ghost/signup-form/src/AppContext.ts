// Ref: https://reactjs.org/docs/context.html
import React, {ComponentProps, useContext} from 'react';
import pages, {Page, PageName} from './pages';
import {GhostApi} from './utils/api';

export type SignupFormOptions = {
    title?: string,
    description?: string,
    logo?: string,
    backgroundColor?: string,
    buttonColor?: string,
    site: string,
    labels: string[],
};

export type AppContextType = {
    page: Page,
    setPage: <T extends PageName>(name: T, data: ComponentProps<typeof pages[T]>) => void,
    options: SignupFormOptions,
    api: GhostApi,
    scriptTag: HTMLElement
}

const AppContext = React.createContext<AppContextType>({} as any);

export const AppContextProvider = AppContext.Provider;

export const useAppContext = () => useContext(AppContext);
