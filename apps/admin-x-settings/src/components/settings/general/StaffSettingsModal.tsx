import AddCustomField from './AddCustomField';
import CustomFieldToggle from './CustomFieldToggle';
import NiceModal from '@ebay/nice-modal-react';
import {CustomField} from '@tryghost/admin-x-framework/api/customFields';
import {Icon, Modal, showToast} from '@tryghost/admin-x-design-system';
import {SocialLink} from '@tryghost/admin-x-framework/api/socialLinks';
import {useAddSocialLink, useBrowseSocialLinks, useEditSocialLink} from '@tryghost/admin-x-framework/api/socialLinks';
import {useBrowseCustomFields, useEditCustomField} from '@tryghost/admin-x-framework/api/customFields';

import {useEffect, useRef, useState} from 'react';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useRouting} from '@tryghost/admin-x-framework/routing';

const StaffSettingsModal = NiceModal.create(() => {
    const modal = NiceModal.useModal();
    const customFieldsQuery = useBrowseCustomFields();
    const socialLinksQuery = useBrowseSocialLinks();
    const {mutateAsync: addSocialLink} = useAddSocialLink();
    const {mutateAsync: editCustomField} = useEditCustomField();
    const {mutateAsync: editSocialLink} = useEditSocialLink();

    const {updateRoute} = useRouting();

    const focusRef = useRef<HTMLInputElement>(null);
    const [showAddCustomField, setShowAddCustomField] = useState(false);
    const [saveState, setSaveState] = useState<'saving' | 'saved' | 'error' | ''>('');
    const [socialLinks, setSocialLinks] = useState<SocialLink[]>(socialLinksQuery.data?.fields || []);
    const [customFields, setCustomFields] = useState<CustomField[]>(customFieldsQuery.data?.fields || []);
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

    useEffect(() => {
        if (socialLinksQuery.data?.fields) {
            setSocialLinks(socialLinksQuery.data.fields);
        }
        if (customFieldsQuery.data?.fields) {
            setCustomFields(customFieldsQuery.data.fields);
        }
    }, [socialLinksQuery.data, customFieldsQuery.data]);

    if (!customFieldsQuery.data?.fields) {
        return null;
    }

    if (!socialLinksQuery.data?.fields) {
        return null;
    }

    const handleEnableField = ({id, enabled}: {id: string, enabled: boolean}) => {
        const _socialLinks = [...socialLinks];
        const _customFields = [...customFields];
        const socialLinkIndex = _socialLinks.findIndex(field => field.id === id);
        const customFieldIndex = _customFields.findIndex(field => field.id === id);

        if (customFieldIndex !== -1) {
            _customFields[customFieldIndex].enabled = enabled;
        } else if (socialLinkIndex !== -1) {
            _socialLinks[socialLinkIndex].enabled = enabled;
        }

        setSocialLinks(_socialLinks);
        setCustomFields(_customFields);
    };

    const handleSaveSettings = async () => {
        if (saveState === 'saving') {
            return;
        }

        setSaveState('saving');
        try {
            // Do shit
            await editCustomField(customFields);
            await editSocialLink(socialLinks);

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
            cancelLabel='Cancel'
            okLabel='Save'
            testId='user-settings-modal'
            title='Staff settings'
            width={540}
            onOk={handleSaveSettings}
        >
            <div className='flex flex-col py-4'>
                <CustomFieldToggle
                    enabled={true}
                    isFirst={true}
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
                <h3 className='pb-4'>Social Links</h3>
                {socialLinks?.map((field: SocialLink, i: number) => {
                    return (
                        <CustomFieldToggle
                            enabled={field.enabled}
                            handleChange={handleEnableField}
                            icon={field.icon}
                            id={field.id}
                            isFirst={i === 0}
                            name={field.name}
                            placeholder={field.placeholder}
                            type='url'
                        />
                    );
                })}

                <div className='flex items-center'>
                    <div className='mr-1 flex min-h-11 min-w-11 items-center justify-center rounded bg-grey-150'>
                        <Icon colorClass='text-black' name='hyperlink-circle' size='sm' />
                    </div>
                    <div
                        className='flex min-h-11 w-full items-center justify-between rounded bg-grey-150 px-1'
                        onClick={async () => {
                            await addSocialLink({
                                name: 'New social link',
                                icon: new URL('https://static.cdninstagram.com/rsrc.php/v3/yX/r/7RzDLDb3SrS.png'),
                                placeholder: 'new social link placeholder'
                            });
                        }}
                    >
                        <p>Add new social network field</p>
                        <p className='text-md font-bold' onClick={() => {}}>+</p>
                    </div>
                </div>

            </div>
            <div className='flex flex-col py-4'>
                <h3 className='pb-4'>Custom Fields</h3>
                {customFields?.map((field: CustomField, i: number) => {
                    return (
                        <CustomFieldToggle
                            enabled={field.enabled}
                            handleChange={handleEnableField}
                            id={field.id}
                            isFirst={i === 0}
                            name={field.name}
                            type={field.type}
                        />
                    );
                })}

                {showAddCustomField ?
                    <AddCustomField onClose={() => setShowAddCustomField(false)} />
                    :
                    <div className='flex items-center'>
                        <div className='mr-1 flex min-h-11 min-w-11 items-center justify-center rounded bg-grey-150'>
                            <p className='black font-semibold'>Aa</p>
                        </div>
                        <div
                            className='flex min-h-11 w-full items-center justify-between rounded bg-grey-150 px-1'
                            onClick={() => setShowAddCustomField(true)}
                        >
                            <p>Add new profile field</p>
                            <p className='text-md font-bold'>+</p>
                        </div>
                    </div>
                }
            </div>
        </Modal>
    );
});

export default StaffSettingsModal;
