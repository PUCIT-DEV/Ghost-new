import {InfiniteData} from '@tanstack/react-query';
import {Meta, createInfiniteQuery, createMutation} from '../utils/api/hooks';

// Types

type CustomFieldType = {
    name: 'url';
} | {
    name: 'short';
} | {
    name: 'long';
} | {
    name: 'boolean';
} | {
    name: 'select';
    values: string[];
};

export type CustomField = {
    id: string;
    name: string;
    icon: URL | null;
    type: CustomFieldType;
    enabled: boolean;
    created_at: string;
    updated_at: string;
}

export interface CustomFieldResponseType {
    meta?: Meta;
    customFields: CustomField[];
}

export interface CustomFieldEditResponseType extends CustomFieldResponseType {
}

export interface CustomFieldDeleteResponseType {}

// Requests

const dataType = 'CustomFieldResponseType';

export const useBrowseCustomFields = createInfiniteQuery<CustomFieldResponseType>({
    dataType,
    path: '/custom_fields/',
    returnData: (originalData) => {
        const {pages} = originalData as InfiniteData<CustomFieldResponseType>;
        let customFields = pages.flatMap(page => page.customFields);

        // Remove duplicates
        customFields = customFields.filter((customField, index) => {
            return customFields.findIndex(({id}) => id === customField.id) === index;
        });

        return {
            customFields,
            meta: pages[pages.length - 1].meta
        };
    }
});

export const useDeleteCustomField = createMutation<CustomFieldDeleteResponseType, CustomField>({
    method: 'DELETE',
    path: customField => `/custom_field/${customField.id}/`,

    invalidateQueries: {
        dataType
    }
});

export const useEditCustomField = createMutation<CustomFieldEditResponseType, Partial<CustomField> & {id: string}>({
    method: 'PUT',
    path: customField => `/custom_field/${customField.id}/`,
    body: customField => ({custom_field: [customField]}),

    invalidateQueries: {
        dataType
    }
});

export const useAddCustomField = createMutation<CustomFieldResponseType, Partial<CustomField>>({
    method: 'POST',
    path: () => '/custom_field/',
    body: ({...customField}) => ({custom_field: [customField]}),

    invalidateQueries: {
        dataType
    }
});
