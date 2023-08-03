import Form from '../../../../admin-x-ds/global/form/Form';
import Modal from '../../../../admin-x-ds/global/modal/Modal';
import NewsletterDetailModal from './NewsletterDetailModal';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React from 'react';
import TextArea from '../../../../admin-x-ds/global/form/TextArea';
import TextField from '../../../../admin-x-ds/global/form/TextField';
import Toggle from '../../../../admin-x-ds/global/form/Toggle';
import useForm from '../../../../hooks/useForm';
import useRouting from '../../../../hooks/useRouting';
import {showToast} from '../../../../admin-x-ds/global/Toast';
import {toast} from 'react-hot-toast';
import {useAddNewsletter} from '../../../../utils/api/newsletters';

interface AddNewsletterModalProps {}

const AddNewsletterModal: React.FC<AddNewsletterModalProps> = () => {
    const modal = useModal();
    const {updateRoute} = useRouting();

    const {mutateAsync: addNewsletter} = useAddNewsletter();
    const {formState, updateForm, handleSave, errors, validate, clearError} = useForm({
        initialState: {
            name: '',
            description: '',
            optInExistingSubscribers: true
        },
        onSave: async () => {
            const response = await addNewsletter({
                name: formState.name,
                description: formState.description,
                opt_in_existing: formState.optInExistingSubscribers
            });

            NiceModal.show(NewsletterDetailModal, {
                newsletter: response.newsletters[0]
            });
        },
        onValidate: () => {
            const newErrors: Record<string, string> = {};

            if (!formState.name) {
                newErrors.name = 'Please enter a name';
            }

            return newErrors;
        }
    });

    return <Modal
        afterClose={() => {
            updateRoute('newsletters');
        }}
        okColor='black'
        okLabel='Create'
        size='sm'
        testId='add-newsletter-modal'
        title='Create newsletter'
        onOk={async () => {
            toast.remove();
            if (await handleSave()) {
                modal.remove();
                updateRoute('newsletters');
            } else {
                showToast({
                    type: 'pageError',
                    message: 'Can\'t save newsletter! One or more fields have errors, please doublecheck you filled all mandatory fields'
                });
            }
        }}
    >
        <Form
            marginBottom={false}
            marginTop
        >
            <TextField
                error={Boolean(errors.name)}
                hint={errors.name}
                placeholder='Weekly roundup'
                title='Name'
                value={formState.name}
                onBlur={validate}
                onChange={e => updateForm(state => ({...state, name: e.target.value}))}
                onKeyDown={() => clearError('name')}
            />
            <TextArea
                title='Description'
                value={formState.description}
                onChange={e => updateForm(state => ({...state, description: e.target.value}))}
            />
            <Toggle
                checked={formState.optInExistingSubscribers}
                direction='rtl'
                hint='This newsletter will be available to all members. Your 1 existing subscriber will also be opted-in to receive it.'
                label='Opt-in existing subscribers'
                labelStyle='heading'
                onChange={e => updateForm(state => ({...state, optInExistingSubscribers: e.target.checked}))}
            />
        </Form>
    </Modal>;
};

export default NiceModal.create(AddNewsletterModal);
