import {Meta, createQuery, createMutation} from '../utils/api/hooks';

// Types

export type SocialLink = {
    id: string;
    name: string;
    icon: URL | null;
    placeholder: string | null;
    enabled: boolean;
    created_at: string;
    updated_at: string;
}

export interface SocialLinkResponseType {
    meta?: Meta;
    fields: SocialLink[];
}

export interface SocialLinkEditResponseType extends SocialLinkResponseType {
}

export interface SocialLinkDeleteResponseType {}

// Requests

const dataType = 'SocialLinkResponseType';

export const useBrowseSocialLinks = createQuery<SocialLinkResponseType>({
    dataType,
    path: '/fields/social/'
});

export const useDeleteSocialLink = createMutation<SocialLinkDeleteResponseType, SocialLink>({
    method: 'DELETE',
    path: field => `/fields/social/${field.id}/`,

    invalidateQueries: {
        dataType
    }
});

export const useEditSocialLink = createMutation<SocialLinkEditResponseType, Partial<SocialLink[]>>({
    method: 'PUT',
    path: () => `/fields/social/`,
    body: fields => ({fields}),

    updateQueries: {
        emberUpdateType: 'skip',
        dataType,
        update: newData => newData
    }
});

export const useAddSocialLink = createMutation<SocialLinkResponseType, Partial<SocialLink>>({
    method: 'POST',
    path: () => '/fields/social/',
    body: ({...field}) => ({fields: [field]}),

    invalidateQueries: {
        dataType
    }
});
