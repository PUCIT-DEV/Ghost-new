import {createMutation, createQuery} from '../utils/apiRequests';

// Types

export type Theme = {
    active: boolean;
    name: string;
    package: {
        name?: string;
        description?: string;
        version?: string;
    };
    templates?: string[];
}

export type InstalledTheme = Theme & {
    errors?: ThemeProblem<'error'>[];
    warnings?: ThemeProblem<'warning'>[];
}

export type ThemeProblem<Level extends string = 'error' | 'warning'> = {
    code: string
    details: string
    failures: Array<{
        ref: string
        message?: string
        rule?: string
    }>
    fatal: boolean
    level: Level
    rule: string
}

export interface ThemesResponseType {
    themes: Theme[];
}

export interface ThemesInstallResponseType {
    themes: InstalledTheme[];
}

// Requests

const dataType = 'ThemesResponseType';

export const useBrowseThemes = createQuery<ThemesResponseType>({
    dataType,
    path: '/themes/'
});

export const useActivateTheme = createMutation<ThemesResponseType, string>({
    method: 'PUT',
    path: name => `/themes/${name}/activate/`,
    updateQueries: {
        dataType,
        update: (newData: ThemesResponseType, currentData: unknown) => ({
            ...(currentData as ThemesResponseType),
            themes: (currentData as ThemesResponseType).themes.map((theme) => {
                const newTheme = newData.themes.find(({name}) => name === theme.name);

                if (newTheme) {
                    return newTheme;
                } else {
                    return {...theme, active: false};
                }
            })
        })
    }
});

export const useDeleteTheme = createMutation<unknown, string>({
    method: 'DELETE',
    path: name => `/themes/${name}/`,
    updateQueries: {
        dataType,
        update: (_, currentData, name) => ({
            ...(currentData as ThemesResponseType),
            themes: (currentData as ThemesResponseType).themes.filter(theme => theme.name !== name)
        })
    }
});

export const useInstallTheme = createMutation<ThemesInstallResponseType, string>({
    method: 'POST',
    path: () => '/themes/install/',
    searchParams: repo => ({source: 'github', ref: repo}),
    updateQueries: {
        dataType,
        // Assume that all invite queries should include this new one
        update: (newData, currentData) => ({
            ...(currentData as ThemesResponseType),
            themes: [
                ...((currentData as ThemesResponseType).themes),
                ...newData.themes
            ]
        })
    }
});

export const useUploadTheme = createMutation<ThemesInstallResponseType, {file: File}>({
    method: 'POST',
    path: () => '/themes/upload/',
    body: ({file}) => {
        const formData = new FormData();
        formData.append('file', file);
        return formData;
    },
    updateQueries: {
        dataType,
        // Assume that all invite queries should include this new one
        update: (newData, currentData) => ({
            ...(currentData as ThemesResponseType),
            themes: [
                ...((currentData as ThemesResponseType).themes),
                ...newData.themes
            ]
        })
    }
});

// Helpers

export function isActiveTheme(theme: Theme): boolean {
    return theme.active;
}

export function isDefaultTheme(theme: Theme): boolean {
    return theme.name === 'casper';
}

export function isDeletableTheme(theme: Theme): boolean {
    return !isDefaultTheme(theme) && !isActiveTheme(theme);
}
