import {Meta, createQuery, createMutation} from '../utils/api/hooks';

// Types

export type CustomField = {
    id: string;
    name: string;
    type: 'url' | 'short' | 'long' | 'boolean';
    enabled: boolean;
    created_at: string;
    updated_at: string;
}

export interface CustomFieldResponseType {
    meta?: Meta;
    fields: CustomField[];
}

export interface CustomFieldEditResponseType extends CustomFieldResponseType {
}

export interface CustomFieldDeleteResponseType {}

// Requests

const dataType = 'CustomFieldResponseType';

export const useBrowseCustomFields = createQuery<CustomFieldResponseType>({
    dataType,
    path: '/fields/custom/'
});

export const useDeleteCustomField = createMutation<CustomFieldDeleteResponseType, CustomField>({
    method: 'DELETE',
    path: field => `/fields/custom/${field.id}/`,

    invalidateQueries: {
        dataType
    }
});

export const useEditCustomField = createMutation<CustomFieldEditResponseType, Partial<CustomField>[]>({
    method: 'PUT',
    path: () => `/fields/custom/`,
    body: fields => ({fields}),

    updateQueries: {
        emberUpdateType: 'skip',
        dataType,
        update: newData => newData
    }
});

export const useAddCustomField = createMutation<CustomFieldResponseType, Partial<CustomField>>({
    method: 'POST',
    path: () => '/fields/custom/',
    body: ({...field}) => ({fields: [field]}),

    invalidateQueries: {
        dataType
    }
});
