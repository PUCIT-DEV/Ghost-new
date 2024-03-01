import {InfiniteData} from '@tanstack/react-query';
import {Meta, createInfiniteQuery, createMutation} from '../utils/api/hooks';

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

export const useBrowseSocialLinks = createInfiniteQuery<SocialLinkResponseType>({
    dataType,
    path: '/fields/social/',
    returnData: (originalData) => {
        const {pages} = originalData as InfiniteData<SocialLinkResponseType>;
        let fields = pages.flatMap(page => page.fields);

        // Remove duplicates
        fields = fields.filter((field, index) => {
            return fields.findIndex(({id}) => id === field.id) === index;
        });

        return {
            fields,
            meta: pages[pages.length - 1].meta
        };
    }
});

export const useDeleteSocialLink = createMutation<SocialLinkDeleteResponseType, SocialLink>({
    method: 'DELETE',
    path: field => `/fields/social/${field.id}/`,

    invalidateQueries: {
        dataType
    }
});

export const useEditSocialLink = createMutation<SocialLinkEditResponseType, Partial<SocialLink> & {id: string}>({
    method: 'PUT',
    path: field => `/fields/social/${field.id}/`,
    body: field => ({fields: [field]}),

    invalidateQueries: {
        dataType
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
