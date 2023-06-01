import {Setting, SiteData, User, UserRole} from '../types/api';
import {getGhostPaths} from './helpers';

interface Meta {
    pagination: {
        page: number;
        limit: number;
        pages: number;
        total: number;
        next: number;
        prev: number;
    }
}

export interface SettingsResponseType {
    meta: Meta;
    settings: Setting[];
}

export interface UsersResponseType {
    meta?: Meta;
    users: User[];
}

export interface RolesResponseType {
    meta?: Meta;
    roles: UserRole[];
}

export interface SiteResponseType {
    site: SiteData;
}

export interface ImagesResponseType {
    images: {
        url: string;
        ref: string;
    }[];
}

interface RequestOptions {
    method?: string;
    body?: string | FormData;
    headers?: {
        'Content-Type'?: string;
    };
}

interface API {
    settings: {
        browse: () => Promise<SettingsResponseType>;
        edit: (newSettings: Setting[]) => Promise<SettingsResponseType>;
    };
    users: {
        browse: () => Promise<UsersResponseType>;
        currentUser: () => Promise<User>;
        edit: (editedUser: User) => Promise<UsersResponseType>;
    };
    roles: {
        browse: () => Promise<RolesResponseType>;
    };
    site: {
        browse: () => Promise<SiteResponseType>;
    };
    images: {
        upload: ({file}: {file: File}) => Promise<ImagesResponseType>;
    };
}

interface GhostApiOptions {
    ghostVersion: string;
}

function setupGhostApi({ghostVersion}: GhostApiOptions): API {
    const {apiRoot} = getGhostPaths();

    function fetcher(url: string, options: RequestOptions) {
        const endpoint = `${apiRoot}${url}`;
        // By default, we set the Content-Type header to application/json
        const defaultHeaders = {
            'app-pragma': 'no-cache',
            'x-ghost-version': ghostVersion
        };
        const headers = options?.headers || {
            'Content-Type': 'application/json'
        };
        return fetch(endpoint, {
            headers: {
                ...defaultHeaders,
                ...headers
            },
            method: 'GET',
            mode: 'cors',
            credentials: 'include',
            ...options
        });
    }

    const api: API = {
        settings: {
            browse: async () => {
                const queryString = `group=site,theme,private,members,portal,newsletter,email,amp,labs,slack,unsplash,views,firstpromoter,editor,comments,analytics,announcement,pintura`;

                const response = await fetcher(`/settings/?${queryString}`, {});

                const data: SettingsResponseType = await response.json();
                return data;
            },
            edit: async (newSettings: Setting[]) => {
                const payload = JSON.stringify({
                    settings: newSettings
                });

                const response = await fetcher(`/settings/`, {
                    method: 'PUT',
                    body: payload
                });

                const data: SettingsResponseType = await response.json();
                return data;
            }
        },
        users: {
            browse: async () => {
                const response = await fetcher(`/users/?limit=all&include=roles`, {});
                const data: UsersResponseType = await response.json();
                return data;
            },
            currentUser: async (): Promise<User> => {
                const response = await fetcher(`/users/me/`, {});
                const data: UsersResponseType = await response.json();
                return data.users[0];
            },
            edit: async (editedUser: User) => {
                const payload = JSON.stringify({
                    users: [editedUser]
                });

                const response = await fetcher(`/users/${editedUser.id}/?include=roles`, {
                    method: 'PUT',
                    body: payload
                });

                const data: UsersResponseType = await response.json();
                return data;
            }
        },
        roles: {
            browse: async () => {
                const response = await fetcher(`/roles/?limit=all`, {});
                const data: RolesResponseType = await response.json();
                return data;
            }
        },
        site: {
            browse: async () => {
                const response = await fetcher(`/site/`, {});
                const data: any = await response.json();
                return data;
            }
        },
        images: {
            upload: async ({file}: {file: File}) => {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('purpose', 'image');

                const response = await fetcher(`/images/upload/`, {
                    method: 'POST',
                    body: formData,
                    headers: {}
                });
                const data: any = await response.json();
                return data;
            }
        }
    };

    return api;
}

export default setupGhostApi;
