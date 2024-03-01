import NiceModal from '@ebay/nice-modal-react';
import {CustomField} from '@tryghost/admin-x-framework/api/customFields';
import {Modal, showToast} from '@tryghost/admin-x-design-system';
import {SocialLink} from '@tryghost/admin-x-framework/api/socialLinks';
import {useBrowseCustomFields} from '@tryghost/admin-x-framework/api/customFields';
import {useBrowseSocialLinks} from '@tryghost/admin-x-framework/api/socialLinks';
import {useEffect, useRef, useState} from 'react';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useRouting} from '@tryghost/admin-x-framework/routing';

const UserSettingsModal = NiceModal.create(() => {
    const modal = NiceModal.useModal();
    const customFieldsQuery = useBrowseCustomFields();
    const socialLinksQuery = useBrowseSocialLinks();

    const {updateRoute} = useRouting();

    const focusRef = useRef<HTMLInputElement>(null);
    const [saveState, setSaveState] = useState<'saving' | 'saved' | 'error' | ''>('');
    // const [errors, setErrors] = useState<{
    //     email?: string;
    //     role?: string;
    // }>({});

    const handleError = useHandleError();

    useEffect(() => {
        if (focusRef.current) {
            focusRef.current.focus();
        }
    }, []);

    useEffect(() => {
        if (saveState === 'saved') {
            setTimeout(() => {
                setSaveState('');
            }, 2000);
        }
    }, [saveState]);

    if (!customFieldsQuery.data?.fields) {
        return null;
    }

    if (!socialLinksQuery.data?.fields) {
        return null;
    }

    let okLabel = 'Save';
    if (saveState === 'saving') {
        okLabel = 'Sending...';
    } else if (saveState === 'saved') {
        okLabel = 'Saved';
    } else if (saveState === 'error') {
        okLabel = 'Retry';
    }

    const handleSaveSettings = async () => {
        if (saveState === 'saving') {
            return;
        }

        setSaveState('saving');
        try {
            // Do shit

            setSaveState('saved');

            showToast({
                message: `Settings saved succesfully`,
                type: 'success'
            });

            modal.remove();
            updateRoute('staff');
        } catch (e) {
            setSaveState('error');

            showToast({
                message: `Failed to save settings`,
                type: 'error'
            });
            handleError(e, {withToast: false});
            return;
        }
    };

    return (
        <Modal
            afterClose={() => {
                updateRoute('staff');
            }}
            cancelLabel=''
            okLabel={okLabel}
            testId='user-settings-modal'
            title='Staff settings'
            width={540}
            onOk={handleSaveSettings}
        >
            <div className='flex flex-col gap-6 py-4'>
                <h2>Social Links</h2>
                {socialLinksQuery.data.fields.map((field: SocialLink) => {
                    return (
                        <>
                            {field.icon && <img alt={field.name} src={field.icon.href} />}
                            <p>Field Name: {field.name}</p>
                            <p>Field Placeholder: {field.placeholder}</p>
                        </>
                    );
                })}
                <h2>Custom Fields</h2>
                {customFieldsQuery.data.fields.map((field: CustomField) => {
                    return (
                        <>
                            <p>Field Name: {field.name}</p>
                            <p>Field Type: {field.type}</p>
                        </>
                    );
                })}
            </div>
        </Modal>
    );
});

export default UserSettingsModal;
