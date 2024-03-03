import CustomFieldToggle from './CustomFieldToggle';
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
            okLabel=''
            testId='user-settings-modal'
            title='Staff settings'
            width={540}
            onCancel={handleSaveSettings}
        >
            <div className='flex flex-col py-4'>
                <CustomFieldToggle
                    enabled={true}
                    name="Full name"
                    type="short"
                    toggleDisabled
                />

                <CustomFieldToggle
                    enabled={true}
                    name="Username"
                    type="short"
                    toggleDisabled
                />

                <CustomFieldToggle
                    enabled={true}
                    name="Email address"
                    type="short"
                    toggleDisabled
                />

                <CustomFieldToggle
                    enabled={true}
                    name="Title"
                    type="short"
                />

                <CustomFieldToggle
                    enabled={true}
                    name="Bio"
                    type="long"
                />
            </div>
            <div className='flex flex-col py-4'>
                <h3>Social Links</h3>
                {socialLinksQuery.data.fields.map((field: SocialLink) => {
                    return (
                        <CustomFieldToggle
                            enabled={field.enabled}
                            icon={field?.icon}
                            name={field.name}
                            placeholder={field?.placeholder}
                            type="url"
                        />
                    );
                })}
            </div>
            <div className='flex flex-col py-4'>
                <h3>Custom Fields</h3>
                {customFieldsQuery.data.fields.map((field: CustomField) => {
                    return (
                        <CustomFieldToggle
                            enabled={field.enabled}
                            name={field.name}
                            type={field.type}
                        />
                    );
                })}
            </div>
        </Modal>
    );
});

export default UserSettingsModal;
