import {Button, Form, Select, SelectOption, TextField} from '@tryghost/admin-x-design-system';
import {CustomField, useAddCustomField} from '@tryghost/admin-x-framework/api/customFields';
import {useForm, useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useState} from 'react';

const selectOptions: SelectOption[] = [
    {label: 'Link', value: 'url'},
    {label: 'Short Text', value: 'short'},
    {label: 'Long Text', value: 'long'},
    {label: 'Checkbox', value: 'boolean'}
];

const AddCustomField: React.FC<{
    onClose: () => void;
}> = ({
    onClose
}) => {
    const [selectedType, setSelectedType] = useState<string>('short');
    const handleError = useHandleError();
    const {mutateAsync: addCustomField} = useAddCustomField();

    const {formState, updateForm, errors, clearError, handleSave, reset} = useForm({
        initialState: {
            name: '',
            type: 'short',
            enabled: false
        },
        onSave: async () => {
            const newCustomField: CustomField = {
                name: formState.name,
                type: formState.type as 'url' | 'short' | 'long' | 'boolean',
                enabled: true
            };
            await addCustomField(newCustomField);
            onClose();
        },
        onSaveError: handleError,
        onValidate: () => {
            const newErrors: Record<string, string> = {};

            if (!formState.name) {
                newErrors.name = 'Name is required';
            }

            if (!formState.type) {
                newErrors.type = 'Type is required';
            } else if (!['url', 'short', 'long', 'boolean'].includes(formState.type)) {
                newErrors.type = 'Invalid type';
            }

            return newErrors;
        }
    });

    return (
        <Form
            marginBottom
            marginTop
        >
            <TextField
                error={Boolean(errors.name)}
                hint={errors.name}
                title='Label'
                value={formState.name}
                onChange={e => updateForm(state => ({...state, name: e.target.value}))}
                onKeyDown={() => clearError('name')}
            />
            <Select
                options={selectOptions}
                selectedOption={selectOptions.find(option => option.value === selectedType)}
                title='Type'
                onSelect={(option) => {
                    const type = option?.value as 'url' | 'short' | 'long' | 'boolean';
                    updateForm(state => ({...state, type}));
                    setSelectedType(type);
                }}
            />

            <div className='flex justify-end'>
                <Button
                    className='mr-2'
                    label='Cancel'
                    size='sm'
                    onClick={() => {
                        reset();
                        onClose();
                    }}
                />
                <Button
                    className='mr-2'
                    color='green'
                    label='Save'
                    size='sm'
                    onClick={async () => await handleSave()}
                />
            </div>
        </Form>
    );
};

export default AddCustomField;
