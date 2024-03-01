import NiceModal from '@ebay/nice-modal-react';
import {HostLimitError, useLimiter} from '../../../hooks/useLimiter';
import {Modal, Radio, TextField, showToast} from '@tryghost/admin-x-design-system';
import {useBrowseRoles} from '@tryghost/admin-x-framework/api/roles';
import {useEffect, useRef, useState} from 'react';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useRouting} from '@tryghost/admin-x-framework/routing';

type RoleType = 'administrator' | 'editor' | 'author' | 'contributor';

const UserSettingsModal = NiceModal.create(() => {
    const modal = NiceModal.useModal();
    const rolesQuery = useBrowseRoles();
    const assignableRolesQuery = useBrowseRoles({
        searchParams: {limit: 'all', permissions: 'assign'}
    });
    const limiter = useLimiter();

    const {updateRoute} = useRouting();

    const focusRef = useRef<HTMLInputElement>(null);
    const [email, setEmail] = useState<string>('');
    const [saveState, setSaveState] = useState<'saving' | 'saved' | 'error' | ''>('');
    const [role, setRole] = useState<RoleType>('contributor');
    const [errors, setErrors] = useState<{
        email?: string;
        role?: string;
    }>({});

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
        if (role !== 'contributor' && limiter?.isLimited('staff')) {
            limiter.errorIfWouldGoOverLimit('staff').then(() => {
                setErrors(e => ({...e, role: undefined}));
            }).catch((error) => {
                if (error instanceof HostLimitError) {
                    setErrors(e => ({...e, role: error.message}));
                    return;
                } else {
                    throw error;
                }
            });
        } else {
            setErrors(e => ({...e, role: undefined}));
        }
    }, [limiter, role]);

    if (!rolesQuery.data?.roles || !assignableRolesQuery.data?.roles) {
        return null;
    }

    const assignableRoles = assignableRolesQuery.data.roles;

    let okLabel = 'Send invitation now';
    if (saveState === 'saving') {
        okLabel = 'Sending...';
    } else if (saveState === 'saved') {
        okLabel = 'Invite sent!';
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

    const roleOptions = [
        {
            hint: 'Can create and edit their own posts, but cannot publish. An Editor needs to approve and publish for them.',
            label: 'Contributor',
            value: 'contributor'
        },
        {
            hint: 'A trusted user who can create, edit and publish their own posts, but can’t modify others.',
            label: 'Author',
            value: 'author'
        },
        {
            hint: 'Can invite and manage other Authors and Contributors, as well as edit and publish any posts on the site.',
            label: 'Editor',
            value: 'editor'
        },
        {
            hint: 'Trusted staff user who should be able to manage all content and users, as well as site settings and options.',
            label: 'Administrator',
            value: 'administrator'
        }
    ];

    const allowedRoleOptions = roleOptions.filter((option) => {
        return assignableRoles.some((r) => {
            return r.name === option.label;
        });
    });

    return (
        <Modal
            afterClose={() => {
                updateRoute('staff');
            }}
            cancelLabel=''
            okLabel={okLabel}
            testId='user-settings-modal'
            title='User profile settings'
            width={540}
            onOk={handleSaveSettings}
        >
            <div className='flex flex-col gap-6 py-4'>
                <p>
                    Send an invitation for a new person to create a staff account on your site, and select a role that matches what you’d like them to be able to do.
                </p>
                <TextField
                    error={!!errors.email}
                    hint={errors.email}
                    inputRef={focusRef}
                    placeholder='jamie@example.com'
                    title='Email address'
                    value={email}
                    onChange={(event) => {
                        setEmail(event.target.value);
                    }}
                    onKeyDown={() => setErrors(e => ({...e, email: undefined}))}
                />
                <div>
                    <Radio
                        error={!!errors.role}
                        hint={errors.role}
                        id='role'
                        options={allowedRoleOptions}
                        selectedOption={role}
                        separator={true}
                        title="Role"
                        onSelect={(value) => {
                            setRole(value as RoleType);
                        }}
                    />
                </div>
            </div>
        </Modal>
    );
});

export default UserSettingsModal;
