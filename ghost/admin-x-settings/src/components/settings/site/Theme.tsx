import Button from '../../../admin-x-ds/global/Button';
import ChangeThemeModal from './designAndBranding/ChangeThemeModal';
import NiceModal from '@ebay/nice-modal-react';
import React from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';

const Theme: React.FC = () => {
    return (
        <SettingGroup
            customButtons={<Button color='green' label='Manage themes' link onClick={() => {
                NiceModal.show(ChangeThemeModal);
            }}/>}
            description="Change or upload themes"
            navid='theme'
            testId='theme'
            title="Theme"
        />
    );
};

export default Theme;
